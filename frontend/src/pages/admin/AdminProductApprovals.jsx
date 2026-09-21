import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminProductApprovals() {
  const [products, setProducts] = useState([]);
  const [note, setNote] = useState({});

  const load = async () => {
    try {
      const { data } = await api.get("/admin/products?status=PENDING");
      setProducts(data);
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal memuat pengajuan"); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (product, status) => {
    try {
      await api.patch(`/admin/products/${product.id}/decision`, { status, approval_note: note[product.id] || "" });
      toast.success(status === "APPROVED" ? "Produk disetujui" : "Produk ditolak");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal menyimpan keputusan"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Persetujuan Produk</h1>
        <p className="mt-1 text-sm text-slate-500">Periksa produk baru sebelum tampil di kasir UMKM.</p>
      </div>
      <div className="space-y-4">
        {products.map(product => (
          <Card key={product.id} className="border-[#E5DEC9] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold text-[#0C2340]">{product.name}</h2><Badge className="bg-amber-100 text-amber-800">Menunggu</Badge></div>
                <p className="mt-1 text-sm font-semibold text-[#A63A2B]">{product.store_name}</p>
                <p className="mt-2 text-sm text-slate-600">{product.description || "Tanpa deskripsi"}</p>
                <div className="mt-3 flex gap-5 text-sm text-slate-600"><span>Kategori: {product.category}</span><span>Harga: {rp(product.price)}</span><span>Stok: {product.stock}</span></div>
              </div>
              <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto">
                <Input value={note[product.id] || ""} onChange={e => setNote({ ...note, [product.id]: e.target.value })} placeholder="Catatan keputusan (opsional)" />
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => decide(product, "REJECTED")} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50"><X className="mr-1.5 h-4 w-4" />Tolak</Button>
                  <Button onClick={() => decide(product, "APPROVED")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1.5 h-4 w-4" />Setujui</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {products.length === 0 && <Card className="border-dashed border-[#E5DEC9] p-10 text-center text-slate-500">Tidak ada pengajuan produk yang menunggu.</Card>}
      </div>
    </div>
  );
}