import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { LeadImportDialog } from "@/components/lead-import-dialog";
import {
  LeadFiltersDialog,
  applyLeadFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  type LeadFilters,
} from "@/components/lead-filters-dialog";
import { useLeads, useDeleteLead, type LeadRow, type LeadStatus } from "@/hooks/use-leads";
import { useScoreLead } from "@/hooks/use-score-lead";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Trash2, Mail, Phone, Loader2, Inbox, Sparkles, Search, X } from "lucide-react";
import { TableRowsSkeleton } from "@/components/skeletons";
import { WhatsAppContactLink } from "@/components/whatsapp-contact-link";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Align CRM" }] }),
  component: LeadsPage,
});

const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contato_inicial: "Em contato",
  qualificacao: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Convertido",
  perdido: "Perdido",
};

const statusTone = (s: LeadStatus) =>
  s === "fechado"
    ? "success"
    : s === "qualificacao" || s === "negociacao"
      ? "info"
      : s === "contato_inicial" || s === "proposta"
        ? "warn"
        : s === "perdido"
          ? "danger"
          : "neutral";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null || score === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    score >= 80
      ? "text-success bg-success/15"
      : score >= 50
        ? "text-warning bg-warning/15"
        : "text-muted-foreground bg-surface-3";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}
    >
      <Sparkles className="h-3 w-3" /> {score}
    </span>
  );
}

function LeadsPage() {
  useRealtimeSync([
    { table: "leads", queryKeys: [["leads"]] },
    { table: "activities", queryKeys: [["activities"]] },
    { table: "tasks", queryKeys: [["tasks"]] },
  ]);
  const { data: leads = [], isLoading } = useLeads();
  const del = useDeleteLead();
  const score = useScoreLead();
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const filteredLeads = useMemo(() => applyLeadFilters(leads, filters), [leads, filters]);
  const activeFilterCount = countActiveFilters(filters);
  const novosSemana = leads.filter(
    (l) => Date.now() - new Date(l.created_at).getTime() < 7 * 864e5,
  ).length;

  // Keep selected synced with latest data
  const selectedLive = selected ? (leads.find((l) => l.id === selected.id) ?? null) : null;

  return (
    <AppShell
      title="Leads"
      subtitle={`${leads.length} leads ativos · ${novosSemana} novos esta semana`}
      action={
        <div className="flex flex-wrap gap-2">
          <LeadImportDialog leads={leads} />
          <LeadFiltersDialog leads={leads} value={filters} onChange={setFilters} />
          <LeadFormDialog />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-surface-2 p-3 shadow-card">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Buscar leads</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Buscar por nome, empresa ou contato"
            className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-10 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {filters.q && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setFilters({ ...filters, q: "" })}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <div className="self-center text-xs text-muted-foreground">
          {filteredLeads.length} resultado{filteredLeads.length === 1 ? "" : "s"}
        </div>
      </div>
      {isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-1/60">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                <TableRowsSkeleton rows={6} cols={5} />
              </tbody>
            </table>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhum lead ainda</h3>
          <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
            Comece criando seu primeiro lead — ele aparece aqui e no Pipeline.
          </p>
          <LeadFormDialog />
        </div>
      ) : (
        <div className="space-y-3">
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="text-foreground/90">
                <span className="font-semibold text-primary">{filteredLeads.length}</span>
                <span className="text-muted-foreground"> de {leads.length} leads · {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} ativo{activeFilterCount === 1 ? "" : "s"}</span>
              </span>
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            </div>
          )}
          {filteredLeads.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nenhum lead corresponde aos filtros</h3>
              <p className="mb-4 mt-1 max-w-sm text-sm text-muted-foreground">
                Ajuste ou limpe os filtros para ver mais resultados.
              </p>
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-sm hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </button>
            </div>
          ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-1/60">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Nicho</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Score IA</th>
                  <th className="px-5 py-3 font-medium">Próxima ação (IA)</th>
                  <th className="px-5 py-3 font-medium">Criado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((l) => {
                  const isScoring = score.isPending && score.variables === l.id;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className="cursor-pointer transition hover:bg-surface-1/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/70 to-[oklch(0.55_0.16_35)] text-xs font-bold text-primary-foreground">
                            {initialsOf(l.nome)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-medium">{l.nome}</div>
                            {l.ai_resumo && (
                              <div
                                className="mt-0.5 max-w-[260px] truncate text-[11px] text-muted-foreground"
                                title={l.ai_resumo}
                              >
                                {l.ai_resumo}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{l.empresa ?? "—"}</td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {l.email && (
                            <a href={`mailto:${l.email}`} className="hover:text-primary">
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {l.whatsapp && (
                            <WhatsAppContactLink phone={l.whatsapp} leadId={l.id} consent={l.whatsapp_consent_status} className="hover:text-success">
                              <Phone className="h-3.5 w-3.5" />
                            </WhatsAppContactLink>
                          )}
                          {!l.email && !l.whatsapp && <span className="text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {l.nicho || l.interesse ? (
                          <span className="inline-flex items-center rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {l.nicho ?? l.interesse}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill tone={statusTone(l.status) as any}>
                          {STATUS_LABEL[l.status]}
                        </StatusPill>
                      </td>
                      <td className="px-5 py-3.5">
                        <ScorePill score={l.ai_score} />
                      </td>
                      <td className="px-5 py-3.5">
                        {l.ai_sugestao ? (
                          <span
                            className="block max-w-[280px] truncate text-xs text-foreground/90"
                            title={l.ai_sugestao}
                          >
                            {l.ai_sugestao}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                        {fmtDate(l.created_at)}
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => score.mutate(l.id)}
                            disabled={isScoring}
                            title="Analisar com IA"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-1 px-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
                          >
                            {isScoring ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            IA
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${l.nome}?`)) del.mutate(l.id);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:text-destructive"
                            aria-label={`Remover lead ${l.nome}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          )}
        </div>
      )}

      <LeadDetailDrawer lead={selectedLive} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
