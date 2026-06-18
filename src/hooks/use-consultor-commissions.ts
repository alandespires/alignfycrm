import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type CommissionStatus = "pendente" | "aprovada" | "paga" | "cancelada";

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  pendente: "Prevista",
  aprovada: "Aprovada (financeiro)",
  paga: "Paga",
  cancelada: "Cancelada",
};

export type CommissionRow = {
  id: string;
  tenant_id: string;
  consultor_id: string | null;
  lead_id: string | null;
  quota_id: string | null;
  deal_id: string | null;
  descricao: string;
  base: number;
  percentual: number;
  valor: number;
  status: CommissionStatus;
  pagar_em: string | null;
  paga_em: string | null;
  financial_entry_id: string | null;
  observacoes: string | null;
  created_at: string;
};

export function useCommissions() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["commissions", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<CommissionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("consultor_commissions").select("*")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommissionRow[];
    },
  });
}

export function useCreateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CommissionRow> & { descricao: string; base: number; percentual: number }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      const valor = input.valor ?? Math.round(input.base * (input.percentual / 100) * 100) / 100;
      const { data, error } = await (supabase as any).from("consultor_commissions").insert({
        ...input, valor, tenant_id, created_by: u.user?.id, consultor_id: input.consultor_id ?? u.user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Comissão registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useUpdateCommissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: CommissionStatus; paga_em?: string }) => {
      const patch: any = { status: input.status };
      if (input.status === "paga" && !input.paga_em) patch.paga_em = new Date().toISOString().slice(0, 10);
      if (input.paga_em) patch.paga_em = input.paga_em;
      const { error } = await (supabase as any).from("consultor_commissions").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
