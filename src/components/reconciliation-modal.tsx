import { useMemo, useState, type FormEvent } from "react";
import { X, Loader2, Plus, Trash2, CheckCircle2, Wallet, AlertTriangle, Ban } from "lucide-react";
import { useEntryPayments, useCreatePayment, useDeletePayment } from "@/hooks/use-payments";
import { brl, type EntryRow, type PaymentMethod } from "@/hooks/use-finance";
import { toast } from "sonner";

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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Reconciliação de pagamentos</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{entry.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-px bg-border">
          <Stat label="Valor da cobrança" value={brl(Number(entry.valor))} tone="muted" />
          <Stat label="Total recebido" value={brl(totalPago)} tone="success" />
          <Stat label="Saldo pendente" value={brl(saldo)} tone={saldo > 0 ? "warn" : "success"} />
        </div>

        {/* Status */}
        {quitado && (
          <div className="flex items-center gap-2 border-b border-border bg-success/10 px-5 py-2.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Cobrança quitada
          </div>
        )}

        {/* Form */}
        {!quitado && (
          <form onSubmit={submit} className="border-b border-border p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Valor recebido *</label>
                <div className="flex gap-2">
                  <input
                    required type="number" step="0.01" min="0.01"
                    value={valor} onChange={(e) => setValor(e.target.value)}
                    placeholder={String(saldo.toFixed(2))}
                    className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm tabular-nums focus:border-primary/60 focus:outline-none"
                  />
                  <button type="button" onClick={quitarTotal} className="h-9 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-3 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
                    Quitar tudo
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data do pagamento *</label>
                <input required type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Forma de pagamento</label>
                <select value={forma} onChange={(e) => setForma(e.target.value as any)} className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none">
                  <option value="">—</option>
                  {PM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Observação</label>
                <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional..." className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
              </div>
            </div>
            <button type="submit" disabled={create.isPending || !valor} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Registrar pagamento
            </button>
          </form>
        )}

        {/* Histórico */}
        <div className="max-h-[40vh] overflow-y-auto p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Histórico de pagamentos <span className="ml-1 text-foreground">{payments.length}</span>
          </h3>
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
                  <button
                    onClick={() => { if (confirm("Remover este pagamento?")) del.mutate({ id: p.id, entry_id: p.entry_id }); }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover pagamento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "muted" }) {
  const color = tone === "success" ? "text-success" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="bg-surface-1 px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
