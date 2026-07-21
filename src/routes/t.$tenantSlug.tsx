import { createFileRoute, Outlet, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTenant } from "@/contexts/tenant-context";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/t/$tenantSlug")({
  component: TenantLayout,
});

function TenantLayout() {
  const { tenantSlug } = useParams({ from: "/t/$tenantSlug" });
  const { user, loading: authLoading } = useAuth();
  const { loading, memberships, current, setCurrentBySlug, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!loading && tenantSlug) setCurrentBySlug(tenantSlug);
  }, [tenantSlug, loading, setCurrentBySlug]);

  useEffect(() => {
    if (!loading && memberships.length === 0 && !isSuperAdmin) {
      navigate({ to: "/onboarding" });
    }
  }, [loading, memberships, isSuperAdmin, navigate]);

  if (authLoading || loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const found = memberships.find((m) => m.tenant.slug === tenantSlug);
  if (!found) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-warning" />
          <h1 className="text-xl font-semibold">Empresa não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">Você não tem acesso a esta empresa, ou ela não existe.</p>
          <div className="mt-6 flex justify-center gap-2">
            {memberships[0] && (
              <Link to="/t/$tenantSlug" params={{ tenantSlug: memberships[0].tenant.slug }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Ir para {memberships[0].tenant.nome}
              </Link>
            )}
            <Link to="/onboarding" className="rounded-md border border-border bg-surface-1 px-4 py-2 text-sm">Criar empresa</Link>
          </div>
        </div>
      </div>
    );
  }

  // Não renderiza queries do tenant anterior durante a troca de slug.
  if (current?.tenant.slug !== tenantSlug) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (current?.tenant.status === "suspenso" || current?.tenant.status === "cancelado") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Acesso suspenso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A assinatura desta empresa está {current.tenant.status === "suspenso" ? "suspensa" : "cancelada"}.
            Entre em contato com o administrador da plataforma.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
