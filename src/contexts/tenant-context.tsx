import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

export type TenantRole = "tenant_admin" | "tenant_user";
export type TenantStatus = "trial" | "ativo" | "suspenso" | "cancelado";

export type TenantRow = {
  id: string;
  nome: string;
  slug: string;
  status: TenantStatus;
  plan_id: string | null;
  proximo_vencimento: string | null;
  trial_ate: string | null;
  responsavel: string | null;
  email_principal: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  segmento?: "geral" | "clinica" | "escolar" | null;
};

export type Membership = {
  tenant: TenantRow;
  role: TenantRole;
};

type MembershipQueryRow = {
  role: TenantRole;
  tenant: TenantRow | TenantRow[] | null;
};

type TenantCtx = {
  loading: boolean;
  isSuperAdmin: boolean;
  memberships: Membership[];
  current: Membership | null;
  setCurrentBySlug: (slug: string) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<TenantCtx | undefined>(undefined);

// Store global do tenant ativo — usado pelos hooks fora do React tree
let _activeTenantId: string | null = null;
export function getActiveTenantId(): string | null {
  return _activeTenantId;
}
export function requireTenantId(): string {
  if (!_activeTenantId) throw new Error("Nenhum tenant ativo. Acesse via /t/{slug}.");
  return _activeTenantId;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Roles globais
  const rolesQ = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });

  // Tenants em que o usuário é membro
  const membershipsQ = useQuery({
    queryKey: ["my-memberships", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("role, tenant:tenants(id, nome, slug, status, plan_id, proximo_vencimento, trial_ate, responsavel, email_principal, whatsapp, logo_url, segmento)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return ((data ?? []) as unknown as MembershipQueryRow[])
        .map((row) => ({ ...row, tenant: Array.isArray(row.tenant) ? (row.tenant[0] ?? null) : row.tenant }))
        .filter((row): row is { role: TenantRole; tenant: TenantRow } => !!row.tenant)
        .map((row) => ({ role: row.role, tenant: row.tenant }));
    },
  });

  const isSuperAdmin = (rolesQ.data ?? []).includes("super_admin");
  const memberships = useMemo(() => membershipsQ.data ?? [], [membershipsQ.data]);

  // Determina tenant ativo
  const current = useMemo<Membership | null>(() => {
    if (!memberships.length) return null;
    if (activeSlug) {
      const found = memberships.find((m) => m.tenant.slug === activeSlug);
      if (found) return found;
    }
    // fallback: localStorage ou primeiro
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ks:tenant");
      if (stored) {
        const found = memberships.find((m) => m.tenant.slug === stored);
        if (found) return found;
      }
    }
    return memberships[0];
  }, [memberships, activeSlug]);

  // Hooks legados consultam este valor durante o render. Sincronizar antes de
  // renderizar os filhos evita que deep links montem queries permanentemente
  // desabilitadas enquanto o tenant ainda estava nulo.
  _activeTenantId = current?.tenant.id ?? null;

  // Sync localStorage + caches dependentes do tenant
  useEffect(() => {
    if (current && typeof window !== "undefined") {
      localStorage.setItem("ks:tenant", current.tenant.slug);
    }
    // Invalida queries que dependem de tenant
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["deals"] });
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["automations"] });
    qc.invalidateQueries({ queryKey: ["ai_insights"] });
    qc.invalidateQueries({ queryKey: ["fin-entries"] });
    qc.invalidateQueries({ queryKey: ["fin-expenses"] });
    qc.invalidateQueries({ queryKey: ["fin-subs"] });
    qc.invalidateQueries({ queryKey: ["fin-comm"] });
  }, [current, qc]);

  function setCurrentBySlug(slug: string) {
    setActiveSlug(slug);
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-memberships"] }),
      qc.invalidateQueries({ queryKey: ["my-roles"] }),
    ]);
  }

  const loading = authLoading || rolesQ.isLoading || membershipsQ.isLoading;

  return (
    <Ctx.Provider value={{ loading, isSuperAdmin, memberships, current, setCurrentBySlug, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTenant() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTenant must be inside TenantProvider");
  return c;
}

export function useCurrentTenant(): TenantRow {
  const { current } = useTenant();
  if (!current) throw new Error("Sem tenant ativo");
  return current.tenant;
}
