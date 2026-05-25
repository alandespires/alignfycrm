import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { TaskPriority } from "@/hooks/use-tasks";

export type ProjectStatus = "planejado" | "em_andamento" | "pausado" | "concluido" | "cancelado";

export type ProjectStage = { id: string; titulo: string; concluida: boolean };
export type ProjectDeliverable = { id: string; titulo: string; entregue: boolean; data?: string | null };

export type ProjectRow = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  status: ProjectStatus;
  progresso: number;
  prioridade: TaskPriority;
  prazo: string | null;
  inicio: string | null;
  concluido_em: string | null;
  valor_total: number;
  client_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  etapas: ProjectStage[];
  entregas: ProjectDeliverable[];
  tags: string[] | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useProjects() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["projects", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectRow> & { titulo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload: any = {
        ...input,
        tenant_id,
        created_by: u.user.id,
        owner_id: input.owner_id ?? u.user.id,
      };
      const { data, error } = await (supabase as any).from("projects").insert(payload).select().single();
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Projeto criado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar projeto"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ProjectRow> & { id: string }) => {
      const { error } = await (supabase as any).from("projects").update(patch).eq("id", id);
      if (error) throw error;
      // Sincroniza cancelamento: entradas financeiras vinculadas viram "cancelado"
      // para sumirem dos relatórios e métricas.
      if (patch.status === "cancelado") {
        await (supabase as any)
          .from("financial_entries")
          .update({ status: "cancelado" })
          .eq("project_id", id)
          .neq("status", "cancelado");
      }
      // Conclusão fecha pendências de progresso
      if (patch.status === "concluido" && (patch.progresso === undefined)) {
        await (supabase as any).from("projects").update({ progresso: 100, concluido_em: new Date().toISOString() }).eq("id", id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      qc.invalidateQueries({ queryKey: ["fin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Projeto atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      toast.success("Projeto removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, "info" | "warn" | "muted" | "success" | "danger"> = {
  planejado: "info",
  em_andamento: "warn",
  pausado: "muted",
  concluido: "success",
  cancelado: "danger",
};
