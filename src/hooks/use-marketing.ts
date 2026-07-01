import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type Campaign = {
  id: string; tenant_id: string; nome: string; status: string;
  objetivo: string | null; plataforma: string | null;
  data_inicio: string | null; data_fim: string | null;
  orcamento: number | null; resultado_esperado: string | null;
  resultado_alcancado: string | null; roi: number | null;
  observacoes: string | null; owner_id: string | null;
  created_at: string; updated_at: string;
};

export type CalendarItem = {
  id: string; tenant_id: string; titulo: string; tema: string | null;
  formato: string | null; plataforma: string | null; prioridade: string;
  status: string; campaign_id: string | null; responsavel_id: string | null;
  data_criacao: string | null; data_planejada: string | null; data_publicacao: string | null;
  conteudo: string | null; observacoes: string | null;
  created_at: string; updated_at: string;
};

const t = () => getActiveTenantId();

export function useCampaigns() {
  const tid = t();
  return useQuery({
    queryKey: ["mkt-campaigns", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_campaigns" as any)
        .select("*").eq("tenant_id", tid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Campaign[];
    },
  });
}
export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Campaign> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("marketing_campaigns" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_campaigns" as any).insert({
          ...(input as any), tenant_id, created_by: u.user?.id, owner_id: input.owner_id ?? u.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); toast.success("Campanha salva"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_campaigns" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useCalendarItems() {
  const tid = t();
  return useQuery({
    queryKey: ["mkt-calendar", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_calendar_items" as any)
        .select("*").eq("tenant_id", tid!).order("data_planejada", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarItem[];
    },
  });
}
export function useSaveCalendarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CalendarItem> & { titulo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("marketing_calendar_items" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_calendar_items" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-calendar"] }); toast.success("Item salvo"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteCalendarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_calendar_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-calendar"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
