import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import { Loader2, TrendingUp, Target, DollarSign, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiSkeleton } from "@/components/skeletons";
import { useLeads } from "@/hooks/use-leads";
import { useDeals, useRevenueSeries } from "@/hooks/use-dashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Align CRM" }] }),
  component: RelatoriosPage,
});

const STAGES: { id: string; label: string; color: string }[] = [
  { id: "novo", label: "Novo", color: "oklch(0.65 0.02 250)" },
  { id: "contato_inicial", label: "Contato", color: "oklch(0.7 0.12 220)" },
  { id: "qualificacao", label: "Qualif.", color: "oklch(0.72 0.14 180)" },
  { id: "proposta", label: "Proposta", color: "oklch(0.78 0.16 80)" },
  { id: "negociacao", label: "Negoc.", color: "oklch(0.685 0.175 45)" },
  { id: "fechado", label: "Fechado", color: "oklch(0.72 0.21 142)" },
];

function useSellersRanking() {
  return useQuery({
    queryKey: ["ranking-vendedores"],
    queryFn: async () => {
      const [{ data: deals }, { data: profiles }] = await Promise.all([
        supabase.from("deals").select("owner_id, valor, stage"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      const map = new Map<string, { name: string; fechados: number; valor: number }>();
      (profiles ?? []).forEach((p: any) =>
        map.set(p.id, { name: p.full_name || p.email, fechados: 0, valor: 0 }),
      );
      (deals ?? []).forEach((d: any) => {
        if (!d.owner_id) return;
        const cur = map.get(d.owner_id) ?? { name: "—", fechados: 0, valor: 0 };
        if (d.stage === "fechado") {
          cur.fechados += 1;
          cur.valor += Number(d.valor ?? 0);
        }
        map.set(d.owner_id, cur);
      });
      return Array.from(map.values())
        .filter((v) => v.fechados > 0 || v.valor > 0)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 8);
    },
  });
}

function KpiTile({ label, value, icon: Icon, hint }: { label: string; value: string; icon: any; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RelatoriosPage() {
  const leads = useLeads();
  const deals = useDeals();
  const revenue = useRevenueSeries();
  const ranking = useSellersRanking();

  const leadList = leads.data ?? [];
  const dealList = deals.data ?? [];

  // Funil
  const funnel = useMemo(
    () =>
      STAGES.map((s) => ({
        name: s.label,
        leads: leadList.filter((l) => l.status === s.id).length,
        color: s.color,
      })),
    [leadList],
  );

  // Métricas
  const fechados = leadList.filter((l) => l.status === "fechado").length;
  const perdidos = leadList.filter((l) => l.status === "perdido").length;
  const total = leadList.length;
  const taxa = total > 0 ? Math.round((fechados / total) * 100) : 0;
  const receitaFechada = dealList
    .filter((d) => d.stage === "fechado")
    .reduce((a, d) => a + Number(d.valor ?? 0), 0);
  const ticket = fechados > 0 ? Math.round(receitaFechada / fechados) : 0;
  const pipeline = leadList
    .filter((l) => l.status !== "fechado" && l.status !== "perdido")
    .reduce((a, l) => a + Number(l.valor_estimado ?? 0), 0);

  const isLoading = leads.isLoading || deals.isLoading;

  return (
    <AppShell title="Relatórios" subtitle="Performance comercial em tempo real">
      {isLoading ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Taxa de fechamento" value={`${taxa}%`} icon={Target} hint={`${fechados} fechados / ${perdidos} perdidos`} />
          <KpiTile label="Receita fechada" value={formatBRL(receitaFechada)} icon={DollarSign} />
          <KpiTile label="Pipeline em aberto" value={formatBRL(pipeline)} icon={TrendingUp} />
          <KpiTile label="Ticket médio" value={formatBRL(ticket)} icon={Trophy} />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Funil */}
        <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <h3 className="text-base font-semibold">Funil de conversão</h3>
          <p className="text-xs text-muted-foreground">Volume de leads por estágio</p>
          <div className="mt-4 h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />            
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis type="number" stroke="oklch(0.55 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.27 0 0)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                    {funnel.map((f, i) => (
                      <Bar key={i} dataKey="leads" fill={f.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Receita mensal */}
        <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <h3 className="text-base font-semibold">Receita mensal</h3>
          <p className="text-xs text-muted-foreground">Previsto vs. fechado (últimos 7 meses, R$ mil)</p>
          <div className="mt-4 h-72">
            {revenue.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />            
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.data ?? []}>
                  <defs>
                    <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.685 0.175 45)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.685 0.175 45)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.21 142)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.72 0.21 142)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.27 0 0)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `R$ ${v}k`} />
                  <Area type="monotone" dataKey="previsto" stroke="oklch(0.685 0.175 45)" strokeWidth={2.5} fill="url(#rg1)" />
                  <Area type="monotone" dataKey="fechado" stroke="oklch(0.72 0.21 142)" strokeWidth={2.5} fill="url(#rg2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Taxa de fechamento por mês (linha) */}
        <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <h3 className="text-base font-semibold">Conversão prevista vs. fechada</h3>
          <p className="text-xs text-muted-foreground">Acompanhamento do desempenho mensal</p>
          <div className="mt-4 h-64">
            {revenue.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(revenue.data ?? []).map((r) => ({
                  month: r.month,
                  taxa: r.previsto > 0 ? Math.round((r.fechado / r.previsto) * 100) : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.27 0 0)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="taxa" stroke="oklch(0.72 0.21 142)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Ranking de vendedores */}
        <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
          <h3 className="text-base font-semibold">Ranking de vendedores</h3>
          <p className="text-xs text-muted-foreground">Top fechadores por receita</p>
          <div className="mt-4">
            {ranking.isLoading ? (
              <ul className="space-y-2">
                {[0,1,2,3].map((i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </li>
                ))}
              </ul>
            ) : (ranking.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Nenhum negócio fechado ainda.
              </div>
            ) : (
              <ul className="space-y-2">
                {(ranking.data ?? []).map((r, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-md text-xs font-bold ${
                      i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-surface-3 text-foreground" : i === 2 ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground"
                    }`}>{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.fechados} {r.fechados === 1 ? "fechamento" : "fechamentos"}</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-success">{formatBRL(r.valor)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
