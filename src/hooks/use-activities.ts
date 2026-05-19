import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type ActivityType = "ligacao" | "email" | "whatsapp" | "reuniao" | "nota" | "movimentacao" | "tarefa";

export type ActivityRow = {
  id: string;
  tipo: ActivityType;
  descricao: string;
  lead_id: string | null;
  client_id: string | null;
  user_id: string;
  metadata: any;
  created_at: string;
};

export function useAllActivities(limit = 200) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["activities", tenantId, "all", limit],
    enabled: !!tenantId,
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
}

export function useLeadActivities(leadId: string | null) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["activities", tenantId, "lead", leadId],
    enabled: !!leadId && !!tenantId,
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tipo: ActivityType; descricao: string; lead_id?: string; client_id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { error } = await supabase.from("activities").insert({
        ...input,
        tenant_id,
        user_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Atividade registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });
}
