import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, ShoppingBag, Briefcase, Wallet, MoreHorizontal,
  ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut, Shield,
} from "lucide-react";
import { LaunchIcon } from "@/components/launch-icon";

type Item = { to: string; label: string; icon: any; availability?: string };
type Group = { id: string; label: string; icon: any; items: Item[] };

const KEY = "align.sidebar.collapsed";
const OPEN_KEY = "align.sidebar.sections";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === "1");
  }, []);
  const set = (v: boolean) => {
    setCollapsed(v);
    localStorage.setItem(KEY, v ? "1" : "0");
  };
  return [collapsed, set] as const;
}

export function DesktopSidebar({
  collapsed, onToggle, pathname, comercial, operacional, mais, active,
  operacionalBadge, onLaunch, launchOpen, isSuperAdmin, onSignOut,
}: {
  collapsed: boolean; onToggle: (v: boolean) => void; pathname: string;
  comercial: Group[]; operacional: Group[]; mais: Group[];
  active: { home: boolean; comercial: boolean; operacional: boolean; financeiro: boolean };
  operacionalBadge?: number; onLaunch: () => void; launchOpen: boolean;
  isSuperAdmin: boolean; onSignOut: () => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setOpen(JSON.parse(localStorage.getItem(OPEN_KEY) || "{}")); } catch { /* ignore */ }
  }, []);
  // auto-open the section containing the current page
  useEffect(() => {
    setOpen((o) => ({
      ...o,
      ...(active.comercial ? { comercial: true } : {}),
      ...(active.operacional ? { operacional: true } : {}),
    }));
  }, [active.comercial, active.operacional]);

  const toggle = (id: string) => {
    if (collapsed) { onToggle(false); setOpen((o) => ({ ...o, [id]: true })); return; }
    setOpen((o) => {
      const n = { ...o, [id]: !o[id] };
      localStorage.setItem(OPEN_KEY, JSON.stringify(n));
      return n;
    });
  };

  const isActive = (to: string) => to === "/" ? pathname === "/" : (pathname === to || pathname.startsWith(to + "/"));

  return (
    <aside
      aria-label="Navegação principal"
      className={[
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-background/95 backdrop-blur-xl transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-[72px]" : "w-60",
      ].join(" ")}
    >
      <div className={["flex h-16 items-center border-b border-border px-3", collapsed ? "justify-center" : "justify-end"].join(" ")}>
        <button
          onClick={() => onToggle(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        <NavLink to="/" label="Dashboard" icon={LayoutDashboard} active={active.home} collapsed={collapsed} />
        <Section id="comercial" label="Comercial" icon={ShoppingBag} groups={comercial} open={!!open.comercial} active={active.comercial} collapsed={collapsed} onToggle={toggle} isActive={isActive} />
        <Section id="operacional" label="Operacional" icon={Briefcase} groups={operacional} open={!!open.operacional} active={active.operacional} collapsed={collapsed} onToggle={toggle} isActive={isActive} badge={operacionalBadge} />
        <NavLink to="/financeiro" label="Financeiro" icon={Wallet} active={active.financeiro} collapsed={collapsed} />
        <Section id="mais" label="Mais" icon={MoreHorizontal} groups={mais} open={!!open.mais} active={false} collapsed={collapsed} onToggle={toggle} isActive={isActive}
          footer={
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              {isSuperAdmin && (
                <Link to="/super-admin" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-primary hover:bg-primary/10">
                  <Shield className="h-4 w-4" /> Super Admin
                </Link>
              )}
              <button onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground">
                <LogOut className="h-4 w-4" /> Sair da conta
              </button>
            </div>
          }
        />
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={onLaunch}
          aria-label="Launch — Inteligência"
          className={[
            "flex h-11 w-full items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-sm font-semibold text-foreground transition hover:bg-primary/15",
            collapsed ? "justify-center px-0" : "",
            launchOpen ? "ring-1 ring-primary/60" : "",
          ].join(" ")}
        >
          <LaunchIcon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Launch</span>}
          {!collapsed && <kbd className="ml-auto rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>}
        </button>
      </div>
    </aside>
  );
}

function rowClass(active: boolean, collapsed: boolean) {
  return [
    "relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors",
    collapsed ? "justify-center px-0" : "",
    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  ].join(" ");
}

function NavLink({ to, label, icon: Icon, active, collapsed }: { to: string; label: string; icon: any; active: boolean; collapsed: boolean }) {
  return (
    <Link to={to as any} title={collapsed ? label : undefined} aria-label={label} className={rowClass(active, collapsed)}>
      {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className={["h-[18px] w-[18px] shrink-0", active ? "text-primary" : ""].join(" ")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function Section({
  id, label, icon: Icon, groups, open, active, collapsed, onToggle, isActive, badge, footer,
}: {
  id: string; label: string; icon: any; groups: Group[]; open: boolean; active: boolean; collapsed: boolean;
  onToggle: (id: string) => void; isActive: (to: string) => boolean; badge?: number; footer?: ReactNode;
}) {
  const expanded = open && !collapsed;
  return (
    <div>
      <button onClick={() => onToggle(id)} aria-expanded={expanded} title={collapsed ? label : undefined} className={rowClass(active && !expanded, collapsed)}>
        {active && !expanded && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
        <Icon className={["h-[18px] w-[18px] shrink-0", active ? "text-primary" : ""].join(" ")} />
        {!collapsed && <span className="truncate">{label}</span>}
        {!!badge && badge > 0 && (
          <span className={["grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground", collapsed ? "absolute right-2 top-1" : "ml-auto"].join(" ")}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {!collapsed && <ChevronDown className={["h-3.5 w-3.5 shrink-0 transition-transform", badge ? "" : "ml-auto", expanded ? "rotate-180" : ""].join(" ")} />}
      </button>
      {expanded && (
        <div className="mb-2 ml-[22px] mt-1 space-y-3 border-l border-border pl-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {groups.map((g) => (
            <div key={g.id}>
              {groups.length > 1 && (
                <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{g.label}</div>
              )}
              {g.items.map(({ to, label: l, icon: I, availability }) => {
                const a = isActive(to);
                return (
                  <Link key={to} to={to as any} className={[
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    a ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  ].join(" ")}>
                    <I className={["h-3.5 w-3.5 shrink-0", a ? "text-primary" : ""].join(" ")} />
                    <span className="truncate">{l}</span>
                    {availability === "coming-soon" && <span className="ml-auto rounded-full bg-warning/15 px-1.5 text-[9px] font-semibold uppercase text-warning">Breve</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          {footer}
        </div>
      )}
    </div>
  );
}
