import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuotas, useCreateQuota, useRegisterContemplation, QUOTA_STATUS_LABEL, type QuotaStatus, type ContemplationType } from "@/hooks/use-consortium-quotas";
import { useLeads } from "@/hooks/use-leads";
import { SEGMENT_LABEL, type ConsortiumSegment } from "@/hooks/use-consortium";
import { Plus, Award, X } from "lucide-react";

export const Route = createFileRoute("/consultor/cotas")({
  component: CotasPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_TONE: Record<QuotaStatus, string> = {
  ativa: "bg-emerald-500/15 text-emerald-500",
  contemplada: "bg-primary/15 text-primary",
  quitada: "bg-blue-500/15 text-blue-500",
  cancelada: "bg-rose-500/15 text-rose-500",
  transferida: "bg-violet-500/15 text-violet-500",
  atrasada: "bg-amber-500/15 text-amber-500",
};

function CotasPage() {
  const { data: quotas = [] } = useQuotas();
  const { data: leads = [] } = useLeads();
  const createQuota = useCreateQuota();
  const registerCont = useRegisterContemplation();

  const [showCreate, setShowCreate] = useState(false);
  const [contemplateId, setContemplateId] = useState<string | null>(null);

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createQuota.mutate({
      lead_id: (f.get("lead_id") as string) || null,
      numero_cota: (f.get("numero_cota") as string) || null,
      segmento: f.get("segmento") as ConsortiumSegment,
      valor_credito: +(f.get("valor_credito") as string),
      parcela_valor: +(f.get("parcela_valor") as string),
      parcela_total: +(f.get("parcela_total") as string),
      parcela_atual: +((f.get("parcela_atual") as string) || "0"),
      status: "ativa",
    }, { onSuccess: () => setShowCreate(false) });
  }

  function onContemplate(e: FormEvent<HTMLFormElement>, quotaId: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    registerCont.mutate({
      quota_id: quotaId,
      tipo: f.get("tipo") as ContemplationType,
      valor_lance: f.get("valor_lance") ? +(f.get("valor_lance") as string) : undefined,
      observacao: (f.get("obs") as string) || undefined,
    }, { onSuccess: () => setContemplateId(null) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{quotas.length} cota(s) na carteira</p>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Nova cota
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Cota</th>
              <th className="px-4 py-3 text-left">Segmento</th>
              <th className="px-4 py-3 text-right">Crédito</th>
              <th className="px-4 py-3 text-right">Parcela</th>
              <th className="px-4 py-3 text-center">Progresso</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {quotas.map(q => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{q.numero_cota ?? "—"}</td>
                <td className="px-4 py-3">{SEGMENT_LABEL[q.segmento]}</td>
                <td className="px-4 py-3 text-right">{BRL(q.valor_credito)}</td>
                <td className="px-4 py-3 text-right">{BRL(q.parcela_valor)}</td>
                <td className="px-4 py-3 text-center text-xs">{q.parcela_atual}/{q.parcela_total}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_TONE[q.status]}`}>
                    {QUOTA_STATUS_LABEL[q.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {q.status === "ativa" && (
                    <button onClick={() => setContemplateId(q.id)} className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">
                      <Award className="h-3.5 w-3.5" /> Contemplar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!quotas.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma cota cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Nova cota">
          <form onSubmit={onCreate} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldText name="numero_cota" label="Número da cota" />
              <FieldSelect name="segmento" label="Segmento" required options={Object.entries(SEGMENT_LABEL).map(([v, l]) => ({ v, l }))} />
              <FieldNumber name="valor_credito" label="Crédito (R$)" required />
              <FieldNumber name="parcela_valor" label="Parcela (R$)" required />
              <FieldNumber name="parcela_atual" label="Parcela atual" />
              <FieldNumber name="parcela_total" label="Parcela total" required />
              <FieldSelect name="lead_id" label="Lead vinculado" options={leads.map(l => ({ v: l.id, l: l.nome }))} />
            </div>
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
          </form>
        </Modal>
      )}

      {contemplateId && (
        <Modal onClose={() => setContemplateId(null)} title="Registrar contemplação">
          <form onSubmit={(e) => onContemplate(e, contemplateId)} className="space-y-3">
            <FieldSelect name="tipo" label="Tipo" required options={[
              { v: "sorteio", l: "Sorteio" }, { v: "lance_livre", l: "Lance livre" },
              { v: "lance_fixo", l: "Lance fixo" }, { v: "lance_embutido", l: "Lance embutido" },
            ]} />
            <FieldNumber name="valor_lance" label="Valor do lance (R$)" />
            <FieldText name="obs" label="Observação" />
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Confirmar contemplação</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FieldText({ name, label, required }: any) {
  return <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{label}</span>
    <input name={name} required={required} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>;
}
function FieldNumber({ name, label, required }: any) {
  return <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{label}</span>
    <input type="number" step="0.01" name={name} required={required} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>;
}
function FieldSelect({ name, label, required, options }: any) {
  return <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{label}</span>
    <select name={name} required={required} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
      {!required && <option value="">— —</option>}
      {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select></label>;
}
