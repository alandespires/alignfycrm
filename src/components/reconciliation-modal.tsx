import { Button } from "@/components/ui/button";
import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2, CheckCircle2, AlertTriangle, Ban } from "@/components/ui/icons";
import { useEntryPayments, useCreatePayment, useDeletePayment } from "@/hooks/use-payments";
import { brl, type EntryRow, type PaymentMethod } from "@/hooks/use-finance";
import { toast } from "sonner";
import { AlignPanel, AlignPanelSection } from "@/components/align-panel";

const PM_OPTIONS: PaymentMethod[] = ["pix", "boleto", "cartao_credito", "cartao_debito", "transferencia", "dinheiro", "outros"];

export function ReconciliationModal({ entry, onClose }: { entry: EntryRow | null; onClose: () => void }) {
  const open = !!entry;
  const { data: payments = [], isLoading } = useEntryPayments(entry?.id);
  const create = useCreatePayment();
  const del = useDeletePayment();

  const [valor, setValor] = useState<string>("");
  const [pagoEm, setPagoEm] = useState<string>(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState<PaymentMethod | "">("");
  const [obs, setObs] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const totalPago = useMemo(() => payments.reduce((s, p) => s + Number(p.valor), 0), [payments]);
  const saldo = entry ? Math.max(Number(entry.valor) - totalPago, 0) : 0;
  const quitado = entry ? totalPago >= Number(entry.valor) && Number(entry.valor) > 0 : false;
  const isCancelled = entry?.status === "cancelado";
  const today = new Date().toISOString().slice(0, 10);

  if (!open || !entry) return null;

  function validate(v: number, when: string): string | null {
    if (isCancelled) return "Entrada cancelada — não é possível registrar pagamentos. Reabra a cobrança primeiro.";
    if (!when) return "Informe a data do pagamento.";
    if (when > today) return "A data do pagamento não pode ser futura.";
    if (!Number.isFinite(v) || v <= 0) return "Informe um valor maior que zero.";
    if (v > 9_999_999) return "Valor acima do limite permitido.";
    if (saldo <= 0) return "Esta cobrança já está quitada.";
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!entry) return;
    const v = Number(valor);
    const err = validate(v, pagoEm);
    if (err) { setError(err); toast.error(err); return; }
    setError(null);
    if (v > saldo + 0.001) {
      if (!confirm(`O valor (${brl(v)}) é maior que o saldo pendente (${brl(saldo)}). Continuar?`)) return;
    }
    try {
      await create.mutateAsync({
        entry_id: entry.id, valor: v, pago_em: pagoEm,
        forma_pagamento: forma || null, observacoes: obs.trim() || null,
      });
      setValor(""); setObs(""); setForma("");
    } catch (ex: any) {
      setError(ex?.message ?? "Falha ao registrar pagamento");
    }
  }

  function quitarTotal() {
    if (isCancelled) { toast.error("Entrada cancelada"); return; }
    setValor(String(saldo.toFixed(2)));
  }

  const status = isCancelled
    ? { label: "Cancelada", tone: "danger" as const }
    : quitado
    ? { label: "Quitada", tone: "success" as const }
    : { label: "Pendente", tone: "warn" as const };

  return (
    <AlignPanel
      open={open}
      onClose={onClose}
      eyebrow="Financeiro"
      title="Reconciliação de pagamentos"
      subtitle={entry.descricao}
      status={status}
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Valor" value={brl(Number(entry.valor))} tone="muted" />
          <Stat label="Recebido" value={brl(totalPago)} tone="success" />
          <Stat label="Saldo" value={brl(saldo)} tone={saldo > 0 ? "warn" : "success"} />
        </div>

        {isCancelled && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Entrada cancelada</div>
              <div className="mt-0.5 text-destructive/80">Esta cobrança foi cancelada e está fora dos relatórios. Reabra a entrada antes de registrar pagamentos.</div>
            </div>
          </div>
        )}

        {!quitado && !isCancelled && (
          <AlignPanelSection title="Registrar pagamento">
            <form onSubmit={submit} noValidate className="space-y-3">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor recebido *</label>
                  <div className="flex gap-2">
                    <input
                      required type="number" step="0.01" min="0.01" max={String((saldo + 0.01).toFixed(2))}
                      value={valor} onChange={(e) => { setValor(e.target.value); if (error) setError(null); }}
                      placeholder={String(saldo.toFixed(2))}
                      className={`h-10 flex-1 rounded-lg border bg-surface-2 px-3 text-sm tabular-nums focus:outline-none ${error && /valor/i.test(error) ? "border-destructive/60" : "border-border focus:border-primary/60"}`}
                    />
                    <Button variant="unstyled" size="unstyled" type="button" onClick={quitarTotal} className="h-10 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-3 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
                      Quitar tudo
                    </Button>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Máximo recomendado: {brl(saldo)}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data *</label>
                  <input
                    required type="date" max={today} value={pagoEm}
                    onChange={(e) => { setPagoEm(e.target.value); if (error) setError(null); }}
                    className={`h-10 w-full rounded-lg border bg-surface-2 px-3 text-sm focus:outline-none ${error && /data/i.test(error) ? "border-destructive/60" : "border-border focus:border-primary/60"}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Forma</label>
                  <select value={forma} onChange={(e) => setForma(e.target.value as any)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none">
                    <option value="">—</option>
                    {PM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Observação</label>
                  <input maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional..." className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
                </div>
              </div>
              <Button variant="unstyled" size="unstyled" type="submit" disabled={create.isPending || !valor} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Registrar pagamento
              </Button>
            </form>
          </AlignPanelSection>
        )}

        <AlignPanelSection title={`Histórico · ${payments.length}`}>
          {isLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : payments.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="space-y-1.5">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-success/15 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-success">{brl(Number(p.valor))}</span>
                      {p.forma_pagamento && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{p.forma_pagamento}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.pago_em + "T12:00:00").toLocaleDateString("pt-BR")}
                      {p.observacoes && <> · {p.observacoes}</>}
                    </div>
                  </div>
                  <Button variant="unstyled" size="unstyled"
                    onClick={() => { if (confirm("Remover este pagamento?")) del.mutate({ id: p.id, entry_id: p.entry_id }); }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover pagamento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </AlignPanelSection>
      </div>
    </AlignPanel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "muted" }) {
  const color = tone === "success" ? "text-success" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
