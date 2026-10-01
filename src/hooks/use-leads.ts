import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { LeadImportValue } from "@/lib/leads/csv-import";

export type LeadStatus =
  | "novo"
  | "contato_inicial"
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "fechado"
  | "perdido";

export type LeadRow = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  whatsapp: string | null;
  origem: string | null;
  interesse: string | null;
  nicho: string | null;
  observacoes: string | null;
  tags: string[] | null;
  status: LeadStatus;
  valor_estimado: number | null;
  ai_score: number | null;
  ai_resumo: string | null;
  ai_sugestao: string | null;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  ultimo_contato_em: string | null;
  whatsapp_consent_status: "unknown" | "granted" | "revoked";
  whatsapp_consent_at: string | null;
  whatsapp_consent_source: string | null;
  whatsapp_opt_out_at: string | null;
  whatsapp_last_contact_at: string | null;
};

export function leadsQueryOptions(tenantId: string | null) {
  return queryOptions({
    queryKey: ["leads", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<LeadRow[]> => {
      if (!tenantId) throw new Error("Nenhum workspace ativo");
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });
}

export function useLeads() {
  return useQuery(leadsQueryOptions(getActiveTenantId()));
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      empresa?: string;
      email?: string;
      whatsapp?: string;
      origem?: string;
      interesse?: string;
      nicho?: string;
      observacoes?: string;
      valor_estimado?: number;
      status?: LeadStatus;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await supabase
        .from("leads")
        .insert({
          ...input,
          tenant_id,
          created_by: u.user.id,
          owner_id: u.user.id,
          status: input.status ?? "novo",
        })
        .select()
        .single();
      if (error) throw error;
      return data as LeadRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar lead"),
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<LeadRow[]>(["leads"]);
      if (prev) {
        qc.setQueryData<LeadRow[]>(
          ["leads"],
          prev.map((l) => (l.id === id ? { ...l, status } : l)),
        );
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
      toast.error(e.message ?? "Erro ao mover lead");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

export function useSetWhatsAppConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, source }: { id: string; status: "granted" | "revoked"; source?: string }) => {
      if (status === "granted" && !source?.trim()) throw new Error("Informe a origem do consentimento");
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").update({
        whatsapp_consent_status: status,
        whatsapp_consent_at: status === "granted" ? now : null,
        whatsapp_consent_source: status === "granted" ? source!.trim() : null,
        whatsapp_opt_out_at: status === "revoked" ? now : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Preferência de WhatsApp atualizada");
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao atualizar consentimento"),
  });
}

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: LeadImportValue[]) => {
      if (!rows.length) throw new Error("Nenhum lead válido para importar");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload = rows.map((row) => ({
        ...row,
        tenant_id,
        created_by: auth.user!.id,
        owner_id: auth.user!.id,
      }));
      const { data, error } = await supabase.from("leads").insert(payload).select("id");
      if (error) throw error;
      return data?.length ?? rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${count} lead${count === 1 ? "" : "s"} importado${count === 1 ? "" : "s"}`);
    },
    onError: (error: any) => toast.error(error.message ?? "Erro ao importar leads"),
  });
}
