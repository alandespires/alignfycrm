import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type StageTaskTemplate = {
  titulo: string;
  descricao?: string;
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  prazo_dias?: number;
  checklist?: { texto: string }[];
};

export type PipelineStageAutomation = {
  id: string;
  tenant_id: string;
  nome: string;
  stage: string;
  ativo: boolean;
  tarefas: StageTaskTemplate[];
  notificar: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function usePipelineStageAutomations() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["pipeline-stage-automations", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<PipelineStageAutomation[]> => {
      const { data, error } = await (supabase as any).from("pipeline_stage_automations")
        .select("*").eq("tenant_id", tenantId!).order("stage");
      if (error) throw error;
      return (data ?? []) as PipelineStageAutomation[];
    },
  });
}

export function useCreatePipelineAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PipelineStageAutomation> & { nome: string; stage: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("pipeline_stage_automations").insert({
        tenant_id, created_by: u.user.id,
        nome: input.nome, stage: input.stage,
        ativo: input.ativo ?? true,
        tarefas: input.tarefas ?? [],
        notificar: input.notificar ?? true,
      }).select().single();
      if (error) throw error;
      return data as PipelineStageAutomation;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-stage-automations"] }); toast.success("Automação criada"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useUpdatePipelineAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PipelineStageAutomation> & { id: string }) => {
      const { error } = await (supabase as any).from("pipeline_stage_automations").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-stage-automations"] }),
  });
}

export function useDeletePipelineAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pipeline_stage_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipeline-stage-automations"] }); toast.success("Automação removida"); },
  });
}
