import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type ContactRow = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  lead_id: string | null;
  nome: string;
  cargo: string | null;
  email: string | null;
  whatsapp: string | null;
  telefone: string | null;
  observacoes: string | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useContacts() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["contacts", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });
}

export type ContactInput = Partial<Omit<ContactRow, "id" | "tenant_id" | "created_by" | "created_at" | "updated_at">> & {
  nome: string;
};

export function useUpsertContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ContactInput & { id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      if (id) {
        const { error } = await supabase.from("contacts").update(input).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contacts")
          .insert({ ...input, tenant_id, created_by: u.user.id, owner_id: input.owner_id ?? u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(vars.id ? "Contato atualizado" : "Contato criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
