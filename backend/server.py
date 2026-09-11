from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import hmac
import hashlib
import logging
import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------------------------------------------------------
# Setup
# ------------------------------------------------------------
class MemoryCursor:
    def __init__(self, docs, projection=None):
        self.docs = list(docs)
        self.projection = projection or {}

    def sort(self, key, direction=-1):
        reverse = direction == -1
        self.docs = sorted(self.docs, key=lambda d: d.get(key, 0), reverse=reverse)
        return self

    async def to_list(self, limit=None):
        items = self.docs if limit is None else self.docs[:limit]
        return [self._project(doc) for doc in items]

    def _project(self, doc):
        if not self.projection or self.projection == {"_id": 0}:
            return {k: v for k, v in doc.items() if k != "_id"}
        res = {}
        for k, v in self.projection.items():
            if v == 0:
                continue
            if k == "_id":
                continue
            if k in doc:
                res[k] = doc[k]
        if not res and self.projection:
            return {k: v for k, v in doc.items() if k != "_id"}
        return res


class MemoryCollection:
    def __init__(self, name):
        self.name = name
        self.data = []

    def _matches(self, doc, query):
        if not query:
            return True
        for key, expected in query.items():
            value = doc.get(key)
            if isinstance(expected, dict):
                for op, op_value in expected.items():
                    if op == "$gte" and not (value >= op_value):
                        return False
                    if op == "$lt" and not (value < op_value):
                        return False
                    if op == "$gt" and not (value > op_value):
                        return False
                    if op == "$lte" and not (value <= op_value):
                        return False
                    if op == "$in" and value not in op_value:
                        return False
                    if op == "$ne" and value == op_value:
                        return False
                continue
            if key == "_id":
                if value != expected:
                    return False
                continue
            if value != expected:
                return False
        return True

    async def create_index(self, *args, **kwargs):
        return None

    async def find_one(self, query=None, projection=None):
        query = query or {}
        for doc in self.data:
            if self._matches(doc, query):
                return self._project(doc, projection)
        return None

    def _project(self, doc, projection=None):
        projection = projection or {}
        if not projection:
            return {k: v for k, v in doc.items() if k != "_id"}
        res = {}
        for k, v in projection.items():
            if v == 0:
                continue
            if k == "_id":
                continue
            if k in doc:
                res[k] = doc[k]
        if not res:
            return {k: v for k, v in doc.items() if k != "_id"}
        return res

    def find(self, query=None, projection=None):
        query = query or {}
        results = [doc for doc in self.data if self._matches(doc, query)]
        return MemoryCursor(results, projection)

    async def insert_one(self, doc):
        if "id" not in doc:
            import uuid
            doc = {**doc, "id": str(uuid.uuid4())}
        self.data.append(doc)
        return type("Result", (), {"inserted_id": doc.get("id")})()

    async def update_one(self, query, update):
        for doc in self.data:
            if self._matches(doc, query):
                for operator, values in update.items():
                    if operator == "$set":
                        doc.update(values)
                    elif operator == "$inc":
                        for k, v in values.items():
                            doc[k] = (doc.get(k, 0) or 0) + v
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, query):
        for idx, doc in enumerate(self.data):
            if self._matches(doc, query):
                del self.data[idx]
                return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()

    async def delete_many(self, query):
        original = len(self.data)
        self.data = [doc for doc in self.data if not self._matches(doc, query)]
        return type("Result", (), {"deleted_count": original - len(self.data)})()

    async def count_documents(self, query=None):
        query = query or {}
        return sum(1 for doc in self.data if self._matches(doc, query))


class MemoryDatabase:
    def __init__(self):
        self.users = MemoryCollection("users")
        self.umkms = MemoryCollection("umkms")
        self.products = MemoryCollection("products")
        self.transactions = MemoryCollection("transactions")
        self.customers = MemoryCollection("customers")
        self.audit_logs = MemoryCollection("audit_logs")
        self.settlement_config = MemoryCollection("settlement_config")


mongo_url = os.environ['MONGO_URL']
try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
    db = client[os.environ['DB_NAME']]
