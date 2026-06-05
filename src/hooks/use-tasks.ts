import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TaskPriority = "baixa" | "media" | "alta" | "urgente";
export type TaskStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";

export type ChecklistItem = { id: string; texto: string; feito: boolean };

export type TaskRow = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  prazo: string | null;
  concluida_em: string | null;
  lead_id: string | null;
  client_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  assignee_id: string | null;
  assignees: string[];
  watchers: string[];
  checklist: ChecklistItem[];
  dependencies: string[];
  horas_estimadas: number | null;
  horas_realizadas: number;
  progresso: number;
  ordem: number;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useTasks(opts?: { leadId?: string; projectId?: string }) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["tasks", tenantId, opts?.leadId ?? "all", opts?.projectId ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<TaskRow[]> => {
      let q: any = (supabase as any).from("tasks").select("*").eq("tenant_id", tenantId!).order("prazo", { ascending: true, nullsFirst: false });
      if (opts?.leadId) q = q.eq("lead_id", opts.leadId);
      if (opts?.projectId) q = q.eq("project_id", opts.projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

export function useSubtasks(parentId?: string) {
  return useQuery({
    queryKey: ["subtasks", parentId],
    enabled: !!parentId,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await (supabase as any).from("tasks").select("*")
        .eq("parent_task_id", parentId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string; descricao?: string; prioridade?: TaskPriority;
      prazo?: string | null; lead_id?: string | null; client_id?: string | null;
      project_id?: string | null; parent_task_id?: string | null;
      assignees?: string[]; watchers?: string[];
      checklist?: ChecklistItem[]; horas_estimadas?: number | null;
      tags?: string[];
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("tasks").insert({
        ...input,
        tenant_id,
        created_by: u.user.id,
        assignee_id: u.user.id,
        prioridade: input.prioridade ?? "media",
        status: "pendente" as const,
      }).select().single();
      if (error) throw error;
      return data as TaskRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["subtasks"] });
      toast.success("Tarefa criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar tarefa"),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<TaskRow> & { id: string }) => {
      const { error } = await (supabase as any).from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueriesData<TaskRow[]>({ queryKey: ["tasks"] });
      prev.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<TaskRow[]>(key, data.map((t) => t.id === id ? { ...t, ...patch } as TaskRow : t));
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["subtasks"] });
    },
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await (supabase as any).from("tasks").update({
        status: done ? "concluida" : "pendente",
        concluida_em: done ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueriesData<TaskRow[]>({ queryKey: ["tasks"] });
      prev.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<TaskRow[]>(key, data.map((t) => t.id === id
          ? { ...t, status: done ? "concluida" : "pendente", concluida_em: done ? new Date().toISOString() : null }
          : t));
      });
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message ?? "Erro ao atualizar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};
