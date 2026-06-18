import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calculator, ListChecks, Wallet, TrendingUp, Briefcase, Landmark, Award } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/consultor")({
  head: () => ({ meta: [{ title: "Consultor — Align CRM" }] }),
  component: ConsultorLayout,
});

const SUB = [
  { to: "/consultor", label: "Painel", icon: TrendingUp, exact: true },
  { to: "/consultor/simulador", label: "Simulador", icon: Calculator },
  { to: "/consultor/cotas", label: "Cotas", icon: ListChecks },
  { to: "/consultor/contemplacoes", label: "Contemplações", icon: Award },
  { to: "/consultor/comissoes", label: "Comissões", icon: Wallet },
  { to: "/consultor/credito", label: "Crédito", icon: Landmark },
];

function ConsultorLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell
      title="Consultor"
      subtitle="Consórcios, crédito e comissões — ferramentas para o consultor financeiro."
      action={
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Briefcase className="h-3.5 w-3.5" /> Módulo Consultor
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-1 p-1.5">
        {SUB.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to) && (to !== "/consultor" || pathname === "/consultor");
          return (
            <Link key={to} to={to as any} className={[
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
              active ? "bg-surface-3 text-foreground shadow-card" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}>
              <Icon className={["h-4 w-4", active ? "text-primary" : ""].join(" ")} />
              {label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </AppShell>
  );
}
