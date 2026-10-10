import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { TenantProvider } from "@/contexts/tenant-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "sonner";
import { Loader2, ShieldX } from "@/components/ui/icons";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { canAccessPath } from "@/lib/access-control";
import alignIcon from "@/assets/align-icon.png";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe ou foi movida.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050505" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "Align CRM — CRM Inteligente com IA" },
      { name: "description", content: "Align CRM é uma plataforma SaaS multi-tenant de CRM inteligente com IA." },
      { name: "author", content: "Align" },
      { property: "og:title", content: "Align CRM — CRM Inteligente com IA" },
      { property: "og:description", content: "Align CRM é uma plataforma SaaS multi-tenant de CRM inteligente com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Align CRM — CRM Inteligente com IA" },
      { name: "twitter:description", content: "Align CRM é uma plataforma SaaS multi-tenant de CRM inteligente com IA." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
     { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
     { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&display=swap" },

      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <AccessBoundary />
            <Toaster position="top-right" richColors />
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AccessBoundary() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { current, loading: tenantLoading, isSuperAdmin } = useTenant();

  const isPublic = pathname === "/auth" || pathname === "/onboarding" || pathname.startsWith("/t/");
  if (isPublic) return <Outlet />;

  if (authLoading || (user && tenantLoading)) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <AccessMessage title="Sessão necessária" description="Entre na sua conta para acessar o CRM." actionLabel="Ir para o login" actionTo="/auth" />;
  }

  if (pathname.startsWith("/super-admin") && !canAccessPath(pathname, current?.tenant.segmento ?? "geral", isSuperAdmin)) {
    return <AccessMessage title="Acesso restrito" description="Esta área está disponível somente para administradores da plataforma." />;
  }

  const segment = current?.tenant.segmento ?? "geral";
  if (pathname.startsWith("/clinicas") && !canAccessPath(pathname, segment, isSuperAdmin)) {
    return <AccessMessage title="Módulo não contratado" description="O módulo Align Clínicas não está habilitado para este workspace. Fale com o administrador do workspace para solicitar acesso." />;
  }
  if ((pathname.startsWith("/escolar") || pathname.startsWith("/portal-aluno")) && !canAccessPath(pathname, segment, isSuperAdmin)) {
    return <AccessMessage title="Módulo não contratado" description="O módulo Align Escolar não está habilitado para este workspace. Fale com o administrador do workspace para solicitar acesso." />;
  }

  return <Outlet />;
}

function AccessMessage({
  title,
  description,
  actionLabel = "Voltar ao início",
  actionTo = "/",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-4">
      <Link to="/" aria-label="Voltar ao Align CRM" className="absolute left-6 top-5 flex items-center gap-2 text-sm font-semibold">
        <img src={alignIcon} alt="" className="h-9 w-9 rounded-xl bg-black object-contain" />
        <span>Align CRM</span>
      </Link>
      <div className="max-w-md rounded-2xl border border-border bg-surface-1 p-8 text-center shadow-card">
        <ShieldX className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Link to={actionTo} className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {actionLabel}
        </Link>
        {title === "Módulo não contratado" && (
          <Link to="/configuracoes" className="ml-2 mt-6 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground">
            Ver configurações
          </Link>
        )}
      </div>
    </div>
  );
}
