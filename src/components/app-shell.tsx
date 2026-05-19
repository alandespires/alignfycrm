import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Kanban, Building2, ListChecks, Zap, Sparkles,
  BarChart3, Settings, Search, Plus, LogOut, Loader2, Sun, Moon, Shield, Wallet,
  Stethoscope, Target, FileText, UserCircle, Building, History, Megaphone, Mail,
  Globe, LifeBuoy, BookOpen, MessageCircle, LineChart, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Home, ShoppingBag, HeartHandshake, BrainCircuit,
  Briefcase, Cog, GraduationCap, BookMarked, ClipboardList, CalendarCheck, Bell, IdCard,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { useTheme } from "@/contexts/theme-context";
import { useLeads } from "@/hooks/use-leads";
import { AiCoachButton } from "@/components/ai-coach-panel";
import { NotificationsPopover } from "@/components/notifications-popover";

type NavItem = { to: string; label: string; icon: any; badge?: string; clinicOnly?: boolean; schoolOnly?: boolean };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[]; schoolOnly?: boolean };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "inicio", label: "Início", icon: Home,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "vendas", label: "Vendas", icon: ShoppingBag,
    items: [
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/pipeline", label: "Pipeline", icon: Kanban },
      { to: "/oportunidades", label: "Oportunidades", icon: Target },
      { to: "/propostas", label: "Propostas", icon: FileText },
    ],
  },
  {
    id: "clientes", label: "Clientes", icon: HeartHandshake,
    items: [
      { to: "/clientes", label: "Clientes", icon: Building2 },
      { to: "/contatos", label: "Contatos", icon: UserCircle },
      { to: "/empresas", label: "Empresas", icon: Building },
      { to: "/interacoes", label: "Histórico", icon: History },
      { to: "/clinicas", label: "Launcher Clínicas", icon: Stethoscope, clinicOnly: true },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      { to: "/campanhas", label: "Campanhas", icon: Megaphone },
      { to: "/email-marketing", label: "E-mail Marketing", icon: Mail },
      { to: "/landing-pages", label: "Landing Pages", icon: Globe },
      { to: "/automacao", label: "Automação", icon: Zap },
    ],
  },
  {
    id: "suporte", label: "Suporte", icon: LifeBuoy,
    items: [
      { to: "/tickets", label: "Tickets", icon: LifeBuoy },
      { to: "/base-conhecimento", label: "Base de Conhecimento", icon: BookOpen },
      { to: "/chat", label: "Chat ao Vivo", icon: MessageCircle },
    ],
  },
  {
    id: "inteligencia", label: "Inteligência", icon: BrainCircuit,
    items: [
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/insights", label: "Launch", icon: Sparkles },
      { to: "/dashboards", label: "Dashboards", icon: LineChart },
    ],
  },
  {
    id: "gestao", label: "Gestão", icon: Briefcase,
    items: [
      { to: "/tarefas", label: "Tarefas", icon: ListChecks },
      { to: "/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    id: "escolar", label: "Launcher Escolar", icon: GraduationCap, schoolOnly: true,
    items: [
      { to: "/escolar", label: "Visão geral", icon: LayoutDashboard, schoolOnly: true },
      { to: "/escolar/cursos", label: "Cursos", icon: BookMarked, schoolOnly: true },
      { to: "/escolar/turmas", label: "Turmas", icon: Users, schoolOnly: true },
      { to: "/escolar/alunos", label: "Alunos", icon: GraduationCap, schoolOnly: true },
      { to: "/escolar/professores", label: "Professores", icon: IdCard, schoolOnly: true },
      { to: "/escolar/diario", label: "Diário de Classe", icon: ClipboardList, schoolOnly: true },
      { to: "/escolar/avaliacoes", label: "Avaliações", icon: FileText, schoolOnly: true },
      { to: "/escolar/frequencia", label: "Frequência", icon: CalendarCheck, schoolOnly: true },
      { to: "/escolar/comunicacao", label: "Comunicação", icon: Bell, schoolOnly: true },
      { to: "/escolar/configuracoes", label: "Configurações", icon: Cog, schoolOnly: true },
    ],
  },
  {
    id: "config", label: "Configurações", icon: Cog,
    items: [{ to: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

const COLLAPSED_KEY = "ks-sidebar-collapsed";
const GROUPS_OPEN_KEY = "ks-sidebar-groups";

export function AppShell({ children, title, subtitle, action }: {
  children: ReactNode; title: string; subtitle?: string; action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, signOut } = useAuth();
  const { loading: tenantLoading, memberships, isSuperAdmin, current } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(GROUPS_OPEN_KEY) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (tenantLoading) return;
    if (memberships.length === 0 && !isSuperAdmin) navigate({ to: "/onboarding" });
  }, [user, loading, tenantLoading, memberships, isSuperAdmin, navigate]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem(GROUPS_OPEN_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  if (loading || !user || tenantLoading || (memberships.length === 0 && !isSuperAdmin)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || "U")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0];

  function toggleGroup(id: string) {
    setOpenGroups((p) => ({ ...p, [id]: !(p[id] ?? true) }));
  }

  // Auto-open the group containing active route
  function isGroupOpen(g: NavGroup) {
    const hasActive = g.items.some((i) => i.to === "/" ? pathname === "/" : pathname.startsWith(i.to));
    if (hasActive) return true;
    return openGroups[g.id] ?? true;
  }

  const segmento = (current?.tenant as any)?.segmento;
  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-sidebar transition-all duration-200 md:flex ${sidebarWidth}`}>
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Launcher CRM</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sales · Marketing · IA</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => {
            if (group.schoolOnly && segmento !== "escolar") return null;
            const items = group.items.filter((i) => (!i.clinicOnly || segmento === "clinica") && (!i.schoolOnly || segmento === "escolar"));
            if (items.length === 0) return null;
            const open = isGroupOpen(group);
            const GIcon = group.icon;

            // Single-item groups render as direct link
            if (items.length === 1 && (group.id === "inicio" || group.id === "config")) {
              const item = items[0];
              const Icon = item.icon;
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={group.id}
                  to={item.to as any}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active ? "bg-surface-3 text-foreground shadow-card" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                  {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.685_0.175_45)]" />}
                </Link>
              );
            }

            return (
              <div key={group.id} className="pt-1">
                {collapsed ? (
                  <div className="my-1 h-px bg-border/60" />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={[
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition",
                      group.schoolOnly
                        ? "text-primary hover:text-primary"
                        : "text-muted-foreground/70 hover:text-foreground",
                    ].join(" ")}
                  >
                    <GIcon className={`h-3 w-3 ${group.schoolOnly ? "text-primary" : ""}`} />
                    <span className="flex-1 text-left">{group.label}</span>
                    {group.schoolOnly && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold text-primary">EDU</span>}
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                )}
                {(collapsed || open) && (
                  <div className="space-y-0.5">
                    {items.map(({ to, label, icon: Icon, badge }) => {
                      const active = pathname === to || (to !== "/" && pathname.startsWith(to + "/"));
                      return (
                        <Link
                          key={to}
                          to={to as any}
                          title={collapsed ? label : undefined}
                          className={[
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                            active ? "bg-surface-3 text-foreground shadow-card" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                          ].join(" ")}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                          {!collapsed && <span className="font-medium">{label}</span>}
                          {!collapsed && badge && <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">{badge}</span>}
                          {active && !collapsed && !badge && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.685_0.175_45)]" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {isSuperAdmin && !collapsed && (
          <Link
            to="/super-admin"
            className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
          >
            <Shield className="h-3.5 w-3.5" />
            Painel Super Admin
          </Link>
        )}

        {!collapsed && <SidebarCoachCard />}
      </aside>

      <div className={collapsed ? "md:pl-16" : "md:pl-64"}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-5 backdrop-blur-xl md:px-8">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar leads, negócios, clientes..."
              className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/leads"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground sm:flex"
            >
              <Plus className="h-3.5 w-3.5" /> Novo lead
            </Link>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              aria-label="Alternar tema"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationsPopover />
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-1 py-1 pl-1 pr-3">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold">{displayName}</div>
                <div className="text-[10px] text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sair"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarCoachCard() {
  const { data: leads = [] } = useLeads();
  const quentes = leads.filter((l) => (l.ai_score ?? 0) >= 70 && l.status !== "fechado" && l.status !== "perdido").length;
  return (
    <div className="m-3 rounded-xl border border-border bg-gradient-to-br from-surface-2 to-surface-1 p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Launch</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Você tem <span className="font-semibold text-foreground">{quentes} {quentes === 1 ? "lead quente" : "leads quentes"}</span> aguardando ação hoje.
      </p>
      <AiCoachButton />
    </div>
  );
}

export function PrimaryButton({ children, icon: Icon, ...rest }: { children: ReactNode; icon?: any } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110">
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function StatusPill({ tone, children }: { tone: "success" | "warn" | "info" | "danger" | "neutral"; children: ReactNode }) {
  const tones: Record<string, string> = {
    success: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    info: "bg-[oklch(0.7_0.12_220)/0.15] text-[oklch(0.78_0.13_220)]",
    danger: "bg-destructive/15 text-destructive",
    neutral: "bg-surface-3 text-muted-foreground",
  };
  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone]].join(" ")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
