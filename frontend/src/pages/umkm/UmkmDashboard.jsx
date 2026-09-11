import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Wallet, Receipt, Nfc, QrCode, Package, TrendingUp, CloudUpload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function Stat({ label, value, icon: Ic, tint = "#0A3663" }) {
  return (
    <Card className="p-5 border-[#E5DEC9]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="font-display text-2xl font-extrabold text-[#0C2340] mt-1">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tint + "15" }}>
          <Ic className="w-5 h-5" style={{ color: tint }} />
        </div>
      </div>
    </Card>
  );
}

export default function UmkmDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/umkm/dashboard").then(r => setD(r.data)); }, []);
  if (!d) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-[#A63A2B]">Toko</div>
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">{d.store_name}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Penjualan Hari Ini" value={rp(d.txn_total_today)} icon={TrendingUp} tint="#16A34A" />
        <Stat label="Transaksi Hari Ini" value={d.txn_count_today} icon={Receipt} tint="#A63A2B" />
        <Stat label="Saldo Toko" value={rp(d.balance)} icon={Wallet} tint="#0A3663" />
        <Stat label="Menunggu Sinkron" value={d.pending_sync} icon={CloudUpload} tint="#DC2626" />
        <Stat label="Transaksi NFC" value={d.nfc_count} icon={Nfc} tint="#7E22CE" />
        <Stat label="Transaksi QRIS" value={d.qris_count} icon={QrCode} tint="#1E40AF" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 border-[#E5DEC9] lg:col-span-2">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">Penjualan 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.series}>
              <CartesianGrid stroke="#E5DEC9" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => rp(v)} />
              <Bar dataKey="total" fill="#0A3663" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-[#E5DEC9]">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">Produk Terlaris Hari Ini</h3>
          <div className="space-y-3">
            {d.top_products.length === 0 && <div className="text-sm text-slate-500">Belum ada penjualan.</div>}
            {d.top_products.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E6A100] text-[#0C2340] font-bold flex items-center justify-center text-sm">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{p.name}</div>
                </div>
                <Badge variant="outline">{p.qty}x</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}