import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type ClientRow = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  contrato_valor: number | null;
  contrato_inicio: string | null;
  lead_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export function clientsQueryOptions(tenantId: string | null) {
  return queryOptions({
    queryKey: ["clients", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ClientRow[]> => {
      if (!tenantId) throw new Error("Nenhum workspace ativo");
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });
}

export function useClients() {
  return useQuery(clientsQueryOptions(getActiveTenantId()));
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string; empresa?: string; email?: string; whatsapp?: string;
      contrato_valor?: number; contrato_inicio?: string; observacoes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await supabase.from("clients").insert({
        ...input,
        tenant_id,
        owner_id: u.user.id,
      }).select().single();
      if (error) throw error;
      return data as ClientRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar cliente"),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ClientRow>) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
