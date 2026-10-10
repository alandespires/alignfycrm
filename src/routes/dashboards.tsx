import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuotas, useContemplations } from "@/hooks/use-consortium-quotas";
import { useCommissions } from "@/hooks/use-consultor-commissions";
import { useSimulations } from "@/hooks/use-consortium-simulations";
import { useCreditSimulations } from "@/hooks/use-credit";
import { LineChart, Award, Wallet, Calculator, TrendingUp, AlertTriangle, Landmark, ArrowRight } from "@/components/ui/icons";

export const Route = createFileRoute("/dashboards")({
  head: () => pageHead("Dashboards"),
  component: DashboardsPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DashboardsPage() {
  const { data: quotas = [] } = useQuotas();
  const { data: contemplations = [] } = useContemplations();
  const { data: commissions = [] } = useCommissions();
  const { data: simulations = [] } = useSimulations();
  const { data: creditSims = [] } = useCreditSimulations();

  const consultor = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(now.getTime() - 30 * 86400000);

    const simPendentes = simulations.filter(s => !quotas.some(q => q.lead_id && q.lead_id === s.lead_id)).length;
    const contempladasRecentes = (contemplations as any[]).filter(c => new Date(c.data) >= last30);
    const comissoesPrevistas = commissions.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor || 0), 0);
    const comissoesLiberar = commissions.filter(c => c.status === "aprovada").reduce((s, c) => s + Number(c.valor || 0), 0);
    const creditoDisponivel = creditSims.filter(c => new Date(c.created_at) >= monthStart).reduce((s, c) => s + Number(c.valor_solicitado || 0), 0);
    const carteira = quotas.filter(q => q.status === "ativa").reduce((s, q) => s + Number(q.valor_credito || 0), 0);

    return { simPendentes, contempladasRecentes, comissoesPrevistas, comissoesLiberar, creditoDisponivel, carteira };
  }, [quotas, contemplations, commissions, simulations, creditSims]);

  const cards = [
    { label: "Simulações pendentes", value: String(consultor.simPendentes), icon: Calculator, tone: "text-violet-500", to: "/consultor/simulador" },
    { label: "Contemplações (30d)", value: String(consultor.contempladasRecentes.length), icon: Award, tone: "text-emerald-500", to: "/consultor/contemplacoes" },
    { label: "Comissões previstas", value: BRL(consultor.comissoesPrevistas), icon: Wallet, tone: "text-amber-500", to: "/consultor/comissoes" },
    { label: "A liberar (aprovadas)", value: BRL(consultor.comissoesLiberar), icon: Wallet, tone: "text-blue-500", to: "/consultor/comissoes" },
    { label: "Crédito simulado (mês)", value: BRL(consultor.creditoDisponivel), icon: Landmark, tone: "text-primary", to: "/consultor/credito" },
    { label: "Carteira ativa", value: BRL(consultor.carteira), icon: TrendingUp, tone: "text-emerald-500", to: "/consultor/cotas" },
  ];

  return (
    <AppShell
      title="Dashboards"
      subtitle="Visão executiva multi-módulo — Consultor, Comercial e Operacional"
      action={
        <Link to="/consultor" className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          Módulo Consultor <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="mb-8">
        <header className="mb-3 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Consultor — Consórcios & Crédito</h2>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {cards.map(({ label, value, icon: Icon, tone, to }) => (
            <Link key={label} to={to as any} className="group rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:border-primary/40 hover:shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Abrir <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Award className="h-4 w-4 text-emerald-500" /> Contemplações recentes
          </h3>
          {consultor.contempladasRecentes.slice(0, 5).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border-t border-border py-2 first:border-0">
              <div className="text-sm">{String(c.tipo).replace("_", " ")}</div>
              <div className="text-xs text-muted-foreground">{new Date(c.data).toLocaleDateString("pt-BR")}</div>
            </div>
          ))}
          {!consultor.contempladasRecentes.length && (
            <p className="text-xs text-muted-foreground">Sem contemplações nos últimos 30 dias.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Comissões a liberar
          </h3>
          {commissions.filter(c => c.status === "aprovada").slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between border-t border-border py-2 first:border-0">
              <div className="text-sm">{c.descricao}</div>
              <div className="text-sm font-semibold text-emerald-500">{BRL(Number(c.valor))}</div>
            </div>
          ))}
          {!commissions.filter(c => c.status === "aprovada").length && (
            <p className="text-xs text-muted-foreground">Nenhuma comissão aguardando liberação.</p>
          )}
        </div>
      </section>

      <section>
        <header className="mb-3 flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Outros painéis</h2>
        </header>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Diretoria Comercial", sub: "Visão executiva", meta: "Hoje" },
            { title: "Pipeline por SDR", sub: "Pré-vendas · 8 widgets", meta: "Hoje" },
            { title: "Performance de Marketing", sub: "CAC · LTV · ROI", meta: "Semanal" },
            { title: "Saúde da base", sub: "Churn risk · NPS", meta: "Mensal" },
          ].map(d => (
            <div key={d.title} className="rounded-2xl border border-border bg-surface-1 p-4">
              <div className="text-sm font-semibold">{d.title}</div>
              <div className="text-xs text-muted-foreground">{d.sub}</div>
              <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{d.meta}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
