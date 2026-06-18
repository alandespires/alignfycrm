import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type ConsortiumSegment = "imovel" | "veiculo" | "servicos" | "pesado" | "moto";

export const SEGMENT_LABEL: Record<ConsortiumSegment, string> = {
  imovel: "Imóvel",
  veiculo: "Veículo",
  servicos: "Serviços",
  pesado: "Pesado",
  moto: "Moto",
};

export type AdministratorRow = {
  id: string;
  tenant_id: string;
  nome: string;
  cnpj: string | null;
  taxa_adm_padrao: number;
  fundo_reserva_padrao: number;
  seguro_padrao: number;
  contato: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export function useAdministrators() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["consortium-administrators", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<AdministratorRow[]> => {
      const { data, error } = await (supabase as any)
        .from("consortium_administrators").select("*")
        .eq("tenant_id", tenantId!).order("nome");
      if (error) throw error;
      return (data ?? []) as AdministratorRow[];
    },
  });
}

export function useCreateAdministrator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdministratorRow> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any)
        .from("consortium_administrators")
        .insert({ ...input, tenant_id, created_by: u.user?.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consortium-administrators"] });
      toast.success("Administradora salva");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

/** Cálculo padrão de parcela: (credito * (1 + taxa_adm + fr) / prazo) + seguro_mensal */
export function calcularParcela(args: {
  credito: number; prazo: number; taxa_adm: number; fundo_reserva?: number;
  seguro_mensal?: number; lance_embutido_pct?: number;
}) {
  const fr = args.fundo_reserva ?? 0;
  const lance = (args.lance_embutido_pct ?? 0) / 100;
  const creditoAjustado = args.credito * (1 - lance);
  const total = args.credito * (1 + args.taxa_adm / 100 + fr / 100);
  const parcela = total / args.prazo + (args.seguro_mensal ?? 0);
  const parcelaComLance = (creditoAjustado * (1 + args.taxa_adm / 100 + fr / 100)) / args.prazo + (args.seguro_mensal ?? 0);
  return { parcela: Math.round(parcela * 100) / 100, parcelaComLance: Math.round(parcelaComLance * 100) / 100, total };
}
