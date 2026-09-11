import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const [form, setForm] = useState({ store_name: "", address: "", phone: "", logo: null });

  useEffect(() => { api.get("/umkm/settings").then(r => setForm({
    store_name: r.data.store_name, address: r.data.address || "", phone: r.data.phone || "", logo: r.data.logo
  })); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/umkm/settings", form);
      toast.success("Pengaturan disimpan");
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Pengaturan Toko</h1>
      <Card className="p-6 border-[#E5DEC9]">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Nama Toko</Label><Input required value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} /></div>
          <div><Label>Alamat</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <Button type="submit" className="bg-[#0A3663]">Simpan</Button>
        </form>
      </Card>
    </div>
  );
}