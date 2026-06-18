import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuotas } from "@/hooks/use-consortium-quotas";
import { useCommissions } from "@/hooks/use-consultor-commissions";
import { useSimulations } from "@/hooks/use-consortium-simulations";
import { Award, ListChecks, Wallet, Calculator, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/consultor/")({
  component: ConsultorIndex,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ConsultorIndex() {
  const { data: quotas = [] } = useQuotas();
  const { data: commissions = [] } = useCommissions();
  const { data: sims = [] } = useSimulations();

  const kpis = useMemo(() => {
    const ativas = quotas.filter(q => q.status === "ativa");
    const contempladasMes = quotas.filter(q => q.contemplada_em && new Date(q.contemplada_em).getMonth() === new Date().getMonth());
    const atrasadas = quotas.filter(q => q.status === "atrasada");
    const totalCarteira = ativas.reduce((s, q) => s + Number(q.valor_credito || 0), 0);
    const comPrevista = commissions.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor || 0), 0);
    const comPaga = commissions.filter(c => c.status === "paga").reduce((s, c) => s + Number(c.valor || 0), 0);
    const conv = sims.length ? Math.round((quotas.filter(q => q.status !== "cancelada").length / sims.length) * 100) : 0;
    return { ativas, contempladasMes, atrasadas, totalCarteira, comPrevista, comPaga, conv };
  }, [quotas, commissions, sims]);

  const cards = [
    { label: "Cotas ativas", value: kpis.ativas.length, icon: ListChecks, accent: "text-primary" },
    { label: "Contempladas este mês", value: kpis.contempladasMes.length, icon: Award, accent: "text-emerald-500" },
    { label: "Carteira ativa", value: BRL(kpis.totalCarteira), icon: TrendingUp, accent: "text-blue-500" },
    { label: "Cotas em atraso", value: kpis.atrasadas.length, icon: AlertTriangle, accent: "text-rose-500" },
    { label: "Comissão prevista", value: BRL(kpis.comPrevista), icon: Wallet, accent: "text-amber-500" },
    { label: "Comissão paga", value: BRL(kpis.comPaga), icon: Wallet, accent: "text-emerald-500" },
    { label: "Simulações", value: sims.length, icon: Calculator, accent: "text-violet-500" },
    { label: "Conversão sim→cota", value: `${kpis.conv}%`, icon: TrendingUp, accent: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-3 text-sm font-semibold">Próximas contemplações possíveis</h3>
          {kpis.ativas.slice(0, 5).map(q => (
            <div key={q.id} className="flex items-center justify-between border-t border-border py-2 first:border-0">
              <div>
                <div className="text-sm font-medium">Cota {q.numero_cota ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{BRL(q.valor_credito)} · parc. {q.parcela_atual}/{q.parcela_total}</div>
              </div>
              <Link to="/consultor/cotas" className="text-xs font-semibold text-primary">Ver</Link>
            </div>
          ))}
          {!kpis.ativas.length && <p className="text-xs text-muted-foreground">Sem cotas ativas ainda.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-3 text-sm font-semibold">Comissões a liberar</h3>
          {commissions.filter(c => c.status === "pendente").slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between border-t border-border py-2 first:border-0">
              <div>
                <div className="text-sm font-medium">{c.descricao}</div>
                <div className="text-xs text-muted-foreground">{c.percentual}% sobre {BRL(c.base)}</div>
              </div>
              <span className="text-sm font-semibold text-emerald-500">{BRL(c.valor)}</span>
            </div>
          ))}
          {!commissions.filter(c => c.status === "pendente").length && (
            <p className="text-xs text-muted-foreground">Nenhuma comissão prevista.</p>
          )}
        </div>
      </div>
    </div>
  );
}
