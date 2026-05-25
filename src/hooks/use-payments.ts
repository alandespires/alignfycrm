import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { PaymentMethod } from "@/hooks/use-finance";

export type PaymentRow = {
  id: string;
  tenant_id: string;
  entry_id: string;
  valor: number;
  pago_em: string;
  forma_pagamento: PaymentMethod | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
};

export function useEntryPayments(entryId: string | null | undefined) {
  return useQuery({
    queryKey: ["fin-payments", entryId],
    enabled: !!entryId,
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await (supabase as any)
        .from("financial_payments")
        .select("*")
        .eq("entry_id", entryId!)
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });
}

export function useAllPayments() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["fin-payments-all", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await (supabase as any)
        .from("financial_payments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entry_id: string;
      valor: number;
      pago_em: string;
      forma_pagamento?: PaymentMethod | null;
      observacoes?: string | null;
    }) => {
      if (!Number.isFinite(input.valor) || input.valor <= 0) {
        throw new Error("Valor inválido");
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();

      const { data: entry } = await (supabase as any)
        .from("financial_entries")
        .select("status, valor")
        .eq("id", input.entry_id)
        .maybeSingle();
      if (!entry) throw new Error("Entrada não encontrada");
      if (entry.status === "cancelado") throw new Error("Não é possível registrar pagamento em entrada cancelada");

      const { data, error } = await (supabase as any)
        .from("financial_payments")
        .insert({ ...input, tenant_id, created_by: u.user.id })
        .select()
        .single();
      if (error) throw error;
      await syncEntryFromPayments(input.entry_id);
      return data as PaymentRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["fin-payments", vars.entry_id] });
      qc.invalidateQueries({ queryKey: ["fin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Pagamento registrado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar pagamento"),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entry_id }: { id: string; entry_id: string }) => {
      const { error } = await (supabase as any).from("financial_payments").delete().eq("id", id);
      if (error) throw error;
      await syncEntryFromPayments(entry_id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["fin-payments", vars.entry_id] });
      qc.invalidateQueries({ queryKey: ["fin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Pagamento removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

/**
 * Recalcula valor_pago + status da entrada com base na soma real
 * de financial_payments. Garante que Fluxo, KPIs e relatórios
 * fiquem consistentes mesmo quando pagamentos são adicionados/removidos.
 */
async function syncEntryFromPayments(entryId: string) {
  const { data: entry, error: eErr } = await (supabase as any)
    .from("financial_entries")
    .select("id, valor, status, vencimento")
    .eq("id", entryId)
    .maybeSingle();
  if (eErr || !entry) return;
  if (entry.status === "cancelado") return;

  const { data: pays } = await (supabase as any)
    .from("financial_payments")
    .select("valor, pago_em")
    .eq("entry_id", entryId);
  const total = (pays ?? []).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const valorTotal = Number(entry.valor || 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = entry.vencimento && new Date(entry.vencimento + "T12:00:00") < today;
  let nextStatus: "pago" | "pendente" | "atrasado" = "pendente";
  let recebido_em: string | null = null;
  if (total >= valorTotal && valorTotal > 0) {
    nextStatus = "pago";
    const lastDate = (pays ?? []).map((p: any) => p.pago_em).sort().pop() ?? null;
    recebido_em = lastDate;
  } else if (overdue) {
    nextStatus = "atrasado";
  }
  await (supabase as any)
    .from("financial_entries")
    .update({ valor_pago: total, status: nextStatus, recebido_em })
    .eq("id", entryId);
}
