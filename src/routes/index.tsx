import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import {
  ArrowUpRight, TrendingUp, TrendingDown, Users, Target, DollarSign,
  CheckCircle2, Sparkles, Plus, ArrowRight, Phone, Mail, Zap, ChevronDown, LayoutGrid,
} from "lucide-react";
import { useDashboardWidgets, WIDGET_LABELS, type WidgetId } from "@/hooks/use-dashboard-widgets";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/mock-data";
import { useLeads, type LeadStatus } from "@/hooks/use-leads";
import { useActivities, useDeals, useRevenueSeries } from "@/hooks/use-dashboard";
import { useEntries, computeEntryReceived, startOfMonth, endOfMonth } from "@/hooks/use-finance";
import { useAllPayments } from "@/hooks/use-payments";
import { useInsights } from "@/hooks/use-insights";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Align CRM" }] }),
  component: DashboardPage,
});

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: "novo", label: "Novo Lead", color: "oklch(0.65 0.02 250)" },
  { id: "contato_inicial", label: "Contato Inicial", color: "oklch(0.7 0.12 220)" },
  { id: "qualificacao", label: "Qualificação", color: "oklch(0.72 0.14 180)" },
  { id: "proposta", label: "Proposta", color: "oklch(0.78 0.16 80)" },
  { id: "negociacao", label: "Negociação", color: "oklch(0.685 0.175 45)" },
  { id: "fechado", label: "Fechado", color: "oklch(0.72 0.21 142)" },
  { id: "perdido", label: "Perdido", color: "oklch(0.55 0.18 25)" },
];

