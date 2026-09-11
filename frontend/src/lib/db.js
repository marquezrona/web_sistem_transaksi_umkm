// IndexedDB offline queue helpers
const DB_NAME = "kasir-sabu-raijua";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("offline_txns"))
        db.createObjectStore("offline_txns", { keyPath: "client_txn_id" });
      if (!db.objectStoreNames.contains("cache_products"))
        db.createObjectStore("cache_products", { keyPath: "id" });
      if (!db.objectStoreNames.contains("cache_customers"))
        db.createObjectStore("cache_customers", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode = "readonly") {
  const db = await openDb();
  return db.transaction(store, mode).objectStore(store);
}

export async function queueOfflineTxn(txn) {
  const s = await tx("offline_txns", "readwrite");
  return new Promise((r, e) => {
    const req = s.put(txn);
    req.onsuccess = () => r();
    req.onerror = () => e(req.error);
  });
}

export async function listOfflineTxns() {
  const s = await tx("offline_txns");
  return new Promise((r, e) => {
    const req = s.getAll();
    req.onsuccess = () => r(req.result);
    req.onerror = () => e(req.error);
  });
}

export async function removeOfflineTxn(id) {
  const s = await tx("offline_txns", "readwrite");
  return new Promise((r, e) => {
    const req = s.delete(id);
    req.onsuccess = () => r();
    req.onerror = () => e(req.error);
  });
}

export async function cacheProducts(products) {
  const db = await openDb();
  const t = db.transaction("cache_products", "readwrite");
  const s = t.objectStore("cache_products");
  s.clear();
  products.forEach(p => s.put(p));
  return new Promise(r => { t.oncomplete = () => r(); });
}

export async function getCachedProducts() {
  const s = await tx("cache_products");
  return new Promise((r) => {
    const req = s.getAll();
    req.onsuccess = () => r(req.result || []);
    req.onerror = () => r([]);
  });
}

export async function cacheCustomers(customers) {
  const db = await openDb();
  const t = db.transaction("cache_customers", "readwrite");
  const s = t.objectStore("cache_customers");
  s.clear();
  customers.forEach(c => s.put(c));
  return new Promise(r => { t.oncomplete = () => r(); });
}

export async function getCachedCustomers() {
  const s = await tx("cache_customers");
  return new Promise((r) => {
    const req = s.getAll();
    req.onsuccess = () => r(req.result || []);
    req.onerror = () => r([]);
  });
}
