import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProspectingFiltersBar } from "@/components/prospecting/prospecting-filters";
import { ProspectingResultsTable } from "@/components/prospecting/prospecting-results-table";
import { ProspectingResultDrawer } from "@/components/prospecting/prospecting-result-drawer";
import { ProspectingImportDialog } from "@/components/prospecting/prospecting-import-dialog";
import { ProspectingWorkspace } from "@/components/prospecting/prospecting-workspace";
import {
  useProspectingKpis,
  useProspectingResults,
  useProspectingSearches,
  useRunProspectingSearch,
  useToggleFavorite,
} from "@/hooks/use-prospecting";
import type { ProspectingFilters, ProspectingResultRow } from "@/lib/prospecting/types";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  SearchCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { canImportProspectingResult } from "@/lib/prospecting/demo";
import { exportProspectingCsv, exportProspectingXlsx } from "@/lib/prospecting/export";

export const Route = createFileRoute("/prospeccao")({
  head: () => ({
    meta: [
      { title: "Prospecção B2B — Align CRM" },
      {
        name: "description",
        content: "Busque, qualifique e importe leads B2B com score inteligente.",
      },
    ],
  }),
  component: ProspeccaoPage,
});

const DEFAULT_FILTERS: ProspectingFilters = {
  tipo_lead: "empresa",
  quantidade: 30,
  score_min: 0,
  excluir_cadastrados: true,
};

const ACTIVE_STATUSES = [
  "pendente",
  "buscando",
  "validando",
  "deduplicando",
  "analisando",
  "calculando",
];

