import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/contexts/tenant-context";
import type { LeadStatus } from "@/hooks/use-leads";

export const STAGE_LABEL: Record<LeadStatus, string> = {
  novo: "Novo", contato_inicial: "Contato feito", qualificacao: "Qualificação",
  proposta: "Proposta", negociacao: "Negociação", fechado: "Fechado", perdido: "Perdido",
};

/** Next task created automatically when a lead enters a stage (days = due offset). */
export const STAGE_NEXT_TASK: Partial<Record<LeadStatus, { titulo: string; days: number; prioridade: "baixa" | "media" | "alta" }>> = {
  contato_inicial: { titulo: "Qualificar necessidade", days: 2, prioridade: "media" },
  qualificacao: { titulo: "Preparar proposta", days: 2, prioridade: "media" },
  proposta: { titulo: "Follow-up da proposta", days: 3, prioridade: "alta" },
  negociacao: { titulo: "Fechar negociação", days: 2, prioridade: "alta" },
};

export function nextTaskDue(days: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** Logs the stage move in the lead timeline and schedules the next step. Never throws. */
export async function runStageAutomation(leadId: string, status: LeadStatus, motivo?: string) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const tenant_id = requireTenantId();
    const descricao = `Movido para ${STAGE_LABEL[status]}${motivo ? ` · Motivo: ${motivo}` : ""}`;
    await supabase.from("activities").insert({ tenant_id, user_id: u.user.id, lead_id: leadId, tipo: "movimentacao", descricao } as any);
    const next = STAGE_NEXT_TASK[status];
    if (!next) return;
    const { data: lead } = await supabase.from("leads").select("nome, empresa").eq("id", leadId).maybeSingle();
    const nome = (lead as any)?.empresa || (lead as any)?.nome || "lead";
    await (supabase as any).from("tasks").insert({
      tenant_id, created_by: u.user.id, assignee_id: u.user.id, lead_id: leadId,
      titulo: `${next.titulo}: ${nome}`, prioridade: next.prioridade, status: "pendente",
      prazo: nextTaskDue(next.days),
    });
  } catch {
    /* automation is best-effort; the stage change already succeeded */
  }
}
