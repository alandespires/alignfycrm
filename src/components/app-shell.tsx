import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Users, Kanban, Building2, ListChecks, Zap, Sparkles,
  BarChart3, Settings, Plus, LogOut, Loader2, Sun, Moon, Shield, Wallet,
  Stethoscope, Target, FileText, UserCircle, Building, History, Megaphone, Mail,
  Globe, LifeBuoy, BookOpen, MessageCircle, LineChart, Briefcase, GraduationCap,
  BookMarked, ClipboardList, CalendarCheck, Bell, IdCard, MoreHorizontal, X,
  ShoppingBag, ChevronRight, Calculator, Landmark, Award,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import alignIcon from "@/assets/align-icon.png";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { useTheme } from "@/contexts/theme-context";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useOperacionalBadges } from "@/hooks/use-operacional-badges";
import { NotificationsPopover } from "@/components/notifications-popover";
import { LaunchPanel } from "@/components/launch-panel";
import { LaunchIcon } from "@/components/launch-icon";
import { ProductTour } from "@/components/product-tour";
import { LeadFormDialog } from "@/components/lead-form-dialog";


/* ============================================================
 * Align CRM — Liquid Glass shell (iOS 26-inspired)
 *  - No sidebar
 *  - Floating bottom dock (glass) on every viewport
 *  - 5 slots: Dashboard · Comercial · Tarefas · Financeiro · Mais
 * ============================================================ */

type SubItem = { to: string; label: string; icon: any; clinicOnly?: boolean; schoolOnly?: boolean; availability?: "coming-soon" };
type SubGroup = { id: string; label: string; icon: any; items: SubItem[]; schoolOnly?: boolean };

// Items under "Comercial" dock slot
const COMERCIAL_GROUPS: SubGroup[] = [
  {
    id: "vendas", label: "Vendas", icon: ShoppingBag,
    items: [
      { to: "/leads", label: "Leads", icon: Users },
      { to: "/prospeccao", label: "Prospecção B2B", icon: Target },
      { to: "/pipeline", label: "Pipeline", icon: Kanban },
      { to: "/oportunidades", label: "Oportunidades", icon: Target },
      { to: "/propostas", label: "Propostas", icon: FileText },
    ],
  },
  {
    id: "clientes", label: "Clientes", icon: Building2,
    items: [
      { to: "/clientes", label: "Clientes", icon: Building2 },
      { to: "/contatos", label: "Contatos", icon: UserCircle },
      { to: "/empresas", label: "Empresas", icon: Building },
      { to: "/interacoes", label: "Histórico", icon: History },
      { to: "/clinicas", label: "Align Clínicas", icon: Stethoscope, clinicOnly: true },
    ],
  },
];

// Items under "Operacional" dock slot
const OPERACIONAL_GROUPS: SubGroup[] = [
  {
    id: "trabalho", label: "Trabalho", icon: Briefcase,
    items: [
      { to: "/projetos", label: "Projetos", icon: Briefcase },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks },
      { to: "/metas", label: "Metas", icon: ListChecks },
      { to: "/equipe", label: "Equipe", icon: Users },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      { to: "/campanhas", label: "Campanhas", icon: Megaphone },
      { to: "/email-marketing", label: "E-mail", icon: Mail, availability: "coming-soon" },
      { to: "/landing-pages", label: "Landing Pages", icon: Globe, availability: "coming-soon" },
      { to: "/automacao", label: "Automação", icon: Zap },
    ],
  },
  {
    id: "consultor", label: "Consultor", icon: Briefcase,
    items: [
      { to: "/consultor", label: "Painel", icon: LineChart },
      { to: "/consultor/simulador", label: "Simulador", icon: Calculator },
      { to: "/consultor/cotas", label: "Cotas", icon: ListChecks },
      { to: "/consultor/contemplacoes", label: "Contemplações", icon: Award },
      { to: "/consultor/comissoes", label: "Comissões", icon: Wallet },
      { to: "/consultor/credito", label: "Crédito", icon: Landmark },
    ],
  },
  {
    id: "suporte", label: "Suporte", icon: LifeBuoy,
    items: [
      { to: "/tickets", label: "Tickets", icon: LifeBuoy },
      { to: "/base-conhecimento", label: "Base", icon: BookOpen },
      { to: "/chat", label: "Chat", icon: MessageCircle, availability: "coming-soon" },
    ],
  },
];

