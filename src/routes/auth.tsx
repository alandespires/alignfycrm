import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Launcher CRM" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const { loading: tenantLoading, isSuperAdmin, memberships } = useTenant();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || tenantLoading) return;
    if (memberships.length > 0) {
      navigate({ to: "/t/$tenantSlug", params: { tenantSlug: memberships[0].tenant.slug } });
    } else if (isSuperAdmin) {
      navigate({ to: "/super-admin" });
    } else {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, tenantLoading, memberships, isSuperAdmin, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, fullName);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
    } else if (mode === "signup") {
      toast.success("Conta criada! Verifique seu email se a confirmação estiver ativada.");
    } else {
      toast.success("Bem-vindo de volta.");
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      {/* Lado esquerdo: brand */}
      <div className="relative hidden overflow-hidden border-r border-border bg-gradient-to-br from-surface-1 via-background to-background lg:block">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 50% at 30% 20%, oklch(0.685 0.175 45 / 0.25), transparent 70%)" }} />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Launcher CRM</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inteligência comercial</div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              Onde estão suas vendas?<br />
              <span className="text-muted-foreground">A IA já sabe.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              CRM com pipeline visual, automações e insights de IA — tudo num só lugar para fechar mais negócios.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">© KS · Premium B2B Sales Intelligence</div>
        </div>
      </div>

      {/* Lado direito: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Launcher CRM</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Entrar na sua conta" : "Criar sua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Acesse seu pipeline em segundos." : "Comece grátis. Sem cartão."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
                <input
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Anna Duarte"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="voce@empresa.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Senha</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}