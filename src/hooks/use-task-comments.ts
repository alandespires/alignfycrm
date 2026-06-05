import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TaskComment = {
  id: string;
  tenant_id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
};

export function useTaskComments(taskId?: string) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await (supabase as any)
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskComment[];
    },
  });
}

export function useCreateTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; content: string; mentions?: string[] }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("task_comments").insert({
        tenant_id,
        task_id: input.task_id,
        user_id: u.user.id,
        content: input.content.trim(),
        mentions: input.mentions ?? [],
      }).select().single();
      if (error) throw error;
      return data as TaskComment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["task-comments", vars.task_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao comentar"),
  });
}

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; task_id: string }) => {
      const { error } = await (supabase as any).from("task_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["task-comments", vars.task_id] }),
  });
}
