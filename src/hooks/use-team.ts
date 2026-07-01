import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type Department = {
  id: string; tenant_id: string; nome: string; descricao: string | null;
  cor: string | null; manager_id: string | null;
  created_at: string; updated_at: string;
};
export type TeamMember = {
  id: string; tenant_id: string; user_id: string | null; nome: string;
  cargo: string | null; department_id: string | null; manager_id: string | null;
  status: string; email: string | null; telefone: string | null;
  salario: number | null; data_contratacao: string | null; data_desligamento: string | null;
  avatar_url: string | null; observacoes: string | null;
  created_at: string; updated_at: string;
};
export type JobOpening = {
  id: string; tenant_id: string; titulo: string; department_id: string | null;
  descricao: string | null; requisitos: string | null; senioridade: string | null;
  status: string; modalidade: string | null; regime: string | null;
  salario_min: number | null; salario_max: number | null;
  vagas: number; candidatos: number;
  data_abertura: string | null; data_fechamento: string | null;
  responsavel_id: string | null;
  created_at: string; updated_at: string;
};

const t = () => getActiveTenantId();

export function useDepartments() {
  const tid = t();
  return useQuery({
    queryKey: ["departments", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("departments" as any)
        .select("*").eq("tenant_id", tid!).order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Department[];
    },
  });
}
export function useSaveDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Department> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("departments" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Departamento salvo"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useTeamMembers() {
  const tid = t();
  return useQuery({
    queryKey: ["team-members", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members" as any)
        .select("*").eq("tenant_id", tid!).order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as TeamMember[];
    },
  });
}
export function useSaveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TeamMember> & { nome: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("team_members" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-members"] }); toast.success("Colaborador salvo"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team-members"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useJobOpenings() {
  const tid = t();
  return useQuery({
    queryKey: ["job-openings", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("job_openings" as any)
        .select("*").eq("tenant_id", tid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as JobOpening[];
    },
  });
}
export function useSaveJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobOpening> & { titulo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        const { error } = await supabase.from("job_openings" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_openings" as any).insert({ ...(input as any), tenant_id, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-openings"] }); toast.success("Vaga salva"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_openings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-openings"] }); toast.success("Removida"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
