import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import { calcularParcela, type ConsortiumSegment } from "./use-consortium";

export type SimulationRow = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  client_id: string | null;
  administrator_id: string | null;
  segmento: ConsortiumSegment;
  credito: number;
  prazo_meses: number;
  taxa_adm: number;
  fundo_reserva: number;
  seguro_mensal: number;
  lance_embutido_pct: number;
  parcela_estimada: number;
  parcela_com_lance: number | null;
  payload: any;
  pdf_url: string | null;
  created_at: string;
};

export function useSimulations(leadId?: string) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["simulations", tenantId, leadId ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<SimulationRow[]> => {
      let q: any = (supabase as any).from("consortium_simulations").select("*")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (leadId) q = q.eq("lead_id", leadId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SimulationRow[];
    },
  });
}

export function useCreateSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id?: string | null; client_id?: string | null; administrator_id?: string | null;
      segmento: ConsortiumSegment; credito: number; prazo_meses: number;
      taxa_adm: number; fundo_reserva?: number; seguro_mensal?: number; lance_embutido_pct?: number;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      const calc = calcularParcela({
        credito: input.credito, prazo: input.prazo_meses,
        taxa_adm: input.taxa_adm, fundo_reserva: input.fundo_reserva,
        seguro_mensal: input.seguro_mensal, lance_embutido_pct: input.lance_embutido_pct,
      });
      const { data, error } = await (supabase as any).from("consortium_simulations").insert({
        tenant_id, created_by: u.user?.id,
        lead_id: input.lead_id ?? null, client_id: input.client_id ?? null,
        administrator_id: input.administrator_id ?? null,
        segmento: input.segmento, credito: input.credito,
        prazo_meses: input.prazo_meses, taxa_adm: input.taxa_adm,
        fundo_reserva: input.fundo_reserva ?? 0, seguro_mensal: input.seguro_mensal ?? 0,
        lance_embutido_pct: input.lance_embutido_pct ?? 0,
        parcela_estimada: calc.parcela,
        parcela_com_lance: input.lance_embutido_pct ? calc.parcelaComLance : null,
        payload: { calc },
      }).select().single();
      if (error) throw error;
      return data as SimulationRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulations"] });
      toast.success("Simulação gerada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