except Exception:
    client = None
    db = MemoryDatabase()

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
HMAC_SECRET = os.environ['HMAC_SECRET'].encode('utf-8')

app = FastAPI(title="Kasir UMKM Sabu Raijua API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("kasir")

security = HTTPBearer(auto_error=False)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str, umkm_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "umkm_id": umkm_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def sign_transaction(payload: str) -> str:
    return hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if user.get("role") == "umkm":
        umkm = await db.umkms.find_one({"id": user.get("umkm_id")})
        if not umkm or not umkm.get("active", True):
            raise HTTPException(401, "Akun UMKM sedang dinonaktifkan")
    return user


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return user


def require_umkm(user=Depends(get_current_user)):
    if user["role"] != "umkm":
        raise HTTPException(403, "UMKM only")
    return user


async def audit(user_id: str, action: str, meta: dict = None, umkm_id: str = None):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "umkm_id": umkm_id,
        "action": action,
        "meta": meta or {},
        "created_at": now_iso(),
    })


# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminAccountUpdateIn(BaseModel):
    email: EmailStr
    current_password: str


class ProductIn(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "Umum"
    price: float
    stock: int = 0
    image: Optional[str] = None


class CustomerIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    nfc_card_id: Optional[str] = None
    balance: float = 0


class CartItemIn(BaseModel):
    product_id: str
    name: str
    price: float
    qty: int


class TransactionIn(BaseModel):
    client_txn_id: str  # UUID from client for idempotency
    items: List[CartItemIn]
    subtotal: float
    discount: float = 0
    total: float
    payment_method: str  # NFC | QRIS
    customer_id: Optional[str] = None
    nfc_card_id: Optional[str] = None
    device_id: str
    signature: str
    nonce: str
    created_at_client: str
    offline: bool = False


class SettlementConfigIn(BaseModel):
    umkm_pct: float
    pemkab_pct: float
    admin_pct: float


class UmkmCreateIn(BaseModel):
    email: EmailStr
    password: str
    store_name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""


class StoreSettingsIn(BaseModel):
    store_name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    logo: Optional[str] = None


# ------------------------------------------------------------
# WebSocket manager
# ------------------------------------------------------------
class WSManager:
    def __init__(self):
        self.admin_conns: List[WebSocket] = []
        self.umkm_conns: Dict[str, List[WebSocket]] = {}

    async def connect_admin(self, ws: WebSocket):
        await ws.accept()
        self.admin_conns.append(ws)

    async def connect_umkm(self, ws: WebSocket, umkm_id: str):
        await ws.accept()
        self.umkm_conns.setdefault(umkm_id, []).append(ws)

    def disconnect(self, ws: WebSocket, umkm_id: Optional[str] = None):
        if ws in self.admin_conns:
            self.admin_conns.remove(ws)
        if umkm_id and umkm_id in self.umkm_conns and ws in self.umkm_conns[umkm_id]:
            self.umkm_conns[umkm_id].remove(ws)

    async def broadcast(self, umkm_id: str, event: dict):
        dead = []
        for ws in self.admin_conns:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.admin_conns.remove(ws)
        dead = []
        for ws in self.umkm_conns.get(umkm_id, []):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.umkm_conns[umkm_id].remove(ws)


ws_manager = WSManager()


# ------------------------------------------------------------
# Auth
# ------------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email atau password salah")
    if user.get("role") == "umkm":
        umkm = await db.umkms.find_one({"id": user.get("umkm_id")})
        if not umkm or not umkm.get("active", True):
            raise HTTPException(401, "Akun UMKM sedang dinonaktifkan")
    token = create_token(user["id"], user["role"], user.get("umkm_id"))
    await audit(user["id"], "login", {"email": email}, user.get("umkm_id"))
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "umkm_id": user.get("umkm_id"),
        },
    }


@api.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    await audit(user["id"], "logout", {}, user.get("umkm_id"))
    return {"ok": True}


