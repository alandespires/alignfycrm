import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type CompanyRow = {
  id: string;
  tenant_id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  segmento: string | null;
  site: string | null;
  tamanho: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useCompanies() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["companies", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<CompanyRow[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyRow[];
    },
  });
}

export type CompanyInput = Partial<Omit<CompanyRow, "id" | "tenant_id" | "created_by" | "created_at" | "updated_at">> & {
  nome: string;
};

export function useUpsertCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CompanyInput & { id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      if (id) {
        const { error } = await supabase.from("companies").update(input).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("companies")
          .insert({ ...input, tenant_id, created_by: u.user.id, owner_id: input.owner_id ?? u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(vars.id ? "Empresa atualizada" : "Empresa criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar empresa"),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa removida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
