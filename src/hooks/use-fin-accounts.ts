import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type FinAccount = {
  id: string; tenant_id: string; nome: string; tipo: string;
  banco: string | null; agencia: string | null; conta: string | null;
  saldo_inicial: number; cor: string | null; ativo: boolean;
  observacoes: string | null;
  created_at: string; updated_at: string;
};

const t = () => getActiveTenantId();

export function useFinAccounts() {
  const tid = t();
  return useQuery({
    queryKey: ["fin-accounts", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_accounts" as any)
        .select("*").eq("tenant_id", tid!).order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as FinAccount[];
    },
  });
}
export function useSaveFinAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinAccount> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("financial_accounts" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financial_accounts" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-accounts"] }); toast.success("Conta salva"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteFinAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-accounts"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