@api.put("/admin/account")
async def update_admin_account(body: AdminAccountUpdateIn, user=Depends(require_admin)):
    admin = await db.users.find_one({"id": user["id"]})
    if not admin or not verify_password(body.current_password, admin["password_hash"]):
        raise HTTPException(401, "Password saat ini salah")
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing and existing.get("id") != user["id"]:
        raise HTTPException(400, "Email sudah digunakan akun lain")
    await db.users.update_one({"id": user["id"]}, {"$set": {"email": email}})
    await audit(user["id"], "admin_email_updated", {"email": email})
    return {"email": email}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ------------------------------------------------------------
# ADMIN endpoints
# ------------------------------------------------------------
@api.get("/admin/dashboard")
async def admin_dashboard(user=Depends(require_admin)):
    today = datetime.now(timezone.utc).date().isoformat()
    umkms = await db.umkms.find({}, {"_id": 0}).to_list(1000)
    active_umkms = [u for u in umkms if u.get("active", True)]
    txns_today = await db.transactions.find(
        {"created_at": {"$gte": today}}, {"_id": 0}
    ).to_list(10000)
    total_today = sum(t["total"] for t in txns_today)
    by_method = {"NFC": 0, "QRIS": 0}
    for t in txns_today:
        by_method[t["payment_method"]] = by_method.get(t["payment_method"], 0) + 1
    offline_count = await db.transactions.count_documents({"offline": True})
    pending_sync = await db.transactions.count_documents({"sync_status": "PENDING"})
    total_balance = sum(u.get("balance", 0) for u in umkms)

    # daily series last 7 days
    series = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        txs = await db.transactions.find({"created_at": {"$gte": d, "$lt": d + "T99"}}, {"_id": 0}).to_list(10000)
        series.append({"date": d, "total": sum(t["total"] for t in txs), "count": len(txs)})

    # top umkms
    agg = {}
    for t in txns_today:
        agg[t["umkm_id"]] = agg.get(t["umkm_id"], 0) + t["total"]
    top = sorted(agg.items(), key=lambda x: -x[1])[:5]
    top_list = []
    for uid, total in top:
        u = next((x for x in umkms if x["id"] == uid), None)
        if u:
            top_list.append({"umkm_id": uid, "store_name": u["store_name"], "total": total})

    recent = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)

    return {
        "total_umkms": len(umkms),
        "active_umkms": len(active_umkms),
        "total_stores": len(umkms),
        "txn_count_today": len(txns_today),
        "txn_total_today": total_today,
        "nfc_count": by_method.get("NFC", 0),
        "qris_count": by_method.get("QRIS", 0),
        "offline_count": offline_count,
        "pending_sync": pending_sync,
        "total_balance": total_balance,
        "settlement_due": total_balance,
        "series": series,
        "top_umkms": top_list,
        "recent_transactions": recent,
    }


@api.get("/admin/umkms")
async def list_umkms(user=Depends(require_admin)):
    return await db.umkms.find({}, {"_id": 0}).to_list(1000)


@api.post("/admin/umkms")
async def create_umkm(body: UmkmCreateIn, user=Depends(require_admin)):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email sudah terdaftar")
    umkm_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    await db.umkms.insert_one({
        "id": umkm_id,
        "store_name": body.store_name,
        "address": body.address,
        "phone": body.phone,
        "logo": None,
        "owner_user_id": user_id,
        "balance": 0,
        "active": True,
        "created_at": now_iso(),
    })
    await db.users.insert_one({
        "id": user_id,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.store_name,
        "role": "umkm",
        "umkm_id": umkm_id,
        "created_at": now_iso(),
    })
    await audit(user["id"], "umkm_created", {"umkm_id": umkm_id, "store_name": body.store_name})
    return {"ok": True, "umkm_id": umkm_id}


@api.patch("/admin/umkms/{umkm_id}/toggle")
async def toggle_umkm(umkm_id: str, user=Depends(require_admin)):
    u = await db.umkms.find_one({"id": umkm_id})
    if not u:
        raise HTTPException(404, "UMKM tidak ditemukan")
    new_state = not u.get("active", True)
    await db.umkms.update_one({"id": umkm_id}, {"$set": {"active": new_state}})
    await audit(user["id"], "umkm_toggle", {"umkm_id": umkm_id, "active": new_state})
    return {"ok": True, "active": new_state}