// Items under "Mais" dock slot
const MAIS_GROUPS: SubGroup[] = [
  {
    id: "inteligencia", label: "Inteligência", icon: LaunchIcon,
    items: [
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/insights", label: "Launch", icon: LaunchIcon },
      { to: "/dashboards", label: "Dashboards", icon: LineChart },
    ],
  },
  {
    id: "escolar", label: "Align Escolar", icon: GraduationCap, schoolOnly: true,
    items: [
      { to: "/escolar", label: "Visão geral", icon: LayoutDashboard, schoolOnly: true },
      { to: "/escolar/cursos", label: "Cursos", icon: BookMarked, schoolOnly: true },
      { to: "/escolar/turmas", label: "Turmas", icon: Users, schoolOnly: true },
      { to: "/escolar/alunos", label: "Alunos", icon: GraduationCap, schoolOnly: true },
      { to: "/escolar/professores", label: "Professores", icon: IdCard, schoolOnly: true },
      { to: "/escolar/diario", label: "Diário", icon: ClipboardList, schoolOnly: true },
      { to: "/escolar/avaliacoes", label: "Avaliações", icon: FileText, schoolOnly: true },
      { to: "/escolar/frequencia", label: "Frequência", icon: CalendarCheck, schoolOnly: true },
      { to: "/escolar/comunicacao", label: "Comunicação", icon: Bell, schoolOnly: true },
      { to: "/escolar/configuracoes", label: "Config. Escola", icon: Settings, schoolOnly: true },
    ],
  },
  {
    id: "config", label: "Sistema", icon: Settings,
    items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

const COMERCIAL_PATHS = ["/leads", "/prospeccao", "/pipeline", "/oportunidades", "/propostas", "/clientes", "/contatos", "/empresas", "/interacoes", "/clinicas"];
const OPERACIONAL_PATHS = ["/projetos", "/tarefas", "/metas", "/equipe", "/campanhas", "/email-marketing", "/landing-pages", "/automacao", "/tickets", "/base-conhecimento", "/chat", "/consultor"];


export function AppShell({ children, title, subtitle, action }: {
  children: ReactNode; title: string; subtitle?: string; action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, signOut } = useAuth();
  const { loading: tenantLoading, memberships, isSuperAdmin, current } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const { role: commercialRole } = useMyCommercialRole();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [comercialOpen, setComercialOpen] = useState(false);
  const [operacionalOpen, setOperacionalOpen] = useState(false);
  const [maisOpen, setMaisOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const { data: opBadges } = useOperacionalBadges();
  const opBadgeTotal = (opBadges?.tasksOverdue ?? 0) + (opBadges?.projectsAtRisk ?? 0);


  const segmento = (current?.tenant as any)?.segmento;

  const filteredComercial = useMemo(
    () => COMERCIAL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => (!i.clinicOnly || segmento === "clinica") && (!i.schoolOnly || segmento === "escolar")),
    })).filter((g) => g.items.length),
    [segmento],
  );
  const filteredOperacional = useMemo(
    () => OPERACIONAL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => (!i.clinicOnly || segmento === "clinica") && (!i.schoolOnly || segmento === "escolar")),
    })).filter((g) => g.items.length),
    [segmento],
  );
  const filteredMais = useMemo(
    () => MAIS_GROUPS.map((g) => {
      if (g.schoolOnly && segmento !== "escolar") return null;
      const items = g.items.filter((i) => (!i.clinicOnly || segmento === "clinica") && (!i.schoolOnly || segmento === "escolar"));
      if (!items.length) return null;
      return { ...g, items };
    }).filter(Boolean) as SubGroup[],
    [segmento],
  );


  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (tenantLoading) return;
    if (memberships.length === 0 && !isSuperAdmin) navigate({ to: "/onboarding" });
  }, [user, loading, tenantLoading, memberships, isSuperAdmin, navigate]);

  // Close all dock sheets on route change
  useEffect(() => {
    setComercialOpen(false);
    setOperacionalOpen(false);
    setMaisOpen(false);
    setLaunchOpen(false);
  }, [pathname]);

  // Global keyboard shortcuts
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → Launch
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setComercialOpen(false); setOperacionalOpen(false); setMaisOpen(false);
        setLaunchOpen((v) => !v);
        return;
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      // Shift+O → toggle Operacional
      if (e.shiftKey && (e.key === "O" || e.key === "o")) {
        e.preventDefault();
        setComercialOpen(false); setMaisOpen(false); setLaunchOpen(false);
        setOperacionalOpen((v) => !v);
        return;
      }
      // Shift+P → Projetos, Shift+T → Tarefas
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        navigate({ to: "/projetos" });
        return;
      }
      if (e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        navigate({ to: "/tarefas" });
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);



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

  const isActive = (to: string) => to === "/" ? pathname === "/" : (pathname === to || pathname.startsWith(to + "/"));
  const isComercialActive = COMERCIAL_PATHS.some((p) => pathname.startsWith(p));
  const isOperacionalActive = OPERACIONAL_PATHS.some((p) => pathname.startsWith(p));
  const showGlobalLeadAction = !["/", "/leads", "/pipeline"].includes(pathname);


  return (
    <div className="min-h-screen bg-background text-foreground md:pl-44">
      {/* Ambient backdrop — barely-there glow, sets the premium mood */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--gradient-glow)] opacity-70 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-primary/[0.05] blur-3xl" />
      </div>

      {/* ===== Top bar (glass, minimal) ===== */}
      <header
        className="sticky top-0 z-30 border-b border-white/[0.04] bg-background/60 backdrop-blur-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 md:h-16 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-2xl bg-black ring-1 ring-primary/30 shadow-glow">
              <img src={alignIcon} alt="Align" className="h-9 w-9 object-contain" />
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold tracking-tight">Align</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Launcher</div>
            </div>
          </Link>

          <div className="flex-1" />

          <div className="ml-auto flex items-center gap-1.5">
            {showGlobalLeadAction && <LeadFormDialog trigger={(
              <button aria-label="Novo lead" className="hidden h-10 items-center gap-2 rounded-2xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 sm:inline-flex">
                <Plus className="h-3.5 w-3.5" /> Novo lead
              </button>
            )} />}
            {showGlobalLeadAction && <LeadFormDialog trigger={(
              <button aria-label="Novo lead" className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow sm:hidden">
                <Plus className="h-4 w-4" />
              </button>
            )} />}
            <button
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationsPopover />
            <div className="hidden items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] py-1 pl-1 pr-3 md:flex">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.18_145)] text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden leading-tight lg:block">
                <div className="text-xs font-semibold">{displayName}</div>
                <div className="text-[10px] capitalize text-muted-foreground">{commercialRole}</div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              aria-label="Sair"
              className="hidden h-10 w-10 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground md:grid"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </header>

      {/* ===== Main ===== */}
      <main
        className="mx-auto max-w-[1600px] px-4 pt-6 md:px-8 md:pt-10"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-[1.05]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground md:text-[15px]">{subtitle}</p>}
          </div>
          {action && <div className="w-full sm:w-auto">{action}</div>}
        </div>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="min-w-0 overflow-x-hidden"
        >
          {children}
        </motion.div>
      </main>

      {/* ===== Liquid-glass floating dock ===== */}
      <LiquidDock
        active={{ home: isActive("/"), comercial: isComercialActive, operacional: isOperacionalActive, financeiro: isActive("/financeiro") }}
        onOpenComercial={() => { setOperacionalOpen(false); setMaisOpen(false); setLaunchOpen(false); setComercialOpen((v) => !v); }}
        onOpenOperacional={() => { setComercialOpen(false); setMaisOpen(false); setLaunchOpen(false); setOperacionalOpen((v) => !v); }}
        onOpenMais={() => { setComercialOpen(false); setOperacionalOpen(false); setLaunchOpen(false); setMaisOpen((v) => !v); }}
        onOpenLaunch={() => { setComercialOpen(false); setOperacionalOpen(false); setMaisOpen(false); setLaunchOpen((v) => !v); }}
        comercialOpen={comercialOpen}
        operacionalOpen={operacionalOpen}
        maisOpen={maisOpen}
        launchOpen={launchOpen}
        operacionalBadge={opBadgeTotal}
      />


      {/* Comercial popover */}
      {comercialOpen && (
        <DockSheet title="Comercial" onClose={() => setComercialOpen(false)} groups={filteredComercial} pathname={pathname} />
      )}
      {/* Operacional popover */}
      {operacionalOpen && (
        <DockSheet title="Operacional" onClose={() => setOperacionalOpen(false)} groups={filteredOperacional} pathname={pathname} />
      )}

      {/* Mais popover */}
      {maisOpen && (
        <DockSheet
          title="Mais"
          onClose={() => setMaisOpen(false)}
          groups={filteredMais}
          pathname={pathname}
          footer={
            <div className="space-y-2">
              {isSuperAdmin && (
                <Link to="/super-admin" className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-3 text-xs font-semibold text-primary">
                  <Shield className="h-4 w-4" /> Painel Super Admin
                </Link>
              )}
              <button onClick={() => signOut()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                <LogOut className="h-4 w-4" /> Sair da conta
              </button>
            </div>
          }
        />
      )}

      <LaunchPanel open={launchOpen} onClose={() => setLaunchOpen(false)} />
      <ProductTour />
    </div>
  );
}

