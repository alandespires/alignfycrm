import { useState } from "react";
import { AlignPanel } from "@/components/align-panel";
import { Button } from "@/components/ui/button";

const REASONS = ["Preço", "Sem orçamento", "Escolheu concorrente", "Sem resposta", "Sem fit", "Timing"];

export function LostReasonPanel({ leadName, open, onClose, onConfirm }: {
  leadName?: string; open: boolean; onClose: () => void; onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const final = [motivo, detalhe.trim()].filter(Boolean).join(" — ");
  return (
    <AlignPanel open={open} onClose={() => { setMotivo(""); setDetalhe(""); onClose(); }} eyebrow="Marcar como perdido" title={leadName ?? "Lead"} subtitle="Por que este negócio foi perdido?">
      <div className="space-y-4 p-1">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Button key={r} variant="unstyled" size="unstyled" type="button" aria-pressed={motivo === r} onClick={() => setMotivo(r)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${motivo === r ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"}`}>
              {r}
            </Button>
          ))}
        </div>
        <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} placeholder="Detalhe (opcional)" rows={3}
          className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none" />
        <Button disabled={!final} className="w-full" onClick={() => { onConfirm(final); setMotivo(""); setDetalhe(""); }}>
          Confirmar perda
        </Button>
      </div>
    </AlignPanel>
  );
}
