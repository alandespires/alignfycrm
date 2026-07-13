import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type AutomationTrigger = "lead_criado" | "status_mudou" | "score_alto" | "score_baixou";

export type AutomationAction =
  | { tipo: "criar_tarefa"; titulo: string; descricao?: string; prioridade?: "baixa" | "media" | "alta" | "urgente"; prazo_dias?: number }
  | { tipo: "registrar_atividade"; descricao: string; tipo_atividade?: "ligacao" | "email" | "whatsapp" | "reuniao" | "nota" };

export type AutomationRow = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  trigger_tipo: AutomationTrigger;
  trigger_valor: string | null;
  acoes: AutomationAction[];
  execucoes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useAutomations() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["automations", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<AutomationRow[]> => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AutomationRow, "id" | "execucoes" | "created_by" | "created_at" | "updated_at">) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { error } = await supabase.from("automations").insert({
        ...input,
        tenant_id,
        acoes: input.acoes as any,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); toast.success("Automação criada"); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("automations").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export type AutomationRun = {
  id: string;
  tenant_id: string;
  automation_id: string;
  lead_id: string | null;
  resultado: any;
  status: "sucesso" | "erro";
  erro: string | null;
  created_at: string;
};

export function useAutomationRuns(automationId?: string | null) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["automation_runs", tenantId, automationId ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<AutomationRun[]> => {
      let q = supabase
        .from("automation_runs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (automationId) q = q.eq("automation_id", automationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

