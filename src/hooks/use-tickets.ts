import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TicketStatus = "aberto" | "em_andamento" | "aguardando" | "resolvido" | "fechado";
export type TicketPriority = "baixa" | "media" | "alta" | "urgente";

export type TicketRow = {
  id: string;
  tenant_id: string;
  numero: number;
  assunto: string;
  descricao: string | null;
  status: TicketStatus;
  prioridade: TicketPriority;
  client_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  assignee_id: string | null;
  sla_vencimento: string | null;
  resolvido_em: string | null;
  fechado_em: string | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useTickets() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["tickets", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TicketRow[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });
}

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  autor_id: string;
  autor_tipo: string;
  interno: boolean;
  conteudo: string;
  created_at: string;
};

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-messages", ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<TicketMessageRow[]> => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TicketMessageRow[];
    },
  });
}

export type TicketInput = {
  id?: string;
  assunto: string;
  descricao?: string;
  status?: TicketStatus;
  prioridade?: TicketPriority;
  client_id?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  assignee_id?: string | null;
  sla_vencimento?: string | null;
};

export function useUpsertTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TicketInput) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload: any = {
        ...input,
        status: input.status ?? "aberto",
        prioridade: input.prioridade ?? "media",
      };
      // Set resolvido_em / fechado_em automatically on status change
      if (input.status === "resolvido") payload.resolvido_em = new Date().toISOString();
      if (input.status === "fechado") payload.fechado_em = new Date().toISOString();
      if (id) {
        const { error } = await supabase.from("tickets").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        // SLA default: 24h
        payload.sla_vencimento = input.sla_vencimento ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        payload.assignee_id = input.assignee_id ?? u.user.id;
        const { error } = await supabase.from("tickets").insert({ ...payload, tenant_id, created_by: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success(vars.id ? "Ticket atualizado" : "Ticket aberto");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

export function useAddTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, conteudo, interno }: { ticketId: string; conteudo: string; interno?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        tenant_id,
        autor_id: u.user.id,
        autor_tipo: "agente",
        interno: interno ?? false,
        conteudo,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ticket-messages", vars.ticketId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });
}
