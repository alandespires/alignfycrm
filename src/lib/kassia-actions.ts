import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/contexts/tenant-context";

/** Cria tarefa a partir de tool-call do Launch. */
export async function executarCriarTarefa(args: {
  titulo: string;
  descricao?: string;
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  prazo_dias?: number;
  lead_nome?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();

  let lead_id: string | null = null;
  if (args.lead_nome) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id,nome")
      .eq("tenant_id", tenant_id)
      .ilike("nome", `%${args.lead_nome}%`)
      .limit(1);
    lead_id = leads?.[0]?.id ?? null;
  }

  const prazo = args.prazo_dias != null
    ? new Date(Date.now() + args.prazo_dias * 86400000).toISOString()
    : null;

  const { data, error } = await supabase.from("tasks").insert({
    titulo: args.titulo,
    descricao: args.descricao ?? null,
    prioridade: args.prioridade ?? "media",
    prazo,
    lead_id,
    tenant_id,
    created_by: u.user.id,
    assignee_id: u.user.id,
    status: "pendente" as const,
  }).select().single();

  if (error) throw error;
  return data;
}

/** Move um lead para outro estágio do pipeline. */
export async function executarMoverLead(args: { lead_nome: string; novo_status: string }) {
  const tenant_id = requireTenantId();
  const { data: leads, error: e1 } = await supabase
    .from("leads")
    .select("id,nome,status")
    .eq("tenant_id", tenant_id)
    .ilike("nome", `%${args.lead_nome}%`)
    .limit(1);
  if (e1) throw e1;
  const lead = leads?.[0];
  if (!lead) throw new Error(`Lead "${args.lead_nome}" não encontrado`);

  const { error } = await supabase.from("leads").update({ status: args.novo_status as any }).eq("id", lead.id);
  if (error) throw error;
  return { lead_id: lead.id, nome: lead.nome, novo_status: args.novo_status };
}

/** Cria um novo lead a partir de comando conversacional. */
export async function executarCriarLead(args: {
  nome: string;
  empresa?: string;
  valor_estimado?: number;
  email?: string;
  whatsapp?: string;
  origem?: string;
  interesse?: string;
  observacoes?: string;
  status?: "novo" | "contato_inicial" | "qualificacao" | "proposta" | "negociacao" | "fechado" | "perdido";
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();
  if (!args.nome?.trim()) throw new Error("Nome do lead é obrigatório");

  const { data, error } = await supabase
    .from("leads")
    .insert({
      nome: args.nome.trim(),
      empresa: args.empresa?.trim() || null,
      valor_estimado: args.valor_estimado ?? null,
      email: args.email?.trim() || null,
      whatsapp: args.whatsapp?.trim() || null,
      origem: args.origem ?? "launch_ia",
      interesse: args.interesse ?? null,
      observacoes: args.observacoes ?? null,
      status: (args.status ?? "novo") as any,
      tenant_id,
      created_by: u.user.id,
      owner_id: u.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
