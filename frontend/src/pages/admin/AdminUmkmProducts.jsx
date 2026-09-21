import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminUmkmProducts() {
  const { umkmId } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get(`/admin/umkms/${umkmId}/products`)
      .then(({ data }) => { setStore(data.umkm); setProducts(data.products); })
      .catch(err => toast.error(err.response?.data?.detail || "Gagal memuat produk"));
  }, [umkmId]);

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    (product.category || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/umkms" aria-label="Kembali ke daftar UMKM" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Produk UMKM</h1>
          <p className="text-sm text-slate-500">{store?.store_name || "Memuat..."}</p>
        </div>
        <div className="ml-auto relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari produk atau kategori..." className="pl-9" />
        </div>
      </div>

      <Card className="border-[#E5DEC9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Harga</th><th className="px-4 py-3">Stok</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#0C2340]">{product.name}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3 font-mono">{rp(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3"><Badge className={product.approval_status === "REJECTED" ? "bg-red-100 text-red-800" : product.approval_status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{product.approval_status === "REJECTED" ? "Ditolak" : product.approval_status === "PENDING" ? "Menunggu" : "Disetujui"}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-500">Belum ada produk yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}