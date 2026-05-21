import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Stethoscope, LayoutDashboard, Users, CalendarDays, FileText, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/clinicas")({
  component: ClinicasLayout,
});

const SUB: Array<{ to: string; label: string; icon: any; exact?: boolean }> = [
  { to: "/clinicas", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/clinicas/pacientes", label: "Pacientes", icon: Users },
  { to: "/clinicas/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/clinicas/prontuarios", label: "Prontuários", icon: FileText },
  { to: "/clinicas/configuracoes", label: "Configurações", icon: Settings2 },
];

function ClinicasLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AppShell
      title="Align Clínicas"
      subtitle="Gestão clínica completa — pacientes, agenda, prontuário e operação."
      action={
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Stethoscope className="h-3.5 w-3.5" />
          Módulo Odontológico
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-1 p-1.5">
        {SUB.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to as any}
              className={[
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-surface-3 text-foreground shadow-card"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
            >
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
