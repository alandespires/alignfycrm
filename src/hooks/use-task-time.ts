import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TaskTimeEntry = {
  id: string;
  tenant_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duracao_min: number | null;
  descricao: string | null;
  billable: boolean;
  created_at: string;
};

export function useTaskTimeEntries(taskId?: string) {
  return useQuery({
    queryKey: ["task-time", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskTimeEntry[]> => {
      const { data, error } = await (supabase as any)
        .from("task_time_entries").select("*").eq("task_id", taskId!).order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TaskTimeEntry[];
    },
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; descricao?: string; billable?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("task_time_entries").insert({
        tenant_id,
        task_id: input.task_id,
        user_id: u.user.id,
        started_at: new Date().toISOString(),
        descricao: input.descricao ?? null,
        billable: input.billable ?? false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["task-time", v.task_id] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao iniciar timer"),
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const ended = new Date().toISOString();
      const { data: row } = await (supabase as any).from("task_time_entries").select("started_at").eq("id", id).single();
      const startMs = row ? new Date(row.started_at).getTime() : Date.now();
      const duracao_min = Math.max(0, (Date.now() - startMs) / 60000);
      const { error } = await (supabase as any).from("task_time_entries").update({ ended_at: ended, duracao_min }).eq("id", id);
      if (error) throw error;
      // Update task total horas_realizadas
      const { data: all } = await (supabase as any).from("task_time_entries").select("duracao_min").eq("task_id", task_id);
      const total = (all ?? []).reduce((s: number, x: any) => s + Number(x.duracao_min ?? 0), 0) / 60;
      await (supabase as any).from("tasks").update({ horas_realizadas: Number(total.toFixed(2)) }).eq("id", task_id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["task-time", v.task_id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useAddManualTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; minutos: number; descricao?: string; billable?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const now = new Date();
      const start = new Date(now.getTime() - input.minutos * 60000);
      const { error } = await (supabase as any).from("task_time_entries").insert({
        tenant_id, task_id: input.task_id, user_id: u.user.id,
        started_at: start.toISOString(), ended_at: now.toISOString(),
        duracao_min: input.minutos, descricao: input.descricao ?? null,
        billable: input.billable ?? false,
      });
      if (error) throw error;
      const { data: all } = await (supabase as any).from("task_time_entries").select("duracao_min").eq("task_id", input.task_id);
      const total = (all ?? []).reduce((s: number, x: any) => s + Number(x.duracao_min ?? 0), 0) / 60;
      await (supabase as any).from("tasks").update({ horas_realizadas: Number(total.toFixed(2)) }).eq("id", input.task_id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["task-time", v.task_id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      await (supabase as any).from("task_time_entries").delete().eq("id", id);
      const { data: all } = await (supabase as any).from("task_time_entries").select("duracao_min").eq("task_id", task_id);
      const total = (all ?? []).reduce((s: number, x: any) => s + Number(x.duracao_min ?? 0), 0) / 60;
      await (supabase as any).from("tasks").update({ horas_realizadas: Number(total.toFixed(2)) }).eq("id", task_id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["task-time", v.task_id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
