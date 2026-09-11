import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then(r => setLogs(r.data)); }, []);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Audit Log</h1>
      <Card className="border-[#E5DEC9] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>User</TableHead>
              <TableHead>UMKM</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("id-ID")}</TableCell>
                <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{l.user_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-xs font-mono">{l.umkm_id?.slice(0, 8) || "-"}</TableCell>
                <TableCell className="text-xs text-slate-600">{JSON.stringify(l.meta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}