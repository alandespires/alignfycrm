import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TemplateEtapa = { id: string; titulo: string; dias_apos_inicio?: number };
export type TemplateTarefa = {
  titulo: string;
  descricao?: string;
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  dias_apos_inicio?: number;
  horas_estimadas?: number;
  checklist?: { texto: string }[];
};
export type TemplateEntrega = { id: string; titulo: string; dias_apos_inicio?: number };

export type ProjectTemplate = {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  etapas: TemplateEtapa[];
  tarefas: TemplateTarefa[];
  entregas: TemplateEntrega[];
  duracao_dias: number | null;
  auto_on_lead_won: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useProjectTemplates() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["project-templates", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProjectTemplate[]> => {
      const { data, error } = await (supabase as any).from("project_templates")
        .select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectTemplate[];
    },
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectTemplate> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { data, error } = await (supabase as any).from("project_templates").insert({
        tenant_id, created_by: u.user.id,
        nome: input.nome, descricao: input.descricao ?? null, categoria: input.categoria ?? null,
        etapas: input.etapas ?? [], tarefas: input.tarefas ?? [], entregas: input.entregas ?? [],
        duracao_dias: input.duracao_dias ?? null,
        auto_on_lead_won: input.auto_on_lead_won ?? false,
      }).select().single();
      if (error) throw error;
      return data as ProjectTemplate;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-templates"] }); toast.success("Template criado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("project_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-templates"] }); toast.success("Template removido"); },
  });
}

/** Aplica um template criando um projeto + tarefas + etapas/entregas. */
export function useApplyProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ template, leadId, clientId, titulo }: { template: ProjectTemplate; leadId?: string; clientId?: string; titulo?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const inicio = new Date();

      const { data: proj, error } = await (supabase as any).from("projects").insert({
        tenant_id, created_by: u.user.id, owner_id: u.user.id,
        titulo: titulo ?? template.nome,
        descricao: template.descricao,
        status: "em_andamento",
        prioridade: "media",
        inicio: inicio.toISOString().slice(0, 10),
        prazo: template.duracao_dias ? new Date(inicio.getTime() + template.duracao_dias * 86400000).toISOString().slice(0, 10) : null,
        etapas: template.etapas, entregas: template.entregas,
        lead_id: leadId ?? null, client_id: clientId ?? null,
      }).select().single();
      if (error) throw error;

      // Cria tarefas
      const inserts = (template.tarefas ?? []).map((t) => ({
        tenant_id, created_by: u.user!.id, assignee_id: u.user!.id,
        project_id: proj.id, lead_id: leadId ?? null,
        titulo: t.titulo, descricao: t.descricao ?? null,
        prioridade: t.prioridade ?? "media", status: "pendente",
        prazo: t.dias_apos_inicio != null ? new Date(inicio.getTime() + t.dias_apos_inicio * 86400000).toISOString() : null,
        horas_estimadas: t.horas_estimadas ?? null,
        checklist: (t.checklist ?? []).map((c) => ({ id: crypto.randomUUID(), texto: c.texto, feito: false })),
      }));
      if (inserts.length) {
        const { error: terr } = await (supabase as any).from("tasks").insert(inserts);
        if (terr) throw terr;
      }
      return proj;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Projeto criado a partir do template");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao aplicar template"),
  });
}

