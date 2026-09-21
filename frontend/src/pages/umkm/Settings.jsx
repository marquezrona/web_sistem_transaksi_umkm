import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Trash2 } from "lucide-react";
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
      window.dispatchEvent(new CustomEvent("store-logo-updated", { detail: form.logo }));
      toast.success("Pengaturan disimpan");
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const selectLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar yang valid");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(previous => ({ ...previous, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Pengaturan Toko</h1>
      <Card className="p-6 border-[#E5DEC9]">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Nama Toko</Label><Input required value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} /></div>
          <div><Label>Alamat</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Logo atau Foto Toko</Label>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-[#E5DEC9] bg-[#0A3663]">
                {form.logo ? <img src={form.logo} alt="Preview logo toko" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-[#E6A100]" />}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center rounded-md bg-[#0A3663] px-4 text-sm font-medium text-white hover:bg-[#0C2340]">
                  Pilih Gambar
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} className="sr-only" />
                </label>
                {form.logo && <Button type="button" variant="outline" onClick={() => setForm({ ...form, logo: null })}><Trash2 className="mr-1.5 h-4 w-4" />Hapus</Button>}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Format PNG, JPG, atau WebP. Maksimal 2 MB.</p>
          </div>
          <Button type="submit" className="bg-[#0A3663]">Simpan</Button>
        </form>
      </Card>
    </div>
  );
}