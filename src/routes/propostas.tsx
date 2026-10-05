import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";
import { useProposals, useUpsertProposal, useDeleteProposal, type ProposalRow, type ProposalStatus } from "@/hooks/use-proposals";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/mock-data";
import { FileText, Plus, Pencil, Trash2, Search, X, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Align CRM" }] }),
  component: PropostasPage,
});

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", visualizada: "Visualizada",
  aceita: "Aceita", recusada: "Recusada", expirada: "Expirada",
};
const STATUS_TONE = (s: string): any =>
  s === "aceita" ? "success" : s === "recusada" || s === "expirada" ? "danger"
  : s === "enviada" || s === "visualizada" ? "info" : "neutral";

function PropostasPage() {
  useRealtimeSync([{ table: "proposals", queryKeys: [["proposals"]] }]);
  const { data: proposals = [], isLoading } = useProposals();
  const upsert = useUpsertProposal();
  const del = useDeleteProposal();
  const { canEdit, canDelete } = useMyCommercialRole();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Partial<ProposalRow> | null>(null);

  const filtered = useMemo(() => proposals.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (query && !p.titulo.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [proposals, query, statusFilter]);

  const now = new Date();
  const sentMonth = proposals.filter((p) => {
    const dt = new Date(p.created_at);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
  const accepted = proposals.filter((p) => p.status === "aceita");
  const acceptedValue = accepted.reduce((a, p) => a + Number(p.valor || 0), 0);
  const taxa = proposals.length > 0 ? Math.round((accepted.length / proposals.length) * 100) : 0;
  const pendentes = proposals.filter((p) => p.status === "enviada" || p.status === "visualizada").length;

  return (
    <AppShell
      title="Propostas"
      subtitle={`${proposals.length} no total · ${formatBRL(acceptedValue)} aceito`}
      action={canEdit ? <PrimaryButton icon={Plus} onClick={() => setEditing({ titulo: "", valor: 0, status: "rascunho" })}>Nova proposta</PrimaryButton> : null}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Enviadas no mês" value={String(sentMonth.length)} icon={Send} />
        <Kpi label="Aceitas" value={String(accepted.length)} delta={formatBRL(acceptedValue)} icon={CheckCircle2} />
        <Kpi label="Taxa de aceite" value={`${taxa}%`} />
        <Kpi label="Pendentes" value={String(pendentes)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar proposta…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{proposals.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} label={proposals.length === 0 ? "Nenhuma proposta ainda" : "Nada encontrado"}
            cta={canEdit ? { label: "Criar primeira", onClick: () => setEditing({ titulo: "", valor: 0, status: "rascunho" }) } : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Título</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Validade</th>
                <th className="px-5 py-3 font-medium text-right">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="transition hover:bg-surface-2/40">
                  <td className="px-5 py-3 font-medium">{p.titulo}</td>
                  <td className="px-5 py-3"><StatusPill tone={STATUS_TONE(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</StatusPill></td>
                  <td className="px-5 py-3 text-muted-foreground">{p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatBRL(Number(p.valor || 0))}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => setEditing(p)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
                      {canDelete && <button onClick={() => { if (confirm(`Excluir "${p.titulo}"?`)) del.mutate(p.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ProposalDialog draft={editing} onClose={() => setEditing(null)}
          onSave={(d) => {
            if (!d.titulo?.trim()) { toast.error("Informe um título"); return; }
            upsert.mutate({
              id: d.id, titulo: d.titulo!, valor: Number(d.valor ?? 0),
              status: (d.status as ProposalStatus) ?? "rascunho",
              validade: d.validade || null,
            }, { onSuccess: () => setEditing(null) });
          }} />
      )}
    </AppShell>
  );
}

function Kpi({ label, value, delta, icon: Icon }: { label: string; value: string; delta?: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {delta && <span className="text-[11px] font-semibold text-success">{delta}</span>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label, cta }: { icon: any; label: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></div>
      <p className="text-sm font-medium">{label}</p>
      {cta && <button onClick={cta.onClick} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-3.5 w-3.5" /> {cta.label}</button>}
    </div>
  );
}

function ProposalDialog({ draft, onClose, onSave }: { draft: Partial<ProposalRow>; onClose: () => void; onSave: (d: Partial<ProposalRow>) => void }) {
  const [d, setD] = useState(draft);
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Proposta"
      title={d.id ? "Editar proposta" : "Nova proposta"}
      widthClass="md:max-w-[520px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: "Salvar", onClick: () => onSave(d) }}
        />
      }
    >
      <div className="space-y-3">
        <L label="Título"><Inp value={d.titulo ?? ""} onChange={(v) => setD({ ...d, titulo: v })} autoFocus /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Valor (R$)"><Inp type="number" value={String(d.valor ?? 0)} onChange={(v) => setD({ ...d, valor: Number(v) })} /></L>
          <L label="Validade"><Inp type="date" value={d.validade ?? ""} onChange={(v) => setD({ ...d, validade: v })} /></L>
        </div>
        <L label="Status">
          <select value={d.status ?? "rascunho"} onChange={(e) => setD({ ...d, status: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </L>
      </div>
    </AlignPanel>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
function Inp({ onChange, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (v: string) => void }) {
  return <input {...rest} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />;
}
