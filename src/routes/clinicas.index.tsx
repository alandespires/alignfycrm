import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useClinicDashboard } from "@/hooks/use-clinic";
import { Users, CalendarCheck2, AlertTriangle, DollarSign, Activity, UserCheck } from "@/components/ui/icons";
import { StatusPill } from "@/components/app-shell";

export const Route = createFileRoute("/clinicas/")({
  head: () => pageHead("Clinicas · Index"),
  component: ClinicDashboardPage,
});

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ClinicDashboardPage() {
  const { data, isLoading } = useClinicDashboard();

  if (isLoading || !data) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-2" />)}</div>;
  }

  const cards = [
    { label: "Agendamentos hoje", value: data.hojeCount.toString(), icon: CalendarCheck2, accent: "text-primary" },
    { label: "Pacientes ativos", value: data.pacientesAtivos.toString(), icon: Users, accent: "text-success" },
    { label: "Faturamento do mês", value: fmtBRL(data.mesFaturamento), icon: DollarSign, accent: "text-success" },
    { label: "Ticket médio", value: fmtBRL(data.ticketMedio), icon: Activity, accent: "text-primary" },
    { label: "Atendimentos realizados (mês)", value: data.mesRealizados.toString(), icon: UserCheck, accent: "text-success" },
    { label: "Taxa de faltas", value: `${data.taxaFaltas.toFixed(1)}%`, icon: AlertTriangle, accent: data.taxaFaltas > 15 ? "text-destructive" : "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface-1 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.accent}`} />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface-1 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Agenda de hoje</h3>
            <p className="text-xs text-muted-foreground">Acompanhe os atendimentos do dia em tempo real</p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {data.hojeAgendamentos.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje.</div>
          ) : (
            data.hojeAgendamentos.map((a: any) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-16 text-sm font-mono font-semibold text-primary">
                  {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.patient?.nome ?? "—"}</div>
                </div>
                <StatusPill tone={a.status === "realizado" ? "success" : a.status === "faltou" ? "danger" : a.status === "confirmado" ? "info" : "neutral"}>
                  {a.status}
                </StatusPill>
                <div className="w-24 text-right text-sm font-semibold">{a.valor ? fmtBRL(Number(a.valor)) : "—"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
