import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, Loader2, Building2, ArrowRight, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Launcher CRM" }] }),
  component: OnboardingPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { loading: tenantLoading, isSuperAdmin, memberships, refresh } = useTenant();

  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  // Se já tem tenant, vai direto pro primeiro
  useEffect(() => {
    if (!tenantLoading && memberships.length > 0) {
      navigate({ to: "/t/$tenantSlug", params: { tenantSlug: memberships[0].tenant.slug } });
    }
  }, [tenantLoading, memberships, navigate]);

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    if (!user || !nome.trim()) return;
    setBusy(true);
    try {
      const baseSlug = slugify(nome);
      // RPC SECURITY DEFINER: cria tenant + membership atomicamente,
      // evitando qualquer problema de RLS no client.
      const { data: tenant, error } = await supabase.rpc("create_tenant_with_owner", {
        _nome: nome.trim(),
        _slug: baseSlug,
        _responsavel: user.user_metadata?.full_name || null,
        _email_principal: user.email!,
      });
      if (error) throw error;
      if (!tenant) throw new Error("Falha ao criar empresa");

      await refresh();
      toast.success("Empresa criada! Bem-vindo ao seu CRM.");
      navigate({ to: "/t/$tenantSlug", params: { tenantSlug: (tenant as any).slug } });
    } catch (e: any) {
      console.error("[onboarding] createTenant error:", e);
      toast.error(e.message ?? "Erro ao criar empresa");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || tenantLoading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Launcher CRM</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">CRM Inteligente com ia</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Vamos criar sua empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada empresa tem seu próprio ambiente isolado, dados e usuários. Comece com 14 dias de trial.
        </p>

        <form onSubmit={createTenant} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome da empresa *</label>
            <div className="relative mt-1.5">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                required value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Acme Marketing"
                className="h-11 w-full rounded-lg border border-border bg-surface-1 pl-10 pr-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {nome && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">URL: <span className="font-mono text-foreground/80">/t/{slugify(nome)}</span></p>
            )}
          </div>
          <button type="submit" disabled={busy || !nome.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar empresa <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
          {isSuperAdmin && (
            <Link to="/super-admin" className="font-semibold text-primary hover:underline">Painel Super Admin →</Link>
          )}
          <button onClick={() => signOut()} className="ml-auto inline-flex items-center gap-1 hover:text-foreground">
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
