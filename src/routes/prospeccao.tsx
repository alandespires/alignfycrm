import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProspectingFiltersBar } from "@/components/prospecting/prospecting-filters";
import { ProspectingResultsTable } from "@/components/prospecting/prospecting-results-table";
import { ProspectingResultDrawer } from "@/components/prospecting/prospecting-result-drawer";
import {
  useProspectingResults, useProspectingSearches, useRunProspectingSearch,
  useImportResults, useToggleFavorite,
} from "@/hooks/use-prospecting";
import type { ProspectingFilters, ProspectingResultRow } from "@/lib/prospecting/types";
import { Download, Sparkles, Target, CheckCircle2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";

export const Route = createFileRoute("/prospeccao")({
  head: () => ({ meta: [
    { title: "Prospecção B2B — Align CRM" },
    { name: "description", content: "Busque, qualifique e importe leads B2B com IA e score inteligente." },
  ] }),
  component: ProspeccaoPage,
});

const DEFAULT_FILTERS: ProspectingFilters = {
  tipo_lead: "empresa",
  quantidade: 30,
  score_min: 0,
  excluir_cadastrados: true,
};

function ProspeccaoPage() {
  const [filters, setFilters] = useState<ProspectingFilters>(DEFAULT_FILTERS);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<ProspectingResultRow | null>(null);

  const { canEdit } = useMyCommercialRole();
  const runSearch = useRunProspectingSearch();
  const importMut = useImportResults();
  const favMut = useToggleFavorite();
  const { data: searches = [] } = useProspectingSearches(10);
  const { data: results = [], isLoading } = useProspectingResults(activeSearchId);

  const activeResults = useMemo(() => results.filter((r) => r.status !== "ignorado" && r.status !== "invalido"), [results]);

  const kpis = useMemo(() => {
    const total = results.length;
    const qualificados = results.filter((r) => r.score >= 70).length;
    const importados = results.filter((r) => r.status === "importado").length;
    const buscasMes = searches.filter((s) => new Date(s.created_at) > new Date(Date.now() - 30 * 864e5)).length;
    return { total, qualificados, importados, buscasMes };
  }, [results, searches]);

  const openLive = opened ? results.find((r) => r.id === opened.id) ?? null : null;

  async function handleRun() {
    if (!canEdit) return;
    const r = await runSearch.mutateAsync({ nome: filters.nicho, filtros: filters });
    setActiveSearchId(r.searchId);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === activeResults.length) setSelected(new Set());
    else setSelected(new Set(activeResults.filter((r) => r.status !== "importado").map((r) => r.id)));
  }

  function handleImport() {
    if (!selected.size) return;
    importMut.mutate(
      { resultIds: Array.from(selected) },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  return (
    <AppShell
      title="Prospecção B2B"
      subtitle="Busque, qualifique e importe leads reais com score inteligente"
      action={
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={!selected.size || importMut.isPending || !canEdit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Importar {selected.size > 0 && `(${selected.size})`}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={Target} label="Resultados" value={kpis.total} accent="text-primary" variant={staggerItem} />
          <Kpi icon={Sparkles} label="Qualificados" value={kpis.qualificados} accent="text-success" variant={staggerItem} />
          <Kpi icon={CheckCircle2} label="Importados" value={kpis.importados} accent="text-info" variant={staggerItem} />
          <Kpi icon={TrendingUp} label="Buscas / 30d" value={kpis.buscasMes} accent="text-warning" variant={staggerItem} />
        </motion.div>

        {/* Filtros */}
        <ProspectingFiltersBar value={filters} onChange={setFilters} onRun={handleRun} running={runSearch.isPending} />

        {/* Histórico rápido */}
        {searches.length > 0 && (
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buscas recentes:</span>
            {searches.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => { setActiveSearchId(s.id); setSelected(new Set()); }}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${
                  activeSearchId === s.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface-1 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.nome ?? "(sem nome)"} · {s.qualificados}/{s.encontrados}
              </button>
            ))}
          </motion.div>
        )}

        {/* Resultados */}
        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-surface-2 py-16">
            <div className="text-sm text-muted-foreground">Carregando resultados...</div>
          </div>
        ) : (
          <ProspectingResultsTable
            results={activeResults}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleAll}
            onOpen={setOpened}
            onToggleFav={(r) => favMut.mutate({ id: r.id, favorito: !r.favorito })}
          />
        )}
      </div>

      <ProspectingResultDrawer result={openLive} onClose={() => setOpened(null)} />
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, accent, variant }: { icon: any; label: string; value: number; accent: string; variant?: any }) {
  return (
    <motion.div variants={variant} className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </motion.div>
  );
}