@api.delete("/admin/umkms/{umkm_id}")
async def delete_umkm(umkm_id: str, user=Depends(require_admin)):
    umkm = await db.umkms.find_one({"id": umkm_id})
    if not umkm:
        raise HTTPException(404, "UMKM tidak ditemukan")
    await db.users.delete_one({"id": umkm.get("owner_user_id")})
    await db.umkms.delete_one({"id": umkm_id})
    await db.products.delete_many({"umkm_id": umkm_id})
    await db.customers.delete_many({"umkm_id": umkm_id})
    await db.transactions.delete_many({"umkm_id": umkm_id})
    await audit(user["id"], "umkm_deleted", {"umkm_id": umkm_id, "store_name": umkm.get("store_name")})
    return {"ok": True}


@api.get("/admin/transactions")
async def admin_transactions(limit: int = 200, user=Depends(require_admin)):
    txns = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return txns


@api.get("/admin/settlement")
async def get_settlement(user=Depends(require_admin)):
    cfg = await db.settlement_config.find_one({"id": "default"}, {"_id": 0})
    if not cfg:
        cfg = {"id": "default", "umkm_pct": 90, "pemkab_pct": 8, "admin_pct": 2}
        await db.settlement_config.insert_one(cfg)
    total_in = 0.0
    async for t in db.transactions.find({"status": "PAID"}, {"_id": 0, "total": 1}):
        total_in += t["total"]
    return {
        "config": {"umkm_pct": cfg["umkm_pct"], "pemkab_pct": cfg["pemkab_pct"], "admin_pct": cfg["admin_pct"]},
        "total_in": total_in,
        "umkm_share": total_in * cfg["umkm_pct"] / 100,
        "pemkab_share": total_in * cfg["pemkab_pct"] / 100,
        "admin_share": total_in * cfg["admin_pct"] / 100,
    }


@api.put("/admin/settlement")
async def update_settlement(body: SettlementConfigIn, user=Depends(require_admin)):
    if abs(body.umkm_pct + body.pemkab_pct + body.admin_pct - 100) > 0.01:
        raise HTTPException(400, "Total persentase harus 100")
    await db.settlement_config.update_one(
        {"id": "default"},
        {"$set": {"umkm_pct": body.umkm_pct, "pemkab_pct": body.pemkab_pct, "admin_pct": body.admin_pct}},
        upsert=True,
    )
    await audit(user["id"], "settlement_update", body.dict())
    return {"ok": True}


@api.get("/admin/audit-logs")
async def audit_logs(user=Depends(require_admin)):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return logs


# ------------------------------------------------------------
# UMKM endpoints (multi-tenant isolated)
# ------------------------------------------------------------
@api.get("/umkm/dashboard")
async def umkm_dashboard(user=Depends(require_umkm)):
    umkm_id = user["umkm_id"]
    umkm = await db.umkms.find_one({"id": umkm_id}, {"_id": 0})
    today = datetime.now(timezone.utc).date().isoformat()
    txns_today = await db.transactions.find(
        {"umkm_id": umkm_id, "created_at": {"$gte": today}}, {"_id": 0}
    ).to_list(10000)
    total_today = sum(t["total"] for t in txns_today)
    by_method = {"NFC": 0, "QRIS": 0}
    for t in txns_today:
        by_method[t["payment_method"]] = by_method.get(t["payment_method"], 0) + 1

    # product sales
    prod_sales = {}
    for t in txns_today:
        for it in t.get("items", []):
            prod_sales[it["name"]] = prod_sales.get(it["name"], 0) + it["qty"]
    top_products = sorted(prod_sales.items(), key=lambda x: -x[1])[:5]

    # 7 day series
    series = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        txs = await db.transactions.find(
            {"umkm_id": umkm_id, "created_at": {"$gte": d, "$lt": d + "T99"}}, {"_id": 0}
        ).to_list(10000)
        series.append({"date": d, "total": sum(t["total"] for t in txs)})

    offline_count = await db.transactions.count_documents({"umkm_id": umkm_id, "offline": True})
    pending_sync = await db.transactions.count_documents({"umkm_id": umkm_id, "sync_status": "PENDING"})

    return {
        "store_name": umkm["store_name"] if umkm else "",
        "balance": umkm.get("balance", 0) if umkm else 0,
        "txn_count_today": len(txns_today),
        "txn_total_today": total_today,
        "nfc_count": by_method.get("NFC", 0),
        "qris_count": by_method.get("QRIS", 0),
        "offline_count": offline_count,
        "pending_sync": pending_sync,
        "top_products": [{"name": n, "qty": q} for n, q in top_products],
        "series": series,
    }


