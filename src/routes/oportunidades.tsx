import { dealsQueryOptions } from "@/hooks/use-deals";
import { leadsQueryOptions } from "@/hooks/use-leads";
import { getActiveTenantId } from "@/contexts/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";
import { useDeals, useUpsertDeal, useDeleteDeal, type DealRow, type DealStage } from "@/hooks/use-deals";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/mock-data";
import { Target, Plus, Pencil, Trash2, Search, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades — Align CRM" }] }),
  loader: ({ context }) => {
    const tenantId = typeof window === "undefined" ? null : getActiveTenantId();
    if (!tenantId) return;
    void context.queryClient.prefetchQuery(dealsQueryOptions(tenantId));
    void context.queryClient.prefetchQuery(leadsQueryOptions(tenantId));
  },
  component: OportunidadesPage,
});

const STAGE_LABEL: Record<DealStage, string> = {
  novo: "Novo", contato_inicial: "Em contato", qualificacao: "Qualificada",
  proposta: "Proposta", negociacao: "Negociação", fechado: "Ganha", perdido: "Perdida",
};

const STAGE_TONE = (s: DealStage) =>
  s === "fechado" ? "success" : s === "perdido" ? "danger"
  : s === "negociacao" || s === "proposta" ? "warn" : s === "qualificacao" ? "info" : "neutral";

function OportunidadesPage() {
  useRealtimeSync([{ table: "deals", queryKeys: [["deals"]] }]);
  const { data: deals = [], isLoading } = useDeals();
  const upsert = useUpsertDeal();
  const del = useDeleteDeal();
  const { canEdit, canDelete } = useMyCommercialRole();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "todos">("todos");
  const [editing, setEditing] = useState<Partial<DealRow> | null>(null);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (stageFilter !== "todos" && d.stage !== stageFilter) return false;
      if (query && !d.titulo.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [deals, query, stageFilter]);

  const openDeals = deals.filter((d) => d.stage !== "fechado" && d.stage !== "perdido");
  const pipelineOpen = openDeals.reduce((a, d) => a + Number(d.valor || 0), 0);
  const wonThisMonth = deals.filter((d) => {
    if (d.stage !== "fechado" || !d.fechado_em) return false;
    const dt = new Date(d.fechado_em);
    const now = new Date();
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
  const wonValue = wonThisMonth.reduce((a, d) => a + Number(d.valor || 0), 0);
  const ticketMedio = wonThisMonth.length > 0 ? wonValue / wonThisMonth.length : 0;
  const conversao = deals.length > 0
    ? Math.round((deals.filter((d) => d.stage === "fechado").length / deals.length) * 100)
    : 0;

  return (
    <AppShell
      title="Oportunidades"
      subtitle={`${openDeals.length} em aberto · ${formatBRL(pipelineOpen)} em pipeline`}
      action={canEdit ? <PrimaryButton icon={Plus} onClick={() => setEditing({ titulo: "", valor: 0, stage: "qualificacao" })}>Nova oportunidade</PrimaryButton> : null}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Pipeline aberto" value={formatBRL(pipelineOpen)} icon={TrendingUp} />
        <Kpi label="Ganhas no mês" value={String(wonThisMonth.length)} delta={formatBRL(wonValue)} />
        <Kpi label="Ticket médio" value={formatBRL(ticketMedio)} />
        <Kpi label="Taxa de conversão" value={`${conversao}%`} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar oportunidade…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todos os estágios</option>
            {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{deals.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Target}
            label={deals.length === 0 ? "Nenhuma oportunidade ainda" : "Nada encontrado com esses filtros"}
            cta={canEdit ? { label: "Criar primeira", onClick: () => setEditing({ titulo: "", valor: 0, stage: "qualificacao" }) } : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Título</th>
                <th className="px-5 py-3 font-medium">Estágio</th>
                <th className="px-5 py-3 font-medium">Probabilidade</th>
                <th className="px-5 py-3 font-medium text-right">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id} className="transition hover:bg-surface-2/40">
                  <td className="px-5 py-3 font-medium">{d.titulo}</td>
                  <td className="px-5 py-3"><StatusPill tone={STAGE_TONE(d.stage) as any}>{STAGE_LABEL[d.stage]}</StatusPill></td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{d.probabilidade ?? 0}%</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatBRL(Number(d.valor))}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => setEditing(d)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-3 hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => { if (confirm(`Excluir "${d.titulo}"?`)) del.mutate(d.id); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <DealDialog
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={(d) => {
            if (!d.titulo?.trim()) { toast.error("Informe um título"); return; }
            upsert.mutate({
              id: d.id, titulo: d.titulo!, valor: Number(d.valor ?? 0),
              stage: (d.stage as DealStage) ?? "qualificacao", probabilidade: Number(d.probabilidade ?? 0),
            }, { onSuccess: () => setEditing(null) });
          }}
        />
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
      {cta && (
        <button onClick={cta.onClick} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> {cta.label}
        </button>
      )}
    </div>
  );
}

function DealDialog({ draft, onClose, onSave }: { draft: Partial<DealRow>; onClose: () => void; onSave: (d: Partial<DealRow>) => void }) {
  const [d, setD] = useState(draft);
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Oportunidade"
      title={d.id ? "Editar oportunidade" : "Nova oportunidade"}
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
          <L label="Probabilidade %"><Inp type="number" value={String(d.probabilidade ?? 0)} onChange={(v) => setD({ ...d, probabilidade: Number(v) })} /></L>
        </div>
        <L label="Estágio">
          <select value={d.stage ?? "qualificacao"} onChange={(e) => setD({ ...d, stage: e.target.value as DealStage })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
