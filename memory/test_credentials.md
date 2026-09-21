# Test Credentials - Kasir UMKM Sabu Raijua

## Super Admin
- Email: `admin@umkm.id`
- Password: `admin123`
- Role: `admin`
- Access: Super Admin Dashboard (semua UMKM, transaksi, settlement, audit log)

## UMKM Demo Accounts (Owner + Cashier consolidated)
Password sama untuk semua: `umkm123`

| Email | Nama Toko | Role |
|-------|-----------|------|
| sinar.raijua@umkm.id | Toko Sinar Raijua | umkm |
| tenun.seba@umkm.id | Tenun Ikat Seba | umkm |
| kopi.mesara@umkm.id | Kopi Lontar Mesara | umkm |
| snack.hawu@umkm.id | Snack Kelapa Hawu | umkm |
| ukiran.mbaata@umkm.id | Ukiran Woodcraft Mbaata | umkm |

## Demo NFC Cards (in seeded customers)
- CARD-001 → Budi Santoso — Saldo Rp 500.000
- CARD-002 → Siti Rahayu — Saldo Rp 350.000
- CARD-003 → Andi Wijaya — Saldo Rp 1.000.000
- CARD-004 → Maria Dewi — Saldo Rp 250.000
- CARD-005 → Rudi Hartono — Saldo Rp 750.000

## Auth Endpoints
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
