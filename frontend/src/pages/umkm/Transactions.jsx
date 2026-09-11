import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { listOfflineTxns } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOffline } from "@/context/OfflineContext";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [offline, setOffline] = useState([]);
  const { pending } = useOffline();

  const load = async () => {
    try { const { data } = await api.get("/umkm/transactions"); setTxns(data); } catch {}
    setOffline(await listOfflineTxns());
  };
  useEffect(() => { load(); }, [pending]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const url = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws") + `/api/ws?token=${token}`;
    let ws;
    try {
      ws = new WebSocket(url);
      ws.onmessage = () => load();
    } catch {}
    return () => ws?.close();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Riwayat Transaksi</h1>

      {offline.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <h3 className="font-display font-bold text-amber-900 mb-2">Menunggu Sinkronisasi ({offline.length})</h3>
          <div className="space-y-1">
            {offline.map(t => (
              <div key={t.client_txn_id} className="flex justify-between text-sm">
                <span className="font-mono text-xs">{t.client_txn_id.slice(0, 12)}</span>
                <span>{t.payment_method}</span>
                <span className="font-semibold">{rp(t.total)}</span>
                <Badge className="bg-amber-200 text-amber-900">PENDING SYNC</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-[#E5DEC9] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txns.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.id}</TableCell>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("id-ID")}</TableCell>
                <TableCell><Badge variant="outline">{t.payment_method}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{rp(t.total)}</TableCell>
                <TableCell><Badge className="bg-emerald-100 text-emerald-800">{t.status}</Badge></TableCell>
                <TableCell>
                  <Badge className={t.offline ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>
                    {t.offline ? "OFFLINE→SYNCED" : "ONLINE"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}