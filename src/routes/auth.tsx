import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";
import alignIcon from "@/assets/align-icon.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Align CRM" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const { loading: tenantLoading, isSuperAdmin, memberships } = useTenant();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "recovery">(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("recovery") === "true") return "recovery";
    return "signin";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (mode === "recovery" || loading || !user || tenantLoading) return;
    if (memberships.length > 0) {
      navigate({ to: "/t/$tenantSlug", params: { tenantSlug: memberships[0].tenant.slug } });
    } else if (isSuperAdmin) {
      navigate({ to: "/super-admin" });
    } else {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, tenantLoading, memberships, isSuperAdmin, navigate, mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "forgot") {
      const redirectTo = `${window.location.origin}/auth?recovery=true`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Enviamos as instruções para o seu e-mail."); setMode("signin"); }
      return;
    }
    if (mode === "recovery") {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Senha atualizada."); setMode("signin"); navigate({ to: "/" }); }
      return;
    }
    const res = mode === "signin" ? await signIn(email, password) : await signUp(email, password, fullName);
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
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-black shadow-glow ring-1 ring-primary/40">
              <img src={alignIcon} alt="Align" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Align CRM</div>
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
          <div className="text-xs text-muted-foreground">© Align CRM · Premium B2B Sales Intelligence</div>
        </div>
      </div>

      {/* Lado direito: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-black shadow-glow ring-1 ring-primary/40">
              <img src={alignIcon} alt="Align" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-sm font-semibold">Align CRM</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Entrar na sua conta" : mode === "signup" ? "Criar sua conta" : mode === "forgot" ? "Recuperar senha" : "Definir nova senha"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Acesse seu pipeline em segundos." : mode === "signup" ? "Comece grátis. Sem cartão." : mode === "forgot" ? "Enviaremos um link seguro para o seu e-mail." : "Escolha uma nova senha com pelo menos 6 caracteres."}
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
            {mode !== "recovery" && <div>
              <label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                id="auth-email"
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="voce@empresa.com"
              />
            </div>}
            {mode !== "forgot" && <div>
              <label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground">Senha</label>
              <div className="relative mt-1.5">
              <input
                id="auth-password" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-surface-1 px-3 pr-11 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
              <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              </div>
            </div>}
            {mode === "signin" && <button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-primary hover:underline">Esqueci minha senha</button>}
            <button
              type="submit" disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link de recuperação" : "Atualizar senha"}
            </button>
          </form>

          {mode !== "forgot" && mode !== "recovery" && <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </div>}
          {(mode === "forgot" || mode === "recovery") && <button type="button" onClick={() => setMode("signin")} className="mt-6 w-full text-center text-sm font-semibold text-primary hover:underline">Voltar ao login</button>}
        </div>
      </div>
    </div>
  );
}
