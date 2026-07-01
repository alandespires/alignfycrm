import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type Goal = {
  id: string; tenant_id: string; nome: string; descricao: string | null;
  categoria: string | null; prioridade: string; status: string;
  department_id: string | null; owner_id: string | null;
  progresso: number; meta_valor: number | null; valor_atual: number | null;
  data_inicio: string | null; prazo: string | null;
  created_at: string; updated_at: string;
};

const t = () => getActiveTenantId();

export function useGoals() {
  const tid = t();
  return useQuery({
    queryKey: ["goals", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("goals" as any)
        .select("*").eq("tenant_id", tid!).order("prazo", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Goal[];
    },
  });
}
export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Goal> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("goals" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("goals" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id, owner_id: input.owner_id ?? u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Meta salva"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
