import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { ConsortiumSegment } from "./use-consortium";

export type QuotaStatus = "ativa" | "contemplada" | "quitada" | "cancelada" | "transferida" | "atrasada";
export type ContemplationType = "sorteio" | "lance_livre" | "lance_fixo" | "lance_embutido";

export const QUOTA_STATUS_LABEL: Record<QuotaStatus, string> = {
  ativa: "Ativa",
  contemplada: "Contemplada",
  quitada: "Quitada",
  cancelada: "Cancelada",
  transferida: "Transferida",
  atrasada: "Atrasada",
};

export type QuotaRow = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  client_id: string | null;
  group_id: string | null;
  administrator_id: string | null;
  numero_cota: string | null;
  segmento: ConsortiumSegment;
  valor_credito: number;
  parcela_valor: number;
  parcela_atual: number;
  parcela_total: number;
  status: QuotaStatus;
  contemplada_em: string | null;
  lance_ofertado: number | null;
  lance_tipo: ContemplationType | null;
  proximo_vencimento: string | null;
  owner_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export function useQuotas(opts?: { leadId?: string; status?: QuotaStatus }) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["quotas", tenantId, opts?.leadId ?? "all", opts?.status ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<QuotaRow[]> => {
      let q: any = (supabase as any).from("consortium_quotas").select("*")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (opts?.leadId) q = q.eq("lead_id", opts.leadId);
      if (opts?.status) q = q.eq("status", opts.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QuotaRow[];
    },
  });
}

export function useCreateQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<QuotaRow> & {
      segmento: ConsortiumSegment; valor_credito: number; parcela_valor: number; parcela_total: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any)
        .from("consortium_quotas")
        .insert({ ...input, tenant_id, created_by: u.user?.id, owner_id: u.user?.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      toast.success("Cota cadastrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useUpdateQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<QuotaRow> & { id: string }) => {
      const { error } = await (supabase as any).from("consortium_quotas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useRegisterContemplation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { quota_id: string; tipo: ContemplationType; data?: string; valor_lance?: number; observacao?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      // Cria evento
      const { error: e1 } = await (supabase as any).from("consortium_contemplations").insert({
        tenant_id, created_by: u.user?.id,
        quota_id: input.quota_id, tipo: input.tipo,
        data: input.data ?? new Date().toISOString().slice(0, 10),
        valor_lance: input.valor_lance ?? null, observacao: input.observacao ?? null,
      });
      if (e1) throw e1;
      // Marca cota como contemplada
      const { error: e2 } = await (supabase as any).from("consortium_quotas").update({
        status: "contemplada", contemplada_em: input.data ?? new Date().toISOString().slice(0, 10),
        lance_tipo: input.tipo, lance_ofertado: input.valor_lance ?? null,
      }).eq("id", input.quota_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotas"] });
      qc.invalidateQueries({ queryKey: ["contemplations"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("🎉 Contemplação registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useContemplations() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["contemplations", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consortium_contemplations").select("*")
        .eq("tenant_id", tenantId!).order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
