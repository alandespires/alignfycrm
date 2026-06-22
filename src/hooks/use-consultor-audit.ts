import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId } from "@/contexts/tenant-context";

export type AuditEntityType =
  | "consortium_quotas"
  | "consortium_simulations"
  | "consortium_contemplations"
  | "consultor_commissions";

export type AuditAction = "create" | "update" | "delete";

export type AuditLogRow = {
  id: string;
  tenant_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  actor_id: string | null;
  administrator_id: string | null;
  quota_id: string | null;
  diff: any;
  created_at: string;
};

export const ENTITY_LABEL: Record<AuditEntityType, string> = {
  consortium_quotas: "Cota",
  consortium_simulations: "Simulação",
  consortium_contemplations: "Contemplação",
  consultor_commissions: "Comissão",
};

export const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Criado",
  update: "Alterado",
  delete: "Excluído",
};

export function useConsultorAudit(opts?: {
  entityType?: AuditEntityType;
  entityId?: string;
  administratorId?: string;
  quotaId?: string;
  since?: string;
  until?: string;
  limit?: number;
}) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["consultor-audit", tenantId, opts ?? {}],
    enabled: !!tenantId,
    queryFn: async (): Promise<AuditLogRow[]> => {
      let q: any = (supabase as any)
        .from("consultor_audit_logs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(opts?.limit ?? 200);
      if (opts?.entityType) q = q.eq("entity_type", opts.entityType);
      if (opts?.entityId) q = q.eq("entity_id", opts.entityId);
      if (opts?.administratorId) q = q.eq("administrator_id", opts.administratorId);
      if (opts?.quotaId) q = q.eq("quota_id", opts.quotaId);
      if (opts?.since) q = q.gte("created_at", opts.since);
      if (opts?.until) q = q.lte("created_at", opts.until);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditLogRow[];
    },
  });
}
