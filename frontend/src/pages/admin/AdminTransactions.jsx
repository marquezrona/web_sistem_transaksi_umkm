import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  useEffect(() => { api.get("/admin/transactions").then(r => setTxns(r.data)); }, []);

  const groups = useMemo(() => {
    const grouped = new Map();
    txns.forEach(txn => {
      const key = txn.umkm_id || "unknown";
      if (!grouped.has(key)) grouped.set(key, { id: key, name: txn.store_name || `UMKM ${key.slice(0, 8)}`, txns: [] });
      grouped.get(key).txns.push(txn);
    });
    return Array.from(grouped.values());
  }, [txns]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Semua Transaksi</h1>
      {groups.length === 0 && (
        <Card className="border-[#E5DEC9] p-6 text-sm text-slate-500">Belum ada transaksi.</Card>
      )}
      {groups.map(group => (
        <Card key={group.id} className="border-[#E5DEC9] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E5DEC9] bg-[#F7F4EF] px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0C2340]">{group.name}</h2>
              <div className="text-xs text-slate-500">ID UMKM: {group.id === "unknown" ? "-" : group.id.slice(0, 8) + "..."}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">{group.txns.length} transaksi</div>
              <div className="font-display font-bold text-[#0A3663]">{rp(group.txns.reduce((sum, t) => sum + Number(t.total || 0), 0))}</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.txns.map(t => (
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
      ))}
    </div>
  );
}