/* -------------------- Dock -------------------- */
function LiquidDock({
  active, onOpenComercial, onOpenOperacional, onOpenMais, onOpenLaunch, comercialOpen, operacionalOpen, maisOpen, launchOpen, operacionalBadge,
}: {
  active: { home: boolean; comercial: boolean; operacional: boolean; financeiro: boolean };
  onOpenComercial: () => void; onOpenOperacional: () => void; onOpenMais: () => void; onOpenLaunch: () => void;
  comercialOpen: boolean; operacionalOpen: boolean; maisOpen: boolean; launchOpen: boolean;
  operacionalBadge?: number;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-40 flex justify-center px-2 sm:px-3 md:inset-x-auto md:bottom-auto md:left-4 md:top-1/2 md:w-40 md:-translate-y-1/2 md:justify-start md:px-0"
    >
      <div className="relative w-full max-w-[calc(100vw-1rem)] sm:w-auto md:w-full md:max-w-none">
        {/* glow under the dock */}
        <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-primary/[0.06] blur-2xl" />
        <ul
          className="flex items-center justify-between gap-0.5 overflow-x-auto rounded-[28px] border border-white/[0.08] bg-background/90 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150 sm:gap-1 sm:justify-center md:flex-col md:items-stretch md:overflow-visible md:rounded-3xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <DockItem to="/" label="Dashboard" icon={LayoutDashboard} active={active.home} />
          <DockButton label="Comercial" icon={ShoppingBag} active={active.comercial || comercialOpen} onClick={onOpenComercial} />
          <DockButton label="Operacional" icon={Briefcase} active={active.operacional || operacionalOpen} onClick={onOpenOperacional} badge={operacionalBadge} />
          <DockItem to="/financeiro" label="Financeiro" icon={Wallet} active={active.financeiro} />
          <DockButton label="Mais" icon={MoreHorizontal} active={maisOpen} onClick={onOpenMais} />

          {/* divider */}
          <li aria-hidden className="mx-1 hidden h-7 w-px bg-white/[0.08] sm:block md:my-1 md:h-px md:w-auto" />
          <LaunchDockButton active={launchOpen} onClick={onOpenLaunch} />
        </ul>
      </div>
    </nav>
  );
}


function LaunchDockButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-label="Launch — Inteligência"
        className={[
          "group relative flex h-12 items-center gap-2 overflow-hidden rounded-[20px] px-3.5 transition-all duration-300 ease-out md:w-full",
          "border border-white/[0.10] bg-gradient-to-b from-white/[0.08] to-white/[0.02]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_-10px_oklch(0.7_0.18_145_/_0.45)]",
          "hover:from-white/[0.12] hover:to-white/[0.04] active:scale-[0.97]",
          active ? "ring-1 ring-primary/50" : "",
        ].join(" ")}
      >
        {/* aurora wash */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[20px] bg-[radial-gradient(120%_120%_at_50%_0%,oklch(0.72_0.18_145_/_0.22),transparent_60%)]" />
        {/* shimmer line */}
        <span aria-hidden className="pointer-events-none absolute inset-x-2 top-px h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <span className="relative grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-primary/40 to-primary/5 ring-1 ring-primary/40 shadow-[0_0_14px_-2px_oklch(0.7_0.18_145_/_0.55)]">
          <LaunchIcon className="h-4 w-4" />
        </span>
        <span className="relative hidden text-[12.5px] font-semibold tracking-tight text-foreground md:inline">Launch</span>
      </button>
    </li>
  );
}

function DockItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: any; active: boolean }) {
  return (
    <li>
      <Link
        to={to as any}
        aria-label={label}
        className={[
          "group relative flex h-12 shrink-0 items-center gap-2 rounded-[20px] px-3 transition-colors duration-300 ease-out md:w-full",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        {active && (
          <motion.span
            layoutId="dock-active-pill"
            aria-hidden
            className="absolute inset-0 rounded-[20px] bg-foreground/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-primary/25"
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          />
        )}
        <motion.span whileTap={{ scale: 0.92 }} className="relative flex items-center gap-2">
          <Icon className={["h-[18px] w-[18px]", active ? "text-primary" : ""].join(" ")} strokeWidth={active ? 2.5 : 2.2} />
          <span className={["hidden text-[12.5px] font-medium tracking-tight md:inline", active ? "" : "opacity-90"].join(" ")}>{label}</span>
        </motion.span>
      </Link>
    </li>
  );
}

function DockButton({ label, icon: Icon, active, onClick, badge }: { label: string; icon: any; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <li>
      <button
        onClick={onClick}
        aria-label={badge ? `${label} (${badge} item${badge === 1 ? "" : "s"} pendente${badge === 1 ? "" : "s"})` : label}
        className={[
          "group relative flex h-12 shrink-0 items-center gap-2 rounded-[20px] px-3 transition-colors duration-300 ease-out md:w-full",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        {active && (
          <motion.span
            layoutId="dock-active-pill"
            aria-hidden
            className="absolute inset-0 rounded-[20px] bg-foreground/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-primary/25"
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          />
        )}
        <motion.span whileTap={{ scale: 0.92 }} className="relative flex items-center gap-2">
          <Icon className={["h-[18px] w-[18px]", active ? "text-primary" : ""].join(" ")} strokeWidth={active ? 2.5 : 2.2} />
          <span className="hidden text-[12.5px] font-medium tracking-tight md:inline">{label}</span>
        </motion.span>
        {!!badge && badge > 0 && (
          <motion.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-0.5 -top-0.5 z-10 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background"
          >
            {badge > 99 ? "99+" : badge}
          </motion.span>
        )}
      </button>
    </li>
  );
}



/* -------------------- Sheet (popover for Comercial / Mais) -------------------- */
function DockSheet({
  title, onClose, groups, pathname, footer,
}: {
  title: string; onClose: () => void; groups: SubGroup[]; pathname: string; footer?: ReactNode;
}) {
  const isActive = (to: string) => to === "/" ? pathname === "/" : (pathname === to || pathname.startsWith(to + "/"));
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      {/* dimmer */}
      <button
        aria-label={`Dispensar menu ${title}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200"
      />
      {/* sheet */}
      <div
        ref={panelRef}
        className="absolute inset-x-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(900px,calc(100vw-32px))] rounded-[28px] border border-white/[0.08] bg-background/85 p-4 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl backdrop-saturate-150 animate-in fade-in slide-in-from-bottom-4 duration-300 md:p-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 82px)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Menu</div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} aria-label={`Fechar menu ${title}`} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(70vh,calc(100dvh-12rem))] space-y-5 overflow-y-auto overscroll-contain pr-1">
          {groups.map((g) => {
            const GIcon = g.icon;
            return (
              <section key={g.id}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <GIcon className="h-3.5 w-3.5 text-primary" />
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{g.label}</div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {g.items.map(({ to, label, icon: Icon, availability }) => {
                    const active = isActive(to);
                    return (
                      <Link
                        key={to}
                        to={to as any}
                        className={[
                          "group relative flex min-h-[52px] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                          active
                            ? "border-primary/50 bg-primary/15 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_oklch(var(--primary)/0.25)]"
                            : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:-translate-y-px hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground",
                        ].join(" ")}
                      >
                        {active && (
                          <span aria-hidden className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <div className={["grid h-9 w-9 shrink-0 place-items-center rounded-xl transition", active ? "bg-primary/25 text-primary" : "bg-white/[0.04] text-muted-foreground group-hover:text-foreground"].join(" ")}>
                          <Icon className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[13px] font-medium tracking-tight">{label}</span>
                            {availability === "coming-soon" && (
                              <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-warning">Em breve</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={["h-3.5 w-3.5 shrink-0 transition", active ? "text-primary opacity-80" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60"].join(" ")} />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>


        {footer && <div className="mt-5 border-t border-white/[0.06] pt-4">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------- Shared UI primitives (kept exports) -------------------- */
export function PrimaryButton({ children, icon: Icon, ...rest }: { children: ReactNode; icon?: any } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.98]"
    >
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
    neutral: "bg-white/[0.06] text-muted-foreground",
  };
  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone]].join(" ")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
