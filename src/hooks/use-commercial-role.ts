import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useTenant, getActiveTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type CommercialRole = "admin" | "comercial" | "visualizador";

export function useMyCommercialRole() {
  const { user } = useAuth();
  const { current } = useTenant();
  const tenantId = current?.tenant.id ?? null;
  const isTenantAdmin = current?.role === "tenant_admin";

  const q = useQuery({
    queryKey: ["commercial-role", user?.id, tenantId],
    enabled: !!user && !!tenantId,
    queryFn: async (): Promise<CommercialRole | null> => {
      const { data, error } = await supabase
        .from("user_commercial_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as CommercialRole) ?? null;
    },
  });

  const explicit = q.data ?? null;
  // Tenant admin sempre tem poderes de admin comercial
  const role: CommercialRole = isTenantAdmin ? "admin" : (explicit ?? "visualizador");
  const canEdit = role === "admin" || role === "comercial";
  const canDelete = role === "admin";

  return { role, canEdit, canDelete, isExplicit: !!explicit, loading: q.isLoading };
}

export type TeamMemberRow = {
  user_id: string;
  role: "tenant_admin" | "tenant_user";
  commercial_role: CommercialRole | null;
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

export function useTeam() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["team", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const { data: members, error } = await supabase
        .from("tenant_users")
        .select("user_id, role")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: croles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids),
        supabase.from("user_commercial_roles").select("user_id, role").eq("tenant_id", tenantId!).in("user_id", ids),
      ]);
      return (members ?? []).map((m) => {
        const p = (profiles ?? []).find((x: any) => x.id === m.user_id);
        const cr = (croles ?? []).find((x: any) => x.user_id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role as "tenant_admin" | "tenant_user",
          commercial_role: (cr?.role as CommercialRole | undefined) ?? null,
          profile: p ? { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url } : null,
        };
      });
    },
  });
}

export function useSetCommercialRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: CommercialRole }) => {
      const tenantId = getActiveTenantId();
      if (!tenantId) throw new Error("Sem tenant ativo");
      const { error } = await supabase
        .from("user_commercial_roles")
        .upsert({ tenant_id: tenantId, user_id: userId, role }, { onConflict: "tenant_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["commercial-role"] });
      toast.success("Permissão atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar permissão"),
  });
}