function ProspeccaoPage() {
  const [filters, setFilters] = useState<ProspectingFilters>(DEFAULT_FILTERS);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<ProspectingResultRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { canEdit, canDelete } = useMyCommercialRole();
  const runSearch = useRunProspectingSearch();
  const favMut = useToggleFavorite();
  const { data: searches = [] } = useProspectingSearches(10);
  const { data: kpis } = useProspectingKpis(30);
  const {
    data: results = [],
    isLoading,
    isError: resultsError,
    error: resultsErrorDetails,
    refetch: refetchResults,
  } = useProspectingResults(activeSearchId);

  const activeResults = useMemo(
    () => results.filter((result) => !["ignorado", "invalido"].includes(result.status)),
    [results],
  );
  const activeSearch = searches.find((search) => search.id === activeSearchId);
  const searching = !!activeSearch && ACTIVE_STATUSES.includes(activeSearch.status);
  const openLive = opened ? (results.find((result) => result.id === opened.id) ?? null) : null;

  async function handleRun() {
    await runWithFilters(filters);
  }

  async function runWithFilters(nextFilters: ProspectingFilters) {
    if (!canEdit || (!nextFilters.nicho?.trim() && !nextFilters.palavra_chave?.trim())) return;
    setFilters(nextFilters);
    const searchId = crypto.randomUUID();
    setActiveSearchId(searchId);
    setSelected(new Set());
    await runSearch.mutateAsync({
      nome: nextFilters.nicho,
      filtros: nextFilters,
      searchId,
    });
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const importable = activeResults.filter(canImportProspectingResult);
    if (importable.every((result) => selected.has(result.id))) setSelected(new Set());
    else setSelected(new Set(importable.map((result) => result.id)));
  }

  function openSearch(searchId: string) {
    setSelected(new Set());
    if (searchId === activeSearchId) void refetchResults();
    else setActiveSearchId(searchId);
  }

  return (
    <AppShell
      title="Prospecção B2B"
      subtitle="Busque, qualifique e importe leads reais com score inteligente"
      action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              exportProspectingCsv(
                selected.size ? results.filter((result) => selected.has(result.id)) : activeResults,
              )
            }
            disabled={!activeResults.length || !canEdit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={() =>
              exportProspectingXlsx(
                selected.size ? results.filter((result) => selected.has(result.id)) : activeResults,
              )
            }
            disabled={!activeResults.length || !canEdit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
          </button>
          <button
            onClick={() => setImportOpen(true)}
            disabled={!selected.size || !canEdit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Importar {selected.size > 0 && `(${selected.size})`}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        >
          <Kpi
            icon={Target}
            label="Encontrados / 30d"
            value={kpis?.encontrados ?? 0}
            accent="text-primary"
            variant={staggerItem}
          />
          <Kpi
            icon={Sparkles}
            label="Qualificados"
            value={kpis?.qualificados ?? 0}
            accent="text-success"
            variant={staggerItem}
          />
          <Kpi
            icon={CheckCircle2}
            label="No CRM"
            value={kpis?.importados ?? 0}
            accent="text-info"
            variant={staggerItem}
          />
          <Kpi
            icon={TrendingUp}
            label="Taxa média"
            value={`${kpis?.taxa_qualificacao ?? 0}%`}
            accent="text-warning"
            variant={staggerItem}
          />
          <Kpi
            icon={Trash2}
            label="Descartados"
            value={kpis?.descartados ?? 0}
            accent="text-destructive"
            variant={staggerItem}
          />
          <Kpi
            icon={SearchCheck}
            label="Pesquisas"
            value={kpis?.pesquisas ?? 0}
            accent="text-primary"
            variant={staggerItem}
          />
        </motion.div>

        <ProspectingFiltersBar
          value={filters}
          onChange={setFilters}
          onRun={handleRun}
          running={runSearch.isPending}
        />

        {(searching || activeSearch?.status === "erro") && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
              activeSearch?.status === "erro"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/25 bg-primary/5"
            }`}
          >
            {activeSearch?.status === "erro" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <div>
              <div className="font-medium">
                {activeSearch?.status === "erro"
                  ? "Não foi possível concluir a pesquisa"
                  : (activeSearch?.etapa_atual ?? "Processando pesquisa")}
              </div>
              {activeSearch?.erro && <div className="text-xs opacity-80">{activeSearch.erro}</div>}
            </div>
          </div>
        )}

        {searches.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Buscas recentes:
            </span>
            {searches.slice(0, 6).map((search) => (
              <button
                key={search.id}
                onClick={() => openSearch(search.id)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${
                  activeSearchId === search.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-surface-1 text-muted-foreground hover:text-foreground"
                }`}
              >
                {search.nome ?? "(sem nome)"} · {search.qualificados}/{search.encontrados}
              </button>
            ))}
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-surface-2 py-16 text-sm text-muted-foreground">
            Carregando resultados...
          </div>
        ) : resultsError ? (
          <div className="grid place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 py-12 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
            <div className="font-medium text-destructive">Não foi possível carregar os resultados</div>
            <div className="mt-1 max-w-md text-xs text-muted-foreground">
              {resultsErrorDetails instanceof Error
                ? resultsErrorDetails.message
                : "A consulta de resultados falhou."}
            </div>
            <button
              onClick={() => void refetchResults()}
              className="mt-4 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <ProspectingResultsTable
            results={activeResults}
            selected={selected}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleAll}
            onOpen={setOpened}
            onToggleFav={(result) => favMut.mutate({ id: result.id, favorito: !result.favorito })}
          />
        )}

        <ProspectingWorkspace
          filters={filters}
          searches={searches}
          selectedIds={Array.from(selected)}
          onOpenSearch={openSearch}
          onRunFilters={runWithFilters}
          canManage={canDelete}
        />
      </div>

      <ProspectingResultDrawer
        result={openLive}
        onClose={() => setOpened(null)}
        onImport={(result) => {
          setSelected(new Set([result.id]));
          setOpened(null);
          setImportOpen(true);
        }}
      />
      <ProspectingImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        resultIds={Array.from(selected)}
        onCompleted={() => setSelected(new Set())}
      />
    </AppShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  variant,
}: {
  icon: any;
  label: string;
  value: number | string;
  accent: string;
  variant?: any;
}) {
  return (
    <motion.div
      variants={variant}
      className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </motion.div>
  );
}
