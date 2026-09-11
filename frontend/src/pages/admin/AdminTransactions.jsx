import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  useEffect(() => { api.get("/admin/transactions").then(r => setTxns(r.data)); }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Semua Transaksi</h1>
      <Card className="border-[#E5DEC9] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Transaksi</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>UMKM</TableHead>
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
                <TableCell className="text-xs">{t.umkm_id?.slice(0, 8)}...</TableCell>
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