import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { useInsights, useMarkInsightRead, type Priority } from "@/hooks/use-insights";
import { useLeads } from "@/hooks/use-leads";
import { formatBRL } from "@/lib/mock-data";
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, Flame, Check, Loader2, Inbox } from "lucide-react";
import { FeatureCardsSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "IA Insights — Align CRM" }] }),
  component: InsightsPage,
});

const FILTERS: { id: Priority | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "urgente", label: "Urgente" },
  { id: "alta", label: "Alta" },
  { id: "media", label: "Média" },
  { id: "baixa", label: "Baixa" },
];

function priorityTone(p: Priority | null | undefined) {
  switch (p) {
    case "urgente": return { tone: "danger" as const, label: "Urgente" };
    case "alta": return { tone: "success" as const, label: "Alta prioridade" };
    case "media": return { tone: "warn" as const, label: "Atenção" };
    default: return { tone: "info" as const, label: "Insight" };
  }
}

function InsightsPage() {
  const [filter, setFilter] = useState<Priority | "todas">("todas");
  const insights = useInsights(filter);
  const mark = useMarkInsightRead();
  const leads = useLeads();

  const ranked = (leads.data ?? [])
    .filter((l) => (l.ai_score ?? 0) > 0)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 6);

  const total = insights.data?.length ?? 0;
  const naoLidos = insights.data?.filter((i) => !i.lido).length ?? 0;

  return (
    <AppShell
      title="IA Insights"
      subtitle={`${total} insights gerados · ${naoLidos} não lido${naoLidos === 1 ? "" : "s"}`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              filter === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {insights.isLoading ? (
        <FeatureCardsSkeleton count={6} />
      ) : !insights.data || insights.data.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-2 py-16 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Sem insights{filter !== "todas" ? " nesta prioridade" : ""}</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Cadastre leads e use o botão de IA para gerar análises automáticas. Os insights vão aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {insights.data.map((i) => {
            const { tone, label } = priorityTone(i.prioridade);
            const isMarking = mark.isPending && mark.variables?.id === i.id;
            return (
              <div
                key={i.id}
                className={[
                  "rounded-2xl border p-5 shadow-card transition",
                  i.lido
                    ? "border-border bg-surface-1 opacity-70"
                    : "border-border bg-gradient-to-br from-surface-2 to-surface-1",
                ].join(" ")}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <StatusPill tone={tone}>{label}</StatusPill>
                </div>
                <h3 className="text-base font-semibold leading-snug">{i.titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{i.conteudo}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(i.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => mark.mutate({ id: i.id, lido: !i.lido })}
                    disabled={isMarking}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                  >
                    {isMarking ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    {i.lido ? "Marcar não lido" : "Marcar como lido"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Priorização inteligente</h3>
          </div>
          <span className="text-xs text-muted-foreground">Score IA · 0–100</span>
        </div>
        {ranked.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum lead analisado ainda. Vá para a página de Leads e clique no botão de IA.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ranked.map((d) => {
              const score = d.ai_score ?? 0;
              const trend = score >= 70;
              const valor = Number(d.valor_estimado ?? 0);
              return (
                <li key={d.id} className="grid grid-cols-12 items-center gap-4 px-6 py-4">
                  <div className="col-span-5">
                    <div className="text-sm font-semibold">{d.empresa || d.nome}</div>
                    <div className="text-xs text-muted-foreground">{d.nome}{d.interesse ? ` · ${d.interesse}` : ""}</div>
                  </div>
                  <div className="col-span-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                  <div className="col-span-1 text-right text-sm font-bold tabular-nums">{score}</div>
                  <div className="col-span-2 text-right text-sm font-semibold tabular-nums">
                    <span className={`inline-flex items-center gap-1 ${trend ? "text-success" : "text-muted-foreground"}`}>
                      {trend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {valor > 0 ? formatBRL(valor) : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