/** Templates pré-prontos para inserir no tenant. */
export const SEED_TEMPLATES: Omit<ProjectTemplate, "id" | "tenant_id" | "created_by" | "created_at" | "updated_at">[] = [
  {
    nome: "Onboarding de Cliente",
    descricao: "Recepção e ativação de novo cliente em 14 dias",
    categoria: "comercial",
    duracao_dias: 14,
    auto_on_lead_won: false,
    etapas: [
      { id: "1", titulo: "Boas-vindas", dias_apos_inicio: 0 },
      { id: "2", titulo: "Configuração", dias_apos_inicio: 3 },
      { id: "3", titulo: "Treinamento", dias_apos_inicio: 7 },
      { id: "4", titulo: "Go-live", dias_apos_inicio: 14 },
    ],
    entregas: [
      { id: "e1", titulo: "Kit boas-vindas enviado", dias_apos_inicio: 1 },
      { id: "e2", titulo: "Cliente treinado", dias_apos_inicio: 10 },
    ],
    tarefas: [
      { titulo: "Enviar e-mail de boas-vindas", prioridade: "alta", dias_apos_inicio: 0, horas_estimadas: 0.5 },
      { titulo: "Agendar reunião de kickoff", prioridade: "alta", dias_apos_inicio: 1, horas_estimadas: 1 },
      { titulo: "Configurar acessos", prioridade: "media", dias_apos_inicio: 3, horas_estimadas: 2,
        checklist: [{ texto: "Criar conta" }, { texto: "Definir permissões" }, { texto: "Enviar credenciais" }] },
      { titulo: "Sessão de treinamento", prioridade: "alta", dias_apos_inicio: 7, horas_estimadas: 2 },
      { titulo: "Follow-up 30 dias", prioridade: "media", dias_apos_inicio: 30, horas_estimadas: 0.5 },
    ],
  },
  {
    nome: "Implantação SaaS",
    descricao: "Projeto de implantação técnica completo",
    categoria: "implantacao",
    duracao_dias: 45,
    auto_on_lead_won: false,
    etapas: [
      { id: "1", titulo: "Discovery", dias_apos_inicio: 0 },
      { id: "2", titulo: "Setup técnico", dias_apos_inicio: 7 },
      { id: "3", titulo: "Migração", dias_apos_inicio: 21 },
      { id: "4", titulo: "Treinamento", dias_apos_inicio: 35 },
      { id: "5", titulo: "Go-live", dias_apos_inicio: 45 },
    ],
    entregas: [
      { id: "e1", titulo: "Documento de discovery", dias_apos_inicio: 5 },
      { id: "e2", titulo: "Ambiente configurado", dias_apos_inicio: 14 },
      { id: "e3", titulo: "Dados migrados", dias_apos_inicio: 28 },
      { id: "e4", titulo: "Equipe treinada", dias_apos_inicio: 40 },
    ],
    tarefas: [
      { titulo: "Reunião de discovery", prioridade: "alta", dias_apos_inicio: 0, horas_estimadas: 3 },
      { titulo: "Levantar requisitos", prioridade: "alta", dias_apos_inicio: 2, horas_estimadas: 8 },
      { titulo: "Provisionar ambiente", prioridade: "media", dias_apos_inicio: 7, horas_estimadas: 4 },
      { titulo: "Importar dados legados", prioridade: "alta", dias_apos_inicio: 21, horas_estimadas: 12,
        checklist: [{ texto: "Mapear schema" }, { texto: "ETL" }, { texto: "Validar contagens" }] },
      { titulo: "Treinamento equipe", prioridade: "alta", dias_apos_inicio: 35, horas_estimadas: 6 },
      { titulo: "Go-live", prioridade: "urgente", dias_apos_inicio: 45, horas_estimadas: 4 },
    ],
  },
  {
    nome: "Campanha de Marketing",
    descricao: "Sprint de campanha de 30 dias",
    categoria: "marketing",
    duracao_dias: 30,
    auto_on_lead_won: false,
    etapas: [
      { id: "1", titulo: "Estratégia", dias_apos_inicio: 0 },
      { id: "2", titulo: "Produção", dias_apos_inicio: 7 },
      { id: "3", titulo: "Veiculação", dias_apos_inicio: 14 },
      { id: "4", titulo: "Análise", dias_apos_inicio: 30 },
    ],
    entregas: [
      { id: "e1", titulo: "Briefing aprovado", dias_apos_inicio: 3 },
      { id: "e2", titulo: "Criativos finalizados", dias_apos_inicio: 12 },
      { id: "e3", titulo: "Relatório de performance", dias_apos_inicio: 30 },
    ],
    tarefas: [
      { titulo: "Definir público e objetivos", prioridade: "alta", dias_apos_inicio: 0, horas_estimadas: 2 },
      { titulo: "Briefing criativo", prioridade: "alta", dias_apos_inicio: 2, horas_estimadas: 3 },
      { titulo: "Produzir criativos", prioridade: "media", dias_apos_inicio: 7, horas_estimadas: 16 },
      { titulo: "Subir campanha", prioridade: "alta", dias_apos_inicio: 14, horas_estimadas: 2 },
      { titulo: "Monitorar e otimizar", prioridade: "media", dias_apos_inicio: 16, horas_estimadas: 8 },
      { titulo: "Relatório final", prioridade: "alta", dias_apos_inicio: 30, horas_estimadas: 3 },
    ],
  },
  {
    nome: "Sprint de Desenvolvimento",
    descricao: "Sprint quinzenal padrão",
    categoria: "produto",
    duracao_dias: 14,
    auto_on_lead_won: false,
    etapas: [
      { id: "1", titulo: "Planning", dias_apos_inicio: 0 },
      { id: "2", titulo: "Execução", dias_apos_inicio: 1 },
      { id: "3", titulo: "Review & Retro", dias_apos_inicio: 14 },
    ],
    entregas: [
      { id: "e1", titulo: "Sprint backlog definido", dias_apos_inicio: 0 },
      { id: "e2", titulo: "Demo entregue", dias_apos_inicio: 14 },
    ],
    tarefas: [
      { titulo: "Sprint planning", prioridade: "alta", dias_apos_inicio: 0, horas_estimadas: 2 },
      { titulo: "Daily standup", prioridade: "media", dias_apos_inicio: 1, horas_estimadas: 0.25 },
      { titulo: "Code review pendentes", prioridade: "media", dias_apos_inicio: 7, horas_estimadas: 2 },
      { titulo: "Sprint review (demo)", prioridade: "alta", dias_apos_inicio: 14, horas_estimadas: 1.5 },
      { titulo: "Retrospectiva", prioridade: "media", dias_apos_inicio: 14, horas_estimadas: 1 },
    ],
  },
];
