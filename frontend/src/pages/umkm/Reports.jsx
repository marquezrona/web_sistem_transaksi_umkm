import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function Reports() {
  const [period, setPeriod] = useState("daily");
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/umkm/reports?period=${period}`).then(r => setData(r.data)); }, [period]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [["ID", "Waktu", "Metode", "Total"]];
    data.transactions.forEach(t => rows.push([t.id, t.created_at, t.payment_method, t.total]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `laporan-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Laporan Penjualan</h1>
        <div className="flex gap-2 items-center">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="daily">Harian</TabsTrigger>
              <TabsTrigger value="weekly">Mingguan</TabsTrigger>
              <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 border-[#E5DEC9]">
          <div className="text-[11px] font-bold uppercase text-slate-500">Total Penjualan</div>
          <div className="font-display text-3xl font-extrabold text-[#0A3663] mt-1">{rp(data.total)}</div>
          <div className="text-xs text-slate-500 mt-1">{data.count} transaksi</div>
        </Card>
        <Card className="p-5 border-[#E5DEC9]">
          <div className="text-[11px] font-bold uppercase text-slate-500">NFC</div>
          <div className="font-display text-3xl font-extrabold text-[#7E22CE] mt-1">{rp(data.by_method.NFC || 0)}</div>
        </Card>
        <Card className="p-5 border-[#E5DEC9]">
          <div className="text-[11px] font-bold uppercase text-slate-500">QRIS</div>
          <div className="font-display text-3xl font-extrabold text-[#1E40AF] mt-1">{rp(data.by_method.QRIS || 0)}</div>
        </Card>
      </div>

      <Card className="border-[#E5DEC9] overflow-hidden">
        <div className="p-4 font-display font-bold text-[#0C2340] border-b border-[#E5DEC9]">Penjualan per Produk</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.by_product.map(p => (
              <TableRow key={p.name}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell className="text-right">{p.qty}</TableCell>
                <TableCell className="text-right font-mono">{rp(p.total)}</TableCell>
              </TableRow>
            ))}
            {data.by_product.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">Tidak ada data.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