function KpiCard({ label, value, delta, trend, icon: Icon, accent, loading }: {
  label: string; value: string; delta?: string; trend?: "up" | "down"; icon: any; accent?: boolean; loading?: boolean;
}) {
  return (
    <div className={[
      "group relative overflow-hidden rounded-2xl border border-border p-5 shadow-card transition hover:border-primary/40",
      accent ? "bg-gradient-to-br from-surface-2 to-surface-1" : "bg-surface-2",
    ].join(" ")}>
      <div className="flex items-start justify-between">
        <div className={[
          "grid h-9 w-9 place-items-center rounded-lg",
          accent ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground",
        ].join(" ")}>
          <Icon className="h-4 w-4" />
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition group-hover:bg-surface-3 group-hover:text-foreground">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <span className="text-2xl font-semibold tracking-tight">{value}</span>
            {delta && trend && (
              <span className={[
                "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                trend === "up" ? "text-success" : "text-destructive",
              ].join(" ")}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, any> = {
  ligacao: Phone,
  email: Mail,
  whatsapp: Mail,
  reuniao: CheckCircle2,
  nota: Sparkles,
  movimentacao: Zap,
  tarefa: Zap,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

type Periodo = "hoje" | "semana" | "mes" | "tudo";
const PERIODO_LABEL: Record<Periodo, string> = { hoje: "Hoje", semana: "Esta semana", mes: "Este mês", tudo: "Todo o período" };
const PERIODO_DAYS: Record<Periodo, number | null> = { hoje: 1, semana: 7, mes: 30, tudo: null };

export function DashboardPage() {
  useRealtimeSync([
    { table: "leads", queryKeys: [["leads"]] },
    { table: "deals", queryKeys: [["deals"], ["revenue_series"]] },
    { table: "activities", queryKeys: [["activities"]] },
    { table: "ai_insights", queryKeys: [["ai_insights"]] },
    { table: "financial_entries", queryKeys: [["fin-entries"], ["revenue_series"]] },
    { table: "financial_payments", queryKeys: [["fin-payments-all"], ["fin-entries"]] },
    { table: "projects", queryKeys: [["projects"]] },
  ]);
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const { visible, toggle, reset } = useDashboardWidgets();

  const leads = useLeads();
  const deals = useDeals();
  const activities = useActivities(5);
  const revenue = useRevenueSeries();
  const insights = useInsights("todas");
  const entries = useEntries();
  const payments = useAllPayments();

  const leadList = leads.data ?? [];
  const dealList = deals.data ?? [];
  const entryList = entries.data ?? [];
  const paymentList = payments.data ?? [];

  const periodDays = PERIODO_DAYS[periodo];
  const cutoffMs = periodDays != null ? Date.now() - periodDays * 864e5 : 0;
  const leadsPeriodo = periodDays == null
    ? leadList
    : leadList.filter((l) => new Date(l.created_at).getTime() >= cutoffMs);

  const stageCounts = STAGES.map((s) => {
    const count = leadList.filter((l) => l.status === s.id).length;
    const value = leadList.filter((l) => l.status === s.id).reduce((acc, l) => acc + Number(l.valor_estimado ?? 0), 0);
    return { ...s, count, value };
  });

  const totalPipeline = leadList
    .filter((l) => l.status !== "fechado" && l.status !== "perdido")
    .reduce((a, l) => a + Number(l.valor_estimado ?? 0), 0);

  // "Fechado no mês" agora usa receita REAL recebida (pagamentos + entradas pagas),
  // excluindo canceladas — em vez de somar deals.valor que ignorava exclusões/cancelamentos.
  const ini = startOfMonth();
  const fim = endOfMonth();
  const inMonthDate = (iso: string | null | undefined) => !!iso && new Date(iso) >= ini && new Date(iso) <= fim;

  const wonMonth = (() => {
    // Pagamentos parciais registrados no mês
    const fromPayments = paymentList
      .filter((p) => inMonthDate(p.pago_em + "T12:00:00"))
      .reduce((s, p) => s + Number(p.valor || 0), 0);
    // Entradas marcadas como pagas no mês SEM pagamentos parciais (evita duplicidade)
    const paidEntriesIds = new Set(paymentList.map((p) => p.entry_id));
    const fromEntries = entryList
      .filter((e) => e.status === "pago" && !paidEntriesIds.has(e.id) && inMonthDate((e.recebido_em || e.created_at) + (e.recebido_em ? "T12:00:00" : "")))
      .reduce((s, e) => s + computeEntryReceived(e, paymentList), 0);
    return fromPayments + fromEntries;
  })();

  const oportunidadesAbertas = leadList.filter((l) => l.status !== "fechado" && l.status !== "perdido").length;
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));

  const topInsights = (insights.data ?? []).filter((i) => !i.lido).slice(0, 3);
  const topActivities = (activities.data ?? []).slice(0, 5);
  const isLoading = leads.isLoading || deals.isLoading;

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <AppShell
      title={`${greeting} 👋`}
      subtitle="Aqui está o panorama da sua operação comercial hoje."
      action={
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setWidgetsOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted-foreground hover:text-foreground"
              title="Personalizar widgets"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Personalizar
            </button>
            {widgetsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setWidgetsOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-elevated">
                  <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Widgets visíveis
                  </div>
                  {(Object.keys(WIDGET_LABELS) as WidgetId[]).map((id) => (
                    <label key={id} className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition hover:bg-surface-3">
                      <span>{WIDGET_LABELS[id]}</span>
                      <input
                        type="checkbox"
                        checked={visible[id]}
                        onChange={() => toggle(id)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                  <button
                    onClick={() => { reset(); setWidgetsOpen(false); }}
                    className="w-full border-t border-border px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
                  >
                    Restaurar padrão
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setPeriodoOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              {PERIODO_LABEL[periodo]} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {periodoOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPeriodoOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-elevated">
                  {(Object.keys(PERIODO_LABEL) as Periodo[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPeriodo(p); setPeriodoOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-surface-3 ${periodo === p ? "text-primary" : "text-foreground"}`}
                    >
                      {PERIODO_LABEL[p]}
                      {periodo === p && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <LeadFormDialog
            trigger={
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110">
                <Plus className="h-4 w-4" /> Novo lead
              </button>
            }
          />
        </div>
      }
    >
      {/* KPI grid */}
      {visible.kpis && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={`Leads ${periodo === "tudo" ? "totais" : `(${PERIODO_LABEL[periodo].toLowerCase()})`}`} value={String(leadsPeriodo.length)} icon={Users} loading={isLoading} />
          <KpiCard label="Oportunidades abertas" value={String(oportunidadesAbertas)} icon={Target} accent loading={isLoading} />
          <KpiCard label="Receita prevista" value={formatBRL(totalPipeline)} icon={DollarSign} accent loading={isLoading} />
          <KpiCard label="Fechado no mês" value={formatBRL(wonMonth)} icon={CheckCircle2} loading={isLoading} />
        </div>
      )}

      {/* Main grid */}
      {(visible.receita || visible.insights) && (
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* Receita */}
        {visible.receita && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">Receita</h3>
              <p className="text-xs text-muted-foreground">Previsto vs. fechado nos últimos 7 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Previsto</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" />Fechado</span>
            </div>
          </div>
          <div className="h-72 px-2 py-4">
            {revenue.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.data ?? []} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.685 0.175 45)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.685 0.175 45)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.21 142)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.72 0.21 142)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.27 0 0)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "oklch(0.985 0 0)" }}
                    formatter={(v: number) => `R$ ${v}k`}
                  />
                  <Area type="monotone" dataKey="previsto" stroke="oklch(0.685 0.175 45)" strokeWidth={2.5} fill="url(#g1)" />
                  <Area type="monotone" dataKey="fechado" stroke="oklch(0.72 0.21 142)" strokeWidth={2.5} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        {/* IA Insights */}
        {visible.insights && (
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-surface-1 shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-base font-semibold">IA Insights</h3>
            </div>
            <Link to="/insights" className="text-xs text-muted-foreground hover:text-primary">Ver tudo</Link>
          </div>
          <div className="space-y-2 p-4">
            {insights.isLoading ? (
              <div className="space-y-2">
                {[0,1,2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface-2 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-3 w-3" />
                    </div>
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="mt-2 h-2.5 w-full" />
                    <Skeleton className="mt-1.5 h-2.5 w-2/3" />
                  </div>
                ))}
              </div>
            ) : topInsights.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum insight pendente. Gere análises na página de Leads.
              </div>
            ) : topInsights.map((i) => {
              const tone = i.prioridade === "urgente" ? "danger" : i.prioridade === "alta" ? "success" : i.prioridade === "media" ? "warn" : "info";
              const label = i.prioridade === "urgente" ? "Urgente" : i.prioridade === "alta" ? "Alta prioridade" : i.prioridade === "media" ? "Atenção" : "Insight";
              return (
                <div key={i.id} className="rounded-xl border border-border bg-surface-2 p-4 transition hover:border-primary/40">
                  <div className="mb-2 flex items-center justify-between">
                    <StatusPill tone={tone as any}>{label}</StatusPill>
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <h4 className="text-sm font-semibold leading-snug">{i.titulo}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{i.conteudo}</p>
                  <Link to="/insights" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-1.5 transition-all">
                    Abrir <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
      )}

      {/* Pipeline resumido + atividades */}
      {(visible.pipeline || visible.atividade) && (
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {visible.pipeline && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">Pipeline comercial</h3>
              <p className="text-xs text-muted-foreground">Distribuição de leads por etapa</p>
            </div>
            <Link to="/pipeline" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Abrir Kanban <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3 p-6">
            {stageCounts.map((s) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="w-32 text-xs font-medium text-muted-foreground">{s.label}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-surface-1">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${(s.count / maxStage) * 100}%`,
                      background: `linear-gradient(90deg, ${s.color} 0%, ${s.color} 60%, transparent 140%)`,
                      opacity: 0.85,
                    }}
                  />
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold">
                    {s.count} {s.count === 1 ? "lead" : "leads"}
                  </span>
                </div>
                <div className="w-24 text-right text-xs font-semibold tabular-nums">{formatBRL(s.value)}</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {visible.atividade && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="text-base font-semibold">Atividade recente</h3>
            <span className="text-xs text-muted-foreground">{topActivities.length}</span>
          </div>
          {activities.isLoading ? (
            <ListSkeleton rows={5} />
          ) : topActivities.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {topActivities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.tipo] ?? Sparkles;
                const iconBg = a.tipo === "movimentacao" ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground";
                return (
                  <li key={a.id} className="flex gap-3 px-6 py-3.5">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconBg}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{a.descricao}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="capitalize">{a.tipo}</span>·<span>{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        )}
      </div>
      )}
    </AppShell>
  );
}
