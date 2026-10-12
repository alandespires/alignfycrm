import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { leadsQueryOptions, useLeads, useUpdateLeadStatus, useDeleteLead, type LeadRow, type LeadStatus } from "@/hooks/use-leads";
import { getActiveTenantId } from "@/contexts/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FunnelViewSwitch } from "@/components/funnel-view-switch";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/mock-data";
import { Target, Trash2, Search, TrendingUp } from "@/components/ui/icons";

export const Route = createFileRoute("/oportunidades")({
  head: () => pageHead("Funil de vendas · Lista"),
  loader: ({ context }) => {
    const tenantId = typeof window === "undefined" ? null : getActiveTenantId();
    if (!tenantId) return;
    void context.queryClient.prefetchQuery(leadsQueryOptions(tenantId));
  },
  component: OportunidadesPage,
});

// Mesmos estágios do Kanban: Lista e Kanban leem a mesma fonte (leads).
const STAGE_LABEL: Record<LeadStatus, string> = {
  novo: "Novo Lead", contato_inicial: "Contato Inicial", qualificacao: "Qualificação",
  proposta: "Proposta", negociacao: "Negociação", fechado: "Fechado", perdido: "Perdido",
};

function OportunidadesPage() {
  useRealtimeSync([{ table: "leads", queryKeys: [["leads"]] }]);
  const { data: leads = [], isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const del = useDeleteLead();
  const { canEdit, canDelete } = useMyCommercialRole();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStatus | "todos">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "todos" && l.status !== stageFilter) return false;
      if (q && !`${l.nome} ${l.empresa ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, query, stageFilter]);

  const valor = (l: LeadRow) => Number(l.valor_estimado || 0);
  const open = leads.filter((l) => l.status !== "fechado" && l.status !== "perdido");
  const pipelineOpen = open.reduce((a, l) => a + valor(l), 0);
  const won = leads.filter((l) => l.status === "fechado");
  const wonValue = won.reduce((a, l) => a + valor(l), 0);
  const ticketMedio = won.length ? wonValue / won.length : 0;
  const conversao = leads.length ? Math.round((won.length / leads.length) * 100) : 0;

  return (
    <AppShell
      title="Funil de vendas"
      subtitle={`${open.length} em aberto · ${formatBRL(pipelineOpen)} em pipeline`}
      action={<div className="flex items-center gap-2"><FunnelViewSwitch current="lista" />{canEdit && <LeadFormDialog />}</div>}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Pipeline aberto" value={formatBRL(pipelineOpen)} icon={TrendingUp} />
        <Kpi label="Ganhas" value={String(won.length)} delta={formatBRL(wonValue)} />
        <Kpi label="Ticket médio" value={formatBRL(ticketMedio)} />
        <Kpi label="Taxa de conversão" value={`${conversao}%`} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar negócio…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as LeadStatus | "todos")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todos os estágios</option>
            {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{leads.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Target className="h-6 w-6" /></div>
            <p className="text-sm font-medium">{leads.length === 0 ? "Nenhum negócio no funil" : "Nada encontrado com esses filtros"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Negócio</th>
                  <th className="px-5 py-3 font-medium">Estágio</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium text-right">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setSelectedId(l.id)} className="cursor-pointer transition hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <div className="font-medium">{l.empresa || l.nome}</div>
                      {l.empresa && <div className="text-xs text-muted-foreground">{l.nome}</div>}
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={l.status}
                        disabled={!canEdit}
                        onChange={(e) => updateStatus.mutate({ id: l.id, status: e.target.value as LeadStatus } as any)}
                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                      >
                        {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">{l.ai_score ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{valor(l) > 0 ? formatBRL(valor(l)) : "—"}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      {canDelete && (
                        <div className="flex justify-end">
                          <Button variant="unstyled" size="unstyled" onClick={() => { if (confirm(`Excluir "${l.empresa || l.nome}"?`)) del.mutate(l.id as any); }}
                            aria-label="Excluir negócio" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeadDetailDrawer lead={selected} onClose={() => setSelectedId(null)} />
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
