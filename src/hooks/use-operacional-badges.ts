import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId } from "@/contexts/tenant-context";

/**
 * Lightweight counters used as badges on the Operacional dock entry.
 * - tasksOverdue: tasks whose `prazo` is in the past and aren't done/cancelled.
 * - projectsAtRisk: active projects past their `prazo` or with progresso < 30 and prazo within 7 days.
 */
export function useOperacionalBadges() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["operacional-badges", tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const in7 = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

      const [{ count: overdue }, { data: projects }] = await Promise.all([
        (supabase as any)
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .lt("prazo", now)
          .not("status", "in", "(concluida,cancelada)"),
        (supabase as any)
          .from("projects")
          .select("id, status, prazo, progresso")
          .eq("tenant_id", tenantId!)
          .not("status", "in", "(concluido,cancelado)"),
      ]);

      const atRisk = (projects ?? []).filter((p: any) => {
        if (!p.prazo) return false;
        if (p.prazo < now) return true;
        if (p.prazo < in7 && Number(p.progresso ?? 0) < 30) return true;
        return false;
      }).length;

      return { tasksOverdue: Number(overdue ?? 0), projectsAtRisk: atRisk };
    },
  });
}
