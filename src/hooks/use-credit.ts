import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type CreditProductType =
  | "consignado" | "fgts" | "home_equity" | "refin_veicular" | "pessoal" | "antecipacao_ir";

export const CREDIT_TYPE_LABEL: Record<CreditProductType, string> = {
  consignado: "Consignado",
  fgts: "Antecipação FGTS",
  home_equity: "Home Equity",
  refin_veicular: "Refin Veicular",
  pessoal: "Crédito Pessoal",
  antecipacao_ir: "Antecipação IR",
};

export type CreditProductRow = {
  id: string; tenant_id: string;
  nome: string; tipo: CreditProductType; banco: string | null;
  taxa_min: number | null; taxa_max: number | null;
  prazo_min: number | null; prazo_max: number | null;
  comissao_pct: number | null; observacoes: string | null;
  ativo: boolean; created_at: string;
};

export function useCreditProducts() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["credit-products", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<CreditProductRow[]> => {
      const { data, error } = await (supabase as any).from("credit_products").select("*")
        .eq("tenant_id", tenantId!).order("nome");
      if (error) throw error;
      return (data ?? []) as CreditProductRow[];
    },
  });
}

export function useCreateCreditProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreditProductRow> & { nome: string; tipo: CreditProductType }) => {
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("credit_products").insert({ ...input, tenant_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-products"] }); toast.success("Produto cadastrado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

/** Cálculo de parcela price: P = V*i / (1 - (1+i)^-n) */
export function calcularCreditoPrice(args: { valor: number; taxa_mensal_pct: number; prazo: number }) {
  const i = args.taxa_mensal_pct / 100;
  if (i === 0) return { parcela: args.valor / args.prazo, total: args.valor };
  const parcela = (args.valor * i) / (1 - Math.pow(1 + i, -args.prazo));
  return { parcela: Math.round(parcela * 100) / 100, total: Math.round(parcela * args.prazo * 100) / 100 };
}

export type CreditSimulationRow = {
  id: string; tenant_id: string; lead_id: string | null; client_id: string | null;
  product_id: string | null; valor_solicitado: number; prazo_meses: number;
  taxa_mensal: number; parcela: number; total_pago: number; cet_anual: number | null;
  pdf_url: string | null; created_at: string;
};

export function useCreditSimulations(leadId?: string) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["credit-simulations", tenantId, leadId ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<CreditSimulationRow[]> => {
      let q: any = (supabase as any).from("credit_simulations").select("*")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (leadId) q = q.eq("lead_id", leadId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CreditSimulationRow[];
    },
  });
}

export function useCreateCreditSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id?: string | null; client_id?: string | null; product_id?: string | null;
      valor_solicitado: number; prazo_meses: number; taxa_mensal: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      const calc = calcularCreditoPrice({ valor: input.valor_solicitado, taxa_mensal_pct: input.taxa_mensal, prazo: input.prazo_meses });
      const cet = Math.pow(1 + input.taxa_mensal / 100, 12) - 1;
      const { data, error } = await (supabase as any).from("credit_simulations").insert({
        ...input, tenant_id, created_by: u.user?.id,
        parcela: calc.parcela, total_pago: calc.total, cet_anual: Math.round(cet * 10000) / 100,
        payload: { calc },
      }).select().single();
      if (error) throw error;
      return data as CreditSimulationRow;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-simulations"] }); toast.success("Simulação gerada"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
