import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const empty = { name: "", phone: "", nfc_card_id: "", balance: 0 };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => { const { data } = await api.get("/umkm/customers"); setRows(data); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, phone: c.phone || "", nfc_card_id: c.nfc_card_id || "", balance: c.balance || 0 }); setEditing(c.id); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, balance: Number(form.balance) };
    try {
      if (editing) await api.put(`/umkm/customers/${editing}`, body);
      else await api.post("/umkm/customers", body);
      toast.success("Pelanggan disimpan");
      setOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal"); }
  };

  const del = async (id) => {
    if (!window.confirm("Hapus pelanggan ini?")) return;
    await api.delete(`/umkm/customers/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Pelanggan</h1>
        <>
          <Button data-testid="add-customer-btn" onClick={openNew} className="bg-[#0A3663] rounded-full">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah Pelanggan
          </Button>
          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit" : "Tambah"} Pelanggan</h2>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nama</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ID Kartu NFC</Label><Input placeholder="CARD-XXX" value={form.nfc_card_id} onChange={e => setForm({ ...form, nfc_card_id: e.target.value })} /></div>
              <div><Label>Saldo (Rp)</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Kembali</Button>
                <Button type="submit" className="flex-1 bg-[#0A3663]">Simpan</Button>
              </div>
            </form>
              </div>
            </div>
          )}
        </>
      </div>

      <Card className="border-[#E5DEC9] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Kartu</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className="font-mono text-xs">{c.nfc_card_masked || c.nfc_card_id || "-"}</TableCell>
                <TableCell className="text-right font-mono">{rp(c.balance)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
