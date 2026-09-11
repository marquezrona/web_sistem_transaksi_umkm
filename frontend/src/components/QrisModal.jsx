import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

// Simple visual QR-like matrix (not a real QR code) — modular so a real
// QRIS provider can be swapped in without changing the rest of the flow.
function FakeQR({ seed }) {
  const size = 21;
  const cells = [];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) & 0x7fff; };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      const on = corner
        ? ((x === 0 || x === 6 || y === 0 || y === 6) ||
           (x >= 2 && x <= 4 && y >= 2 && y <= 4)) &&
          !(x === size - 7 && y === size - 7)
        : (rand() % 2 === 0);
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0C2340" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <rect width={size} height={size} fill="#fff" />
      {cells}
    </svg>
  );
}

export default function QrisModal({ open, onOpenChange, total, onPay }) {
  const [stage, setStage] = useState("waiting"); // waiting | processing
  const [expiry, setExpiry] = useState(120);
  const [txnId] = useState(() => "QRIS-" + Math.random().toString(36).slice(2, 10).toUpperCase());

  useEffect(() => {
    if (!open) { setStage("waiting"); setExpiry(120); return; }
    const t = setInterval(() => setExpiry(x => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const simulatePay = async () => {
    setStage("processing");
    try {
      await onPay({ paymentMethod: "QRIS" });
      onOpenChange(false);
    } catch {
      setStage("waiting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#1E40AF]" /> Pembayaran QRIS
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</div>
          <div className="font-display text-4xl font-extrabold text-[#0A3663] mb-1">{rp(total)}</div>
          <div className="text-xs text-slate-500 font-mono">{txnId}</div>

          <div className="relative w-56 h-56 mx-auto mt-4 border-4 border-[#1E40AF] rounded-2xl overflow-hidden bg-white">
            <FakeQR seed={txnId} />
            <div className="absolute inset-0 pointer-events-none qris-scan" />
          </div>

          <div className="mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Menunggu pembayaran · {String(Math.floor(expiry / 60)).padStart(2, "0")}:{String(expiry % 60).padStart(2, "0")}
            </div>
          </div>

          <Button
            data-testid="simulate-qris-pay"
            onClick={simulatePay}
            disabled={stage === "processing" || expiry === 0}
            className="w-full mt-5 bg-[#1E40AF] hover:bg-[#1E3A8A]"
          >
            {stage === "processing" ? "Memproses..." : "Simulasikan Pembayaran Berhasil"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full mt-2"
          >
            Kembali
          </Button>

          <div className="mt-3 text-[11px] text-slate-500 italic">
            Simulasi QRIS — integrasikan provider QRIS resmi untuk mode produksi.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}