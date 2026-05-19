import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type ProposalStatus = "rascunho" | "enviada" | "visualizada" | "aceita" | "recusada" | "expirada";

export type ProposalRow = {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  client_id: string | null;
  titulo: string;
  valor: number | null;
  status: string;
  validade: string | null;
  conteudo: any;
  url_pdf: string | null;
  visualizada_em: string | null;
  aceita_em: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useProposals() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["proposals", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProposalRow[]> => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProposalRow[];
    },
  });
}

export type ProposalInput = {
  id?: string;
  titulo: string;
  valor?: number;
  status?: ProposalStatus;
  validade?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  conteudo?: any;
};

export function useUpsertProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ProposalInput) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload = {
        ...input,
        valor: input.valor ?? 0,
        status: input.status ?? "rascunho",
        conteudo: input.conteudo ?? {},
      };
      if (id) {
        const { error } = await supabase.from("proposals").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposals").insert({ ...payload, tenant_id, created_by: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success(vars.id ? "Proposta atualizada" : "Proposta criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
