import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const empty = { name: "", description: "", category: "Umum", price: 0, stock: 0, image: null };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/umkm/products");
    setProducts(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (p) => { setForm({ name: p.name, description: p.description || "", category: p.category, price: p.price, stock: p.stock, image: p.image }); setEditing(p.id); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      if (editing) await api.put(`/umkm/products/${editing}`, body);
      else await api.post("/umkm/products", body);
      toast.success("Produk disimpan");
      setOpen(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const del = async (id) => {
    if (!window.confirm("Hapus produk ini?")) return;
    await api.delete(`/umkm/products/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Produk</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-product-btn" onClick={openNew} className="bg-[#0A3663] rounded-full">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nama</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Kategori</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Harga (Rp)</Label><Input type="number" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Stok</Label><Input type="number" required value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full bg-[#0A3663]">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[#E5DEC9] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell className="text-right font-mono">{rp(p.price)}</TableCell>
                <TableCell className="text-right">{p.stock}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
