import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type { TaskPriority } from "@/hooks/use-tasks";

export type ProjectStatus = "planejado" | "em_andamento" | "pausado" | "concluido" | "cancelado";

export type ProjectStage = { id: string; titulo: string; concluida: boolean };
export type ProjectDeliverable = { id: string; titulo: string; entregue: boolean; data?: string | null };

export type ProjectRow = {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  status: ProjectStatus;
  progresso: number;
  prioridade: TaskPriority;
  prazo: string | null;
  inicio: string | null;
  concluido_em: string | null;
  valor_total: number;
  client_id: string | null;
  lead_id: string | null;
  owner_id: string | null;
  etapas: ProjectStage[];
  entregas: ProjectDeliverable[];
  tags: string[] | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectAuditLog = {
  id: string;
  tenant_id: string;
  project_id: string;
  user_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  affected_entries: Array<{ id: string; descricao: string; valor: number; from_status?: string }>;
  affected_tasks: Array<{ id: string; titulo: string; from_status?: string }>;
  affected_leads: Array<{ id: string; nome: string; from_status?: string; to_status?: string }>;
  details: Record<string, any>;
  created_at: string;
};

export function useProjects() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["projects", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await (supabase as any)
        .from("projects").select("*").eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });
}

export function useProjectAuditLogs(projectId?: string) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["project-audit", tenantId, projectId ?? "all"],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProjectAuditLog[]> => {
      let q = (supabase as any).from("project_audit_logs").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(200);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProjectAuditLog[];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProjectRow> & { titulo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const payload: any = { ...input, tenant_id, created_by: u.user.id, owner_id: input.owner_id ?? u.user.id };
      const { data, error } = await (supabase as any).from("projects").insert(payload).select().single();
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Projeto criado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar projeto"),
  });
}

/**
 * Update a project. When status transitions to "cancelado" or "concluido",
 * cascade changes to related financial entries, tasks and the parent lead,
 * and record a full audit log entry.
 */
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ProjectRow> & { id: string }) => {
      const tenant_id = requireTenantId();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");

      // Snapshot before
      const { data: before } = await (supabase as any)
        .from("projects").select("id, status, lead_id, titulo").eq("id", id).maybeSingle();
      if (!before) throw new Error("Projeto não encontrado");

      // Apply main update
      const finalPatch: any = { ...patch };
      if (patch.status === "concluido" && patch.progresso === undefined) {
        finalPatch.progresso = 100;
        finalPatch.concluido_em = new Date().toISOString();
      }
      const { error } = await (supabase as any).from("projects").update(finalPatch).eq("id", id);
      if (error) throw error;

      const transition = patch.status && patch.status !== before.status ? { from: before.status, to: patch.status } : null;
      if (!transition) return { audited: false };

      // Collect cascade snapshots
      const affected_entries: any[] = [];
      const affected_tasks: any[] = [];
      const affected_leads: any[] = [];

      if (transition.to === "cancelado") {
        // Cancel related financial entries (out of metrics)
        const { data: ents } = await (supabase as any)
          .from("financial_entries").select("id, descricao, valor, status")
          .eq("project_id", id).neq("status", "cancelado");
        for (const e of ents ?? []) affected_entries.push({ id: e.id, descricao: e.descricao, valor: Number(e.valor || 0), from_status: e.status });
        if (affected_entries.length) {
          await (supabase as any).from("financial_entries").update({ status: "cancelado" }).eq("project_id", id).neq("status", "cancelado");
        }
        // Cancel pending/in-progress tasks
        const { data: ts } = await (supabase as any)
          .from("tasks").select("id, titulo, status")
          .eq("project_id", id).in("status", ["pendente", "em_andamento"]);
        for (const t of ts ?? []) affected_tasks.push({ id: t.id, titulo: t.titulo, from_status: t.status });
        if (affected_tasks.length) {
          await (supabase as any).from("tasks").update({ status: "cancelada" }).eq("project_id", id).in("status", ["pendente", "em_andamento"]);
        }
      }

      // Lead/Pipeline sync rule
      if (before.lead_id && (transition.to === "concluido" || transition.to === "cancelado")) {
        const targetLeadStatus = transition.to === "concluido" ? "fechado" : "perdido";
        const { data: lead } = await (supabase as any)
          .from("leads").select("id, nome, status").eq("id", before.lead_id).maybeSingle();
        if (lead && lead.status !== targetLeadStatus) {
          const { error: lerr } = await (supabase as any).from("leads").update({ status: targetLeadStatus }).eq("id", before.lead_id);
          if (!lerr) {
            affected_leads.push({ id: lead.id, nome: lead.nome, from_status: lead.status, to_status: targetLeadStatus });
          }
        }
      }

      // Write audit log
      await (supabase as any).from("project_audit_logs").insert({
        tenant_id, project_id: id, user_id: u.user.id,
        action: transition.to === "cancelado" ? "project_cancelled" : transition.to === "concluido" ? "project_completed" : "status_changed",
        from_status: transition.from, to_status: transition.to,
        affected_entries, affected_tasks, affected_leads,
        details: { project_titulo: before.titulo },
      });

      return { audited: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      qc.invalidateQueries({ queryKey: ["fin-payments-all"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["project-audit"] });
      toast.success("Projeto atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

/** Bulk status update — applies the same cascade rules per project. */
export function useBulkUpdateProjects() {
  const update = useUpdateProject();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ProjectStatus }) => {
      let ok = 0; let fail = 0;
      for (const id of ids) {
        try { await update.mutateAsync({ id, status }); ok++; } catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`${ok} projeto${ok === 1 ? "" : "s"} atualizado${ok === 1 ? "" : "s"}${fail ? ` · ${fail} falha${fail === 1 ? "" : "s"}` : ""}`);
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const tenant_id = requireTenantId();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { data: before } = await (supabase as any).from("projects").select("status, titulo").eq("id", id).maybeSingle();
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);
      if (error) throw error;
      await (supabase as any).from("project_audit_logs").insert({
        tenant_id, project_id: id, user_id: u.user.id, action: "project_deleted",
        from_status: before?.status ?? null, to_status: null,
        details: { project_titulo: before?.titulo ?? null },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["fin-entries"] });
      qc.invalidateQueries({ queryKey: ["project-audit"] });
      toast.success("Projeto removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planejado: "Planejado", em_andamento: "Em andamento", pausado: "Pausado",
  concluido: "Concluído", cancelado: "Cancelado",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, "info" | "warn" | "muted" | "success" | "danger"> = {
  planejado: "info", em_andamento: "warn", pausado: "muted", concluido: "success", cancelado: "danger",
};
