import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/contexts/tenant-context";

/** Cria tarefa a partir de tool-call do Launch. */
export async function executarCriarTarefa(args: {
  titulo: string;
  descricao?: string;
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  prazo_dias?: number;
  lead_nome?: string;
  project_titulo?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();

  let lead_id: string | null = null;
  if (args.lead_nome) {
    const { data: leads } = await supabase.from("leads").select("id,nome")
      .eq("tenant_id", tenant_id).ilike("nome", `%${args.lead_nome}%`).limit(1);
    lead_id = leads?.[0]?.id ?? null;
  }

  let project_id: string | null = null;
  if (args.project_titulo) {
    const { data: projs } = await (supabase as any).from("projects").select("id,titulo")
      .eq("tenant_id", tenant_id).ilike("titulo", `%${args.project_titulo}%`).limit(1);
    project_id = projs?.[0]?.id ?? null;
  }

  const prazo = args.prazo_dias != null ? new Date(Date.now() + args.prazo_dias * 86400000).toISOString() : null;

  const { data, error } = await supabase.from("tasks").insert({
    titulo: args.titulo,
    descricao: args.descricao ?? null,
    prioridade: args.prioridade ?? "media",
    prazo,
    lead_id,
    project_id,
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
  const { data: leads, error: e1 } = await supabase.from("leads").select("id,nome,status")
    .eq("tenant_id", tenant_id).ilike("nome", `%${args.lead_nome}%`).limit(1);
  if (e1) throw e1;
  const lead = leads?.[0];
  if (!lead) throw new Error(`Lead "${args.lead_nome}" não encontrado`);
  const { error } = await supabase.from("leads").update({ status: args.novo_status as any }).eq("id", lead.id);
  if (error) throw error;
  return { lead_id: lead.id, nome: lead.nome, novo_status: args.novo_status };
}

/** Cria um novo lead a partir de comando conversacional. */
export async function executarCriarLead(args: {
  nome: string; empresa?: string; valor_estimado?: number;
  email?: string; whatsapp?: string; origem?: string;
  interesse?: string; observacoes?: string;
  status?: "novo" | "contato_inicial" | "qualificacao" | "proposta" | "negociacao" | "fechado" | "perdido";
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();
  if (!args.nome?.trim()) throw new Error("Nome do lead é obrigatório");

  const { data, error } = await supabase.from("leads").insert({
    nome: args.nome.trim(),
    empresa: args.empresa?.trim() || null,
    valor_estimado: args.valor_estimado ?? null,
    email: args.email?.trim() || null,
    whatsapp: args.whatsapp?.trim() || null,
    origem: args.origem ?? "launch_ia",
    interesse: args.interesse ?? null,
    observacoes: args.observacoes ?? null,
    status: (args.status ?? "novo") as any,
    tenant_id, created_by: u.user.id, owner_id: u.user.id,
  }).select().single();

  if (error) throw error;
  return data;
}

/** Cria um projeto rápido (sem template). */
export async function executarCriarProjeto(args: {
  titulo: string; descricao?: string; prazo_dias?: number; valor_total?: number; lead_nome?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();

  let lead_id: string | null = null;
  if (args.lead_nome) {
    const { data: leads } = await supabase.from("leads").select("id").eq("tenant_id", tenant_id)
      .ilike("nome", `%${args.lead_nome}%`).limit(1);
    lead_id = leads?.[0]?.id ?? null;
  }

  const inicio = new Date();
  const { data, error } = await (supabase as any).from("projects").insert({
    tenant_id, created_by: u.user.id, owner_id: u.user.id,
    titulo: args.titulo.trim(),
    descricao: args.descricao ?? null,
    status: "em_andamento",
    prioridade: "media",
    inicio: inicio.toISOString().slice(0, 10),
    prazo: args.prazo_dias ? new Date(inicio.getTime() + args.prazo_dias * 86400000).toISOString().slice(0, 10) : null,
    valor_total: args.valor_total ?? 0,
    lead_id,
  }).select().single();
  if (error) throw error;
  return data;
}

/** Agenda follow-up: cria atividade + tarefa juntas. */
export async function executarAgendarFollowup(args: {
  lead_nome: string; canal?: "ligacao" | "whatsapp" | "email" | "reuniao"; dias?: number; observacao?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();

  const { data: leads } = await supabase.from("leads").select("id,nome")
    .eq("tenant_id", tenant_id).ilike("nome", `%${args.lead_nome}%`).limit(1);
  const lead = leads?.[0];
  if (!lead) throw new Error(`Lead "${args.lead_nome}" não encontrado`);

  const dias = args.dias ?? 2;
  const prazo = new Date(Date.now() + dias * 86400000).toISOString();
  const canal = args.canal ?? "ligacao";

  await supabase.from("tasks").insert({
    titulo: `Follow-up (${canal}) com ${lead.nome}`,
    descricao: args.observacao ?? null,
    prioridade: "alta",
    prazo,
    lead_id: lead.id,
    tenant_id, created_by: u.user.id, assignee_id: u.user.id,
    status: "pendente" as const,
  });

  await supabase.from("activities").insert({
    tenant_id, user_id: u.user.id, lead_id: lead.id,
    tipo: "nota" as any,
    descricao: `Follow-up agendado para ${new Date(prazo).toLocaleDateString("pt-BR")} via ${canal}`,
  });

  return { lead_id: lead.id, nome: lead.nome, prazo, canal };
}

/** Registra pagamento de uma entrada financeira. */
export async function executarRegistrarPagamento(args: {
  entry_descricao: string; valor: number; forma?: "pix" | "boleto" | "cartao" | "transferencia" | "dinheiro";
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const tenant_id = requireTenantId();

  const { data: entries } = await (supabase as any).from("financial_entries")
    .select("id,descricao,valor").eq("tenant_id", tenant_id)
    .ilike("descricao", `%${args.entry_descricao}%`).neq("status", "cancelado").limit(1);
  const entry = entries?.[0];
  if (!entry) throw new Error(`Entrada "${args.entry_descricao}" não encontrada`);

  const { error } = await (supabase as any).from("financial_payments").insert({
    tenant_id, entry_id: entry.id, created_by: u.user.id,
    valor: args.valor, forma_pagamento: args.forma ?? null,
    pago_em: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return { entry_id: entry.id, descricao: entry.descricao, valor: args.valor };
}
