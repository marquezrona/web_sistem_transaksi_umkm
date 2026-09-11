import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Power, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminUmkms() {
  const [umkms, setUmkms] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ store_name: "", email: "", password: "", address: "", phone: "" });

  const load = async () => {
    const { data } = await api.get("/admin/umkms");
    setUmkms(data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/umkms", form);
      toast.success("UMKM berhasil ditambahkan");
      setOpen(false);
      setForm({ store_name: "", email: "", password: "", address: "", phone: "" });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const toggle = async (id) => {
    try {
      await api.patch(`/admin/umkms/${id}/toggle`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal mengubah status UMKM"); }
  };

  const remove = async (umkm) => {
    if (!window.confirm(`Hapus UMKM ${umkm.store_name}? Data akun, produk, pelanggan, dan transaksi toko ini akan dihapus permanen.`)) return;
    try {
      await api.delete(`/admin/umkms/${umkm.id}`);
      toast.success("UMKM berhasil dihapus");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal menghapus UMKM"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Daftar UMKM</h1>
        <Button data-testid="add-umkm-btn" onClick={() => setOpen(true)} className="bg-[#0A3663] hover:bg-[#0C2340] rounded-full">
          <Plus className="w-4 h-4 mr-1.5" /> Tambah UMKM
        </Button>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Tambah UMKM Baru</h2>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Nama Toko</Label><Input required value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} /></div>
              <div><Label>Email Login</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Alamat</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Batal</Button>
                <Button type="submit" className="flex-1 bg-[#0A3663]">Simpan</Button>
              </div>
            </form>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {umkms.map(u => (
          <Card key={u.id} className="p-5 border-[#E5DEC9]">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0A3663] flex items-center justify-center">
                <Store className="w-6 h-6 text-[#E6A100]" />
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-[#0C2340]">{u.store_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{u.address}</div>
                <div className="text-xs text-slate-500">{u.phone}</div>
              </div>
              <Badge className={u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                {u.active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Saldo</div>
                <div className="font-display font-bold text-[#0A3663]">{rp(u.balance)}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggle(u.id)}>
                  <Power className="w-3.5 h-3.5 mr-1" />
                  {u.active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(u)} aria-label={`Hapus ${u.store_name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}