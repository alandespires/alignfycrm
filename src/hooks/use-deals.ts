import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { LeadStatus } from "@/hooks/use-leads";

export type DealStage = LeadStatus;

export type DealRow = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  titulo: string;
  valor: number;
  stage: DealStage;
  probabilidade: number | null;
  motivo_perda: string | null;
  fechado_em: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export function dealsQueryOptions(tenantId: string | null) {
  return queryOptions({
    queryKey: ["deals", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<DealRow[]> => {
      if (!tenantId) throw new Error("Nenhum workspace ativo");
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DealRow[];
    },
  });
}

export function useDeals() {
  return useQuery(dealsQueryOptions(getActiveTenantId()));
}

export type DealInput = {
  id?: string;
  titulo: string;
  valor?: number;
  stage?: DealStage;
  probabilidade?: number;
  lead_id?: string | null;
  owner_id?: string | null;
};

export function useUpsertDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: DealInput) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload = {
        ...input,
        valor: input.valor ?? 0,
        stage: input.stage ?? "novo",
        probabilidade: input.probabilidade ?? 0,
        owner_id: input.owner_id ?? u.user.id,
      };
      if (id) {
        const { error } = await supabase.from("deals").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deals").insert({ ...payload, tenant_id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success(vars.id ? "Oportunidade atualizada" : "Oportunidade criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Oportunidade removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
