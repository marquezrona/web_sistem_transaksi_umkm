import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { CreditCard, Nfc, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const DEMO_CARDS = ["CARD-001", "CARD-002", "CARD-003", "CARD-004", "CARD-005"];

export default function NfcModal({ open, onOpenChange, total, onPay }) {
  const [stage, setStage] = useState("select"); // select | scanning | detected | processing
  const [card, setCard] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!open) { setStage("select"); setCard(null); setCustomer(null); }
  }, [open]);

  const tap = async (cardId) => {
    setCard(cardId);
    setStage("scanning");
    setTimeout(async () => {
      try {
        const { data } = await api.get(`/umkm/customers/by-card/${cardId}`);
        setCustomer(data);
        setStage("detected");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Kartu tidak dikenal");
        setStage("select");
      }
    }, 900);
  };

  const confirm = async () => {
    setStage("processing");
    try {
      await onPay({ paymentMethod: "NFC", nfcCardId: card, customerId: customer.id });
      onOpenChange(false);
    } catch {
      setStage("detected");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Nfc className="w-5 h-5 text-[#7E22CE]" /> Tap Kartu NFC
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</div>
          <div className="font-display text-4xl font-extrabold text-[#0A3663] mb-4">{rp(total)}</div>

          {stage === "select" && (
            <>
              <div className="text-sm text-slate-600 mb-4">Pilih kartu demo untuk simulasi tap:</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_CARDS.map(c => (
                  <Button
                    key={c}
                    data-testid={`demo-card-${c}`}
                    onClick={() => tap(c)}
                    variant="outline"
                    className="h-14 border-[#7E22CE]/30 hover:bg-[#7E22CE]/5 flex flex-col"
                  >
                    <CreditCard className="w-4 h-4 mb-0.5 text-[#7E22CE]" />
                    <span className="text-xs font-mono">{c}</span>
                  </Button>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-slate-500 italic">
                Ganti dengan NFC reader fisik di produksi.
              </div>
            </>
          )}

          {stage === "scanning" && (
            <div className="py-8 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-full bg-[#7E22CE]/10 flex items-center justify-center nfc-ripple">
                <Nfc className="w-10 h-10 text-[#7E22CE]" />
              </div>
              <div className="mt-6 font-semibold text-[#7E22CE]">Membaca kartu {card}...</div>
            </div>
          )}

          {stage === "detected" && customer && (
            <Card className="p-4 bg-[#7E22CE]/5 border-[#7E22CE]/30 text-left">
              <div className="text-xs font-bold uppercase text-[#7E22CE]">Kartu Terdeteksi</div>
              <div className="font-display font-bold text-lg mt-1">{customer.name}</div>
              <div className="font-mono text-sm text-slate-600">{customer.nfc_card_masked}</div>
              <div className="mt-3 flex justify-between">
                <div>
                  <div className="text-xs text-slate-500">Saldo sebelum</div>
                  <div className="font-semibold">{rp(customer.balance)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Saldo setelah</div>
                  <div className="font-semibold text-[#0A3663]">{rp(customer.balance - total)}</div>
                </div>
              </div>
              {customer.balance < total && (
                <div className="mt-3 text-xs text-red-700 bg-red-50 p-2 rounded">Saldo tidak cukup!</div>
              )}
              <Button
                data-testid="confirm-nfc-btn"
                onClick={confirm}
                disabled={customer.balance < total}
                className="w-full mt-4 bg-[#7E22CE] hover:bg-[#6B21A8]"
              >
                Konfirmasi Pembayaran
              </Button>
            </Card>
          )}

          {stage === "processing" && (
            <div className="py-8 flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-[#7E22CE] animate-spin" />
              <div className="mt-4 text-sm text-slate-600">Memproses...</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
