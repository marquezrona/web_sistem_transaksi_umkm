import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Building2, Wallet, Receipt, Nfc, QrCode, WifiOff, CloudUpload, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [feed, setFeed] = useState([]);
  const { user } = useAuth();

  const load = async () => {
    const { data } = await api.get("/admin/dashboard");
    setD(data);
    setFeed(data.recent_transactions || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const wsUrl = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws") + `/api/ws?token=${token}`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "transaction") {
          setFeed(prev => [msg.data, ...prev].slice(0, 20));
          load();
        }
      };
    } catch {}
    return () => ws?.close();
  }, []);

  if (!d) return <div className="text-slate-500">Memuat...</div>;

  const pieData = [
    { name: "NFC", value: d.nfc_count, color: "#7E22CE" },
    { name: "QRIS", value: d.qris_count, color: "#1E40AF" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#A63A2B]">Kabupaten Sabu Raijua</div>
          <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Dashboard Pengelola</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total UMKM" value={d.total_umkms} icon={Building2} />
        <Stat label="UMKM Aktif" value={d.active_umkms} icon={Building2} tint="#16A34A" />
        <Stat label="Transaksi Hari Ini" value={d.txn_count_today} icon={Receipt} tint="#A63A2B" />
        <Stat label="Nilai Hari Ini" value={rp(d.txn_total_today)} icon={TrendingUp} tint="#E6A100" />
        <Stat label="Transaksi NFC" value={d.nfc_count} icon={Nfc} tint="#7E22CE" />
        <Stat label="Transaksi QRIS" value={d.qris_count} icon={QrCode} tint="#1E40AF" />
        <Stat label="Menunggu Sinkron" value={d.pending_sync} icon={CloudUpload} tint="#DC2626" />
        <Stat label="Total Saldo" value={rp(d.total_balance)} icon={Wallet} tint="#0A3663" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 border-[#E5DEC9] lg:col-span-2">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">Grafik Transaksi 7 Hari</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={d.series}>
              <CartesianGrid stroke="#E5DEC9" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => rp(v)} />
              <Line type="monotone" dataKey="total" stroke="#0A3663" strokeWidth={3} dot={{ fill: "#E6A100", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-[#E5DEC9]">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">Metode Pembayaran</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-[#E5DEC9]">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">Transaksi Terbaru (Real-time)</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto" data-testid="admin-live-feed">
            {feed.length === 0 && <div className="text-sm text-slate-500">Belum ada transaksi.</div>}
            {feed.map((t, i) => (
              <div key={t.id + i} className="flex items-center justify-between py-2 border-b border-[#E5DEC9] last:border-0">
                <div>
                  <div className="text-xs font-mono text-slate-500">{t.id}</div>
                  <div className="text-sm font-semibold">{t.store_name || t.umkm_id?.slice(0, 8)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold">{rp(t.total)}</div>
                  <Badge variant="outline" className="text-[10px]">{t.payment_method}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-[#E5DEC9]">
          <h3 className="font-display font-bold text-[#0C2340] mb-4">UMKM Terbaik Hari Ini</h3>
          <div className="space-y-3">
            {d.top_umkms.length === 0 && <div className="text-sm text-slate-500">Belum ada transaksi hari ini.</div>}
            {d.top_umkms.map((u, i) => (
              <div key={u.umkm_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E6A100] text-[#0C2340] font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{u.store_name}</div>
                </div>
                <div className="font-display font-bold text-[#0A3663]">{rp(u.total)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