@api.get("/umkm/products")
async def list_products(user=Depends(require_umkm)):
    return await db.products.find({"umkm_id": user["umkm_id"]}, {"_id": 0}).to_list(1000)


@api.post("/umkm/products")
async def create_product(body: ProductIn, user=Depends(require_umkm)):
    p = {"id": str(uuid.uuid4()), "umkm_id": user["umkm_id"], **body.dict(), "created_at": now_iso()}
    await db.products.insert_one(p)
    await audit(user["id"], "product_create", {"product_id": p["id"], "name": p["name"]}, user["umkm_id"])
    return p


@api.put("/umkm/products/{pid}")
async def update_product(pid: str, body: ProductIn, user=Depends(require_umkm)):
    r = await db.products.update_one(
        {"id": pid, "umkm_id": user["umkm_id"]}, {"$set": body.dict()}
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Produk tidak ditemukan")
    await audit(user["id"], "product_update", {"product_id": pid}, user["umkm_id"])
    return {"ok": True}


@api.delete("/umkm/products/{pid}")
async def delete_product(pid: str, user=Depends(require_umkm)):
    r = await db.products.delete_one({"id": pid, "umkm_id": user["umkm_id"]})
    if r.deleted_count == 0:
        raise HTTPException(404, "Produk tidak ditemukan")
    await audit(user["id"], "product_delete", {"product_id": pid}, user["umkm_id"])
    return {"ok": True}


@api.get("/umkm/customers")
async def list_customers(user=Depends(require_umkm)):
    cs = await db.customers.find({"umkm_id": user["umkm_id"]}, {"_id": 0}).to_list(1000)
    # add masked card
    for c in cs:
        if c.get("nfc_card_id"):
            cid = c["nfc_card_id"]
            c["nfc_card_masked"] = "****" + cid[-4:]
    return cs


@api.post("/umkm/customers")
async def create_customer(body: CustomerIn, user=Depends(require_umkm)):
    c = {"id": str(uuid.uuid4()), "umkm_id": user["umkm_id"], **body.dict(), "created_at": now_iso()}
    await db.customers.insert_one(c)
    await audit(user["id"], "customer_create", {"customer_id": c["id"]}, user["umkm_id"])
    return c


@api.put("/umkm/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, user=Depends(require_umkm)):
    r = await db.customers.update_one({"id": cid, "umkm_id": user["umkm_id"]}, {"$set": body.dict()})
    if r.matched_count == 0:
        raise HTTPException(404, "Pelanggan tidak ditemukan")
    return {"ok": True}


@api.delete("/umkm/customers/{cid}")
async def delete_customer(cid: str, user=Depends(require_umkm)):
    await db.customers.delete_one({"id": cid, "umkm_id": user["umkm_id"]})
    return {"ok": True}


@api.get("/umkm/customers/by-card/{card_id}")
async def customer_by_card(card_id: str, user=Depends(require_umkm)):
    c = await db.customers.find_one({"umkm_id": user["umkm_id"], "nfc_card_id": card_id}, {"_id": 0})
    if not c:
        # global fallback for demo cards
        c = await db.customers.find_one({"nfc_card_id": card_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Kartu tidak dikenal")
    c["nfc_card_masked"] = "****" + card_id[-4:]
    return c


@api.get("/umkm/transactions")
async def list_transactions(limit: int = 200, user=Depends(require_umkm)):
    return await db.transactions.find({"umkm_id": user["umkm_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)


@api.post("/umkm/transactions")
async def create_transaction(body: TransactionIn, user=Depends(require_umkm)):
    umkm_id = user["umkm_id"]

    # Idempotency check
    existing = await db.transactions.find_one({"client_txn_id": body.client_txn_id, "umkm_id": umkm_id}, {"_id": 0})
    if existing:
        return {"ok": True, "transaction": existing, "duplicate": True}

    # Signature verification
    expected = sign_transaction(f"{body.client_txn_id}|{body.total}|{body.device_id}|{body.nonce}")
    if not hmac.compare_digest(expected, body.signature):
        raise HTTPException(400, "Signature tidak valid")

    # Anti-replay: same card, same amount, within 20 seconds
    if body.nfc_card_id:
        recent_dup = await db.transactions.find_one({
            "umkm_id": umkm_id,
            "nfc_card_id": body.nfc_card_id,
            "total": body.total,
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=20)).isoformat()},
        })
        if recent_dup:
            raise HTTPException(409, "Potential Duplicate Transaction terdeteksi")

    # NFC balance deduct
    if body.payment_method == "NFC" and body.nfc_card_id:
        customer = await db.customers.find_one({"nfc_card_id": body.nfc_card_id})
        if not customer:
            raise HTTPException(400, "Kartu NFC tidak dikenal")
        if customer.get("balance", 0) < body.total:
            raise HTTPException(400, "Saldo kartu tidak cukup")
        await db.customers.update_one(
            {"id": customer["id"]}, {"$inc": {"balance": -body.total}}
        )

    txn_id = f"TRX-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    doc = {
        "id": txn_id,
        "client_txn_id": body.client_txn_id,
        "umkm_id": umkm_id,
        "cashier_id": user["id"],
        "items": [i.dict() for i in body.items],
        "subtotal": body.subtotal,
        "discount": body.discount,
        "total": body.total,
        "payment_method": body.payment_method,
        "customer_id": body.customer_id,
        "nfc_card_id": body.nfc_card_id,
        "device_id": body.device_id,
        "signature": body.signature,
        "nonce": body.nonce,
        "status": "PAID",
        "offline": body.offline,
        "sync_status": "SYNCED",
        "created_at": body.created_at_client or now_iso(),
        "synced_at": now_iso(),
    }
    await db.transactions.insert_one(doc)

    # Update stock
    for it in body.items:
        await db.products.update_one(
            {"id": it.product_id, "umkm_id": umkm_id}, {"$inc": {"stock": -it.qty}}
        )

    # Update UMKM balance
    await db.umkms.update_one({"id": umkm_id}, {"$inc": {"balance": body.total}})

    await audit(user["id"], "transaction_created",
                {"txn_id": txn_id, "total": body.total, "method": body.payment_method, "offline": body.offline},
                umkm_id)

    # Broadcast via WS
    doc_out = {k: v for k, v in doc.items() if k != "_id"}
    umkm = await db.umkms.find_one({"id": umkm_id}, {"_id": 0})
    doc_out["store_name"] = umkm["store_name"] if umkm else ""
    await ws_manager.broadcast(umkm_id, {"type": "transaction", "data": doc_out})

    return {"ok": True, "transaction": doc_out}


@api.get("/umkm/reports")
async def umkm_reports(period: str = "daily", user=Depends(require_umkm)):
    umkm_id = user["umkm_id"]
    now = datetime.now(timezone.utc)
    if period == "daily":
        start = now.date().isoformat()
    elif period == "weekly":
        start = (now - timedelta(days=7)).date().isoformat()
    else:
        start = (now - timedelta(days=30)).date().isoformat()
    txns = await db.transactions.find(
        {"umkm_id": umkm_id, "created_at": {"$gte": start}}, {"_id": 0}
    ).to_list(10000)
    by_product = {}
    by_method = {"NFC": 0, "QRIS": 0}
    for t in txns:
        by_method[t["payment_method"]] = by_method.get(t["payment_method"], 0) + t["total"]
        for it in t.get("items", []):
            key = it["name"]
            by_product.setdefault(key, {"qty": 0, "total": 0})
            by_product[key]["qty"] += it["qty"]
            by_product[key]["total"] += it["price"] * it["qty"]
    return {
        "period": period,
        "count": len(txns),
        "total": sum(t["total"] for t in txns),
        "by_method": by_method,
        "by_product": [{"name": k, **v} for k, v in by_product.items()],
        "transactions": txns,
    }


@api.get("/umkm/settings")
async def get_settings(user=Depends(require_umkm)):
    u = await db.umkms.find_one({"id": user["umkm_id"]}, {"_id": 0})
    return u


@api.put("/umkm/settings")
async def update_settings(body: StoreSettingsIn, user=Depends(require_umkm)):
    await db.umkms.update_one({"id": user["umkm_id"]}, {"$set": body.dict()})
    await audit(user["id"], "settings_update", body.dict(), user["umkm_id"])
    return {"ok": True}


# ------------------------------------------------------------
# WebSocket
# ------------------------------------------------------------
@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket, token: str = ""):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        await ws.close(code=1008)
        return
    role = payload.get("role")
    umkm_id = payload.get("umkm_id")
    if role == "admin":
        await ws_manager.connect_admin(ws)
    else:
        await ws_manager.connect_umkm(ws, umkm_id)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, umkm_id)


@api.get("/health")
async def health():
    return {"ok": True, "time": now_iso()}


# ------------------------------------------------------------
# Seed
# ------------------------------------------------------------
DEMO_UMKMS = [
    {"email": "sinar.raijua@umkm.id", "store_name": "Toko Sinar Raijua", "address": "Jl. Kelapa Raya No.12, Seba", "phone": "0812-1111-0001"},
    {"email": "tenun.seba@umkm.id", "store_name": "Tenun Ikat Seba", "address": "Jl. Tenun Ikat No.3, Seba", "phone": "0812-1111-0002"},
    {"email": "kopi.mesara@umkm.id", "store_name": "Kopi Lontar Mesara", "address": "Jl. Lontar No.7, Mesara", "phone": "0812-1111-0003"},
    {"email": "snack.hawu@umkm.id", "store_name": "Snack Kelapa Hawu", "address": "Jl. Pantai Hawu No.5", "phone": "0812-1111-0004"},
    {"email": "ukiran.mbaata@umkm.id", "store_name": "Ukiran Woodcraft Mbaata", "address": "Jl. Ukir No.9, Mbaata", "phone": "0812-1111-0005"},
]

DEMO_PRODUCTS = {
    "Toko Sinar Raijua": [
        {"name": "Kopi Sabu Robusta", "price": 15000, "category": "Minuman", "stock": 50},
        {"name": "Roti Kelapa", "price": 10000, "category": "Makanan", "stock": 30},
        {"name": "Air Mineral 600ml", "price": 5000, "category": "Minuman", "stock": 100},
        {"name": "Nasi Bungkus", "price": 20000, "category": "Makanan", "stock": 25},
    ],
    "Tenun Ikat Seba": [
        {"name": "Kain Tenun Motif Habba", "price": 350000, "category": "Kain", "stock": 15},
        {"name": "Selendang Ikat", "price": 150000, "category": "Kain", "stock": 20},
        {"name": "Sarung Tenun", "price": 250000, "category": "Kain", "stock": 12},
    ],
    "Kopi Lontar Mesara": [
        {"name": "Gula Semut Lontar 250g", "price": 35000, "category": "Gula", "stock": 40},
        {"name": "Sirup Lontar 500ml", "price": 45000, "category": "Sirup", "stock": 25},
        {"name": "Kopi Lontar Blend", "price": 55000, "category": "Kopi", "stock": 30},
    ],
    "Snack Kelapa Hawu": [
        {"name": "Keripik Kelapa", "price": 15000, "category": "Snack", "stock": 60},
        {"name": "Manisan Kelapa", "price": 20000, "category": "Snack", "stock": 40},
        {"name": "Kelapa Muda", "price": 10000, "category": "Segar", "stock": 30},
    ],
    "Ukiran Woodcraft Mbaata": [
        {"name": "Patung Kayu Kecil", "price": 75000, "category": "Kerajinan", "stock": 20},
        {"name": "Gantungan Kunci Ukir", "price": 25000, "category": "Kerajinan", "stock": 50},
        {"name": "Bingkai Foto Ukir", "price": 120000, "category": "Kerajinan", "stock": 15},
    ],
}

DEMO_CUSTOMERS = [
    {"name": "Budi Santoso", "phone": "0813-2222-0001", "nfc_card_id": "CARD-001", "balance": 500000},
    {"name": "Siti Rahayu", "phone": "0813-2222-0002", "nfc_card_id": "CARD-002", "balance": 350000},
    {"name": "Andi Wijaya", "phone": "0813-2222-0003", "nfc_card_id": "CARD-003", "balance": 1000000},
    {"name": "Maria Dewi", "phone": "0813-2222-0004", "nfc_card_id": "CARD-004", "balance": 250000},
    {"name": "Rudi Hartono", "phone": "0813-2222-0005", "nfc_card_id": "CARD-005", "balance": 750000},
]


@app.on_event("startup")
async def startup():
    global client, db
    try:
        if client is not None:
            await client.admin.command("ping")
        else:
            raise RuntimeError("Mongo not configured")
    except Exception:
        log.warning("MongoDB unavailable, using in-memory fallback store for demo mode.")
        client = None
        db = MemoryDatabase()

    # indexes
    await db.users.create_index("email", unique=True)
    await db.umkms.create_index("id")
    await db.products.create_index([("umkm_id", 1)])
    await db.transactions.create_index([("umkm_id", 1), ("created_at", -1)])
    await db.transactions.create_index([("client_txn_id", 1), ("umkm_id", 1)], unique=True)
    await db.customers.create_index([("nfc_card_id", 1)])

    # seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pass = os.environ["ADMIN_PASSWORD"]
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pass),
            "name": "Super Admin",
            "role": "admin",
            "umkm_id": None,
            "created_at": now_iso(),
        })
        log.info(f"Seeded admin: {admin_email}")
    else:
        # keep in sync
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pass), "role": "admin"}})

    # seed UMKMs
    for demo in DEMO_UMKMS:
        u = await db.users.find_one({"email": demo["email"]})
        if u:
            continue
        umkm_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        await db.umkms.insert_one({
            "id": umkm_id,
            "store_name": demo["store_name"],
            "address": demo["address"],
            "phone": demo["phone"],
            "logo": None,
            "owner_user_id": user_id,
            "balance": 0,
            "active": True,
            "created_at": now_iso(),
        })
        await db.users.insert_one({
            "id": user_id,
            "email": demo["email"],
            "password_hash": hash_password("umkm123"),
            "name": demo["store_name"],
            "role": "umkm",
            "umkm_id": umkm_id,
            "created_at": now_iso(),
        })
        # products
        for p in DEMO_PRODUCTS.get(demo["store_name"], []):
            await db.products.insert_one({
                "id": str(uuid.uuid4()),
                "umkm_id": umkm_id,
                "name": p["name"],
                "description": "",
                "category": p["category"],
                "price": p["price"],
                "stock": p["stock"],
                "image": None,
                "created_at": now_iso(),
            })
        # customers (per UMKM copies of demo cards for isolation, but also global lookup)
        for c in DEMO_CUSTOMERS:
            await db.customers.insert_one({
                "id": str(uuid.uuid4()),
                "umkm_id": umkm_id,
                "name": c["name"],
                "phone": c["phone"],
                "nfc_card_id": c["nfc_card_id"],
                "balance": c["balance"],
                "created_at": now_iso(),
            })
        log.info(f"Seeded UMKM: {demo['store_name']}")

    # settlement config default
    cfg = await db.settlement_config.find_one({"id": "default"})
    if not cfg:
        await db.settlement_config.insert_one({"id": "default", "umkm_pct": 90, "pemkab_pct": 8, "admin_pct": 2})


@app.on_event("shutdown")
async def shutdown():
    if client is not None:
        client.close()


app.include_router(api)
