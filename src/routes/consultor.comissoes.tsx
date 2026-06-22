import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useCommissions, useCreateCommission, useUpdateCommissionStatus, COMMISSION_STATUS_LABEL, type CommissionStatus } from "@/hooks/use-consultor-commissions";
import { useLeads } from "@/hooks/use-leads";
import { ConsultorExportBar } from "@/components/consultor-export-bar";
import { Plus, X, Check, DollarSign } from "lucide-react";

export const Route = createFileRoute("/consultor/comissoes")({
  component: ComissoesPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const TONE: Record<CommissionStatus, string> = {
  pendente: "bg-amber-500/15 text-amber-500",
  aprovada: "bg-blue-500/15 text-blue-500",
  paga: "bg-emerald-500/15 text-emerald-500",
  cancelada: "bg-rose-500/15 text-rose-500",
};

function ComissoesPage() {
  const { data: commissions = [] } = useCommissions();
  const { data: leads = [] } = useLeads();
  const create = useCreateCommission();
  const update = useUpdateCommissionStatus();
  const [open, setOpen] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      descricao: f.get("descricao") as string,
      base: +(f.get("base") as string),
      percentual: +(f.get("percentual") as string),
      lead_id: (f.get("lead_id") as string) || null,
      pagar_em: (f.get("pagar_em") as string) || null,
    }, { onSuccess: () => setOpen(false) });
  }

  const totals = commissions.reduce((acc: any, c) => {
    acc[c.status] = (acc[c.status] || 0) + Number(c.valor);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <ConsultorExportBar
        title="Comissões do Consultor"
        rows={commissions}
        dateField="created_at"
        filenameBase="comissoes"
        columns={[
          { key: "descricao", label: "Descrição" },
          { key: "base", label: "Base (R$)", format: v => BRL(Number(v || 0)) },
          { key: "percentual", label: "%", format: v => `${v}%` },
          { key: "valor", label: "Valor (R$)", format: v => BRL(Number(v || 0)) },
          { key: "status", label: "Status", format: v => COMMISSION_STATUS_LABEL[v as CommissionStatus] ?? v },
          { key: "pagar_em", label: "Pagar em", format: v => v ? new Date(v).toLocaleDateString("pt-BR") : "" },
          { key: "paga_em", label: "Paga em", format: v => v ? new Date(v).toLocaleDateString("pt-BR") : "" },
          { key: "created_at", label: "Criada em", format: v => new Date(v).toLocaleDateString("pt-BR") },
        ]}
        kpisFor={rs => [
          { label: "Total", valor: String(rs.length) },
          { label: "Pagas", valor: BRL(rs.filter(r => r.status === "paga").reduce((s, r) => s + Number(r.valor || 0), 0)) },
          { label: "Pendentes", valor: BRL(rs.filter(r => r.status === "pendente").reduce((s, r) => s + Number(r.valor || 0), 0)) },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["pendente", "aprovada", "paga", "cancelada"] as CommissionStatus[]).map(s => (
          <div key={s} className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="text-xs text-muted-foreground">{COMMISSION_STATUS_LABEL[s]}</div>
            <div className="mt-2 text-xl font-semibold">{BRL(totals[s] || 0)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{commissions.length} comissão(ões)</p>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Nova comissão
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-right">Base</th>
              <th className="px-4 py-3 text-right">%</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">{c.descricao}</td>
                <td className="px-4 py-3 text-right">{BRL(c.base)}</td>
                <td className="px-4 py-3 text-right">{c.percentual}%</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-500">{BRL(c.valor)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${TONE[c.status]}`}>{COMMISSION_STATUS_LABEL[c.status]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status === "pendente" && (
                    <button onClick={() => update.mutate({ id: c.id, status: "aprovada" })}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-500">
                      <DollarSign className="h-3.5 w-3.5" /> Aprovar
                    </button>
                  )}
                  {c.status === "aprovada" && (
                    <button onClick={() => update.mutate({ id: c.id, status: "paga" })}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-500">
                      <Check className="h-3.5 w-3.5" /> Marcar paga
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!commissions.length && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma comissão.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Nova comissão</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Descrição</span>
                <input name="descricao" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Base (R$)</span>
                  <input name="base" type="number" step="0.01" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Percentual (%)</span>
                  <input name="percentual" type="number" step="0.01" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              </div>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Lead</span>
                <select name="lead_id" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">— —</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Pagar em</span>
                <input name="pagar_em" type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
