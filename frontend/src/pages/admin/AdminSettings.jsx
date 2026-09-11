import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function AdminSettings() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEmail(user?.email || ""); }, [user?.email]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/admin/account", {
        email,
        current_password: currentPassword,
      });
      const nextUser = { ...user, email: data.email };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setCurrentPassword("");
      toast.success("Email admin berhasil diubah");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengubah email admin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-[#A63A2B]">Akun</div>
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Pengaturan Admin</h1>
      </div>
      <Card className="border-[#E5DEC9] p-6">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Email Admin Baru</Label>
            <Input type="email" required value={email} onChange={event => setEmail(event.target.value)} />
          </div>
          <div>
            <Label>Password Saat Ini</Label>
            <Input type="password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="bg-[#0A3663]">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
