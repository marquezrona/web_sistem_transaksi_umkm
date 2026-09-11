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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-btn" onClick={openNew} className="bg-[#0A3663] rounded-full">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Pelanggan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Pelanggan</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nama</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ID Kartu NFC</Label><Input placeholder="CARD-XXX" value={form.nfc_card_id} onChange={e => setForm({ ...form, nfc_card_id: e.target.value })} /></div>
              <div><Label>Saldo (Rp)</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
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
