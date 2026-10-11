import { Link } from "@tanstack/react-router";
import { Users, Building2, Target, Kanban } from "@/components/ui/icons";
import { useLeads } from "@/hooks/use-leads";
import { useClients } from "@/hooks/use-clients";
import { useDeals } from "@/hooks/use-deals";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/mock-data";

export function CrmMetrics() {
  const leads = useLeads();
  const clients = useClients();
  const deals = useDeals();
  const pipeline = (leads.data ?? []).filter(l => l.status !== "fechado" && l.status !== "perdido").reduce((sum, l) => sum + Number(l.valor_estimado ?? 0), 0);
  const metrics = [
    { label: "Leads", to: "/leads", icon: Users, value: String(leads.data?.length ?? 0), pending: leads.isPending },
    { label: "Clientes", to: "/clientes", icon: Building2, value: String(clients.data?.length ?? 0), pending: clients.isPending },
    { label: "Oportunidades", to: "/oportunidades", icon: Target, value: String((deals.data ?? []).filter(d => d.stage !== "fechado" && d.stage !== "perdido").length), pending: deals.isPending },
    { label: "Valor em pipeline", to: "/pipeline", icon: Kanban, value: formatBRL(pipeline), pending: leads.isPending },
  ] as const;
  return (
    <nav aria-label="Métricas comerciais" className="grid grid-cols-2 border-b border-border md:grid-cols-4">
      {metrics.map(({ label, to, icon: Icon, value, pending }) => (
        <Link key={to} to={to} className="flex min-h-16 min-w-0 items-center gap-2 border-border px-3 py-2 transition-colors hover:bg-muted/50 md:border-l md:px-4 first:md:border-l-0">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="truncate text-[11px] text-muted-foreground">{label}</div>
            {pending ? <Skeleton className="mt-1 h-5 w-16" /> : <div className="break-words text-sm font-semibold tabular-nums">{value}</div>}
          </div>
        </Link>
      ))}
    </nav>
  );
}