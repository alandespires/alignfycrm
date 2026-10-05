import * as React from "react";
import { createPortal } from "react-dom";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DUR, EASE_OUT } from "@/lib/motion";

/**
 * AlignPanel — global side-drawer / bottom-sheet used across the app.
 *
 * Desktop: slides in from the right (~640px wide, full-height, rounded-left).
 * Mobile: bottom-sheet with drag handle.
 *
 * Slot-based API so any route can compose header / tabs / body / footer:
 *
 * <AlignPanel open={open} onClose={close}
 *   eyebrow="Projeto"
 *   title="Implementação SaaS"
 *   subtitle="Acme Corp • R$ 45.000"
 *   status={{ label: "Em andamento", tone: "success" }}
 *   tabs={[{id:"overview",label:"Visão geral"}, ...]} activeTab={tab} onTabChange={setTab}
 *   footer={<AlignPanelFooter primary={{label:"Salvar", onClick:save}} secondary={{label:"Fechar", onClick:close}} />}
 * >
 *   ...body content...
 * </AlignPanel>
 */

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted-foreground border-border",
  success: "bg-primary/10 text-primary border-primary/25",
  warn: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
};

export interface AlignPanelTab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface AlignPanelProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: { label: string; tone?: Tone };
  headerActions?: React.ReactNode;
  tabs?: AlignPanelTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  footer?: React.ReactNode;
  /** Desktop width, default max-w-[640px] */
  widthClass?: string;
  children?: React.ReactNode;
  /** Show the expand-to-fullscreen button */
  expandable?: boolean;
}

export function AlignPanel({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  status,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  footer,
  widthClass = "md:max-w-[640px]",
  children,
  expandable = false,
}: AlignPanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const auto = panel.querySelector<HTMLElement>("[autofocus],[data-autofocus]");
      (auto ?? focusables()[0] ?? panel).focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const toneClass = TONE_STYLES[status?.tone ?? "success"];

  const panelInitial = isDesktop ? { x: "100%" } : { y: "100%" };
  const panelAnimate = isDesktop ? { x: 0 } : { y: 0 };
  const panelExit = isDesktop ? { x: "100%" } : { y: "100%" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="align-panel-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.base, ease: EASE_OUT }}
          className={cn(
            "fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end",
            "bg-black/55 backdrop-blur-md"
          )}
          onClick={onClose}
          aria-modal
          role="dialog"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={{ duration: DUR.panel, ease: EASE_OUT }}
            className={cn(
              "relative flex w-full flex-col overflow-hidden bg-surface-1 text-foreground",
              "border border-border/60 shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.6),0_20px_60px_-12px_rgba(0,0,0,0.4)]",
              "max-h-[92vh] rounded-t-[28px] border-b-0",
              "md:h-full md:max-h-none md:rounded-l-[24px] md:rounded-tr-none md:border-r-0",
              expanded ? "md:max-w-none md:w-full" : widthClass
            )}
          >
        {/* subtle top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.04] to-transparent" />

        {/* mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <header className="relative shrink-0 px-6 pt-4 pb-4 md:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {(eyebrow || status) && (
                <div className="flex items-center gap-2">
                  {status && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                        toneClass
                      )}
                    >
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        status.tone === "success" || !status.tone ? "bg-primary shadow-[0_0_8px_var(--primary)]" :
                        status.tone === "warn" ? "bg-warning" :
                        status.tone === "danger" ? "bg-destructive" :
                        status.tone === "info" ? "bg-info" : "bg-muted-foreground"
                      )} />
                      {status.label}
                    </span>
                  )}
                  {eyebrow && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {eyebrow}
                    </span>
                  )}
                </div>
              )}
              <h2 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {headerActions}
              {expandable && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
                  aria-label={expanded ? "Recolher" : "Expandir"}
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <nav className="scrollbar-none mt-5 -mb-px flex gap-5 overflow-x-auto border-b border-border/60">
              {tabs.map((t) => {
                const active = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    disabled={t.disabled}
                    onClick={() => onTabChange?.(t.id)}
                    className={cn(
                      "group relative shrink-0 whitespace-nowrap pb-3 text-sm font-medium transition",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      t.disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {t.label}
                      {typeof t.count === "number" && (
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          active ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground"
                        )}>
                          {t.count}
                        </span>
                      )}
                    </span>
                    {active && (
                      <motion.span
                        layoutId="align-tab-underline"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* Body */}
        <div className={cn(
          "min-h-0 flex-1 overflow-y-auto px-6 py-5",
          footer ? "pb-28" : "pb-8"
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <footer className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-surface-1/85 px-6 py-4 backdrop-blur-xl">
            {footer}
          </footer>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Convenience footer with primary + secondary CTAs */
export function AlignPanelFooter({
  primary,
  secondary,
  extra,
}: {
  primary?: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };
  secondary?: { label: string; onClick: () => void };
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {extra}
      {secondary && (
        <button
          onClick={secondary.onClick}
          className="h-11 flex-1 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-foreground transition hover:bg-surface-3 active:scale-[0.98]"
        >
          {secondary.label}
        </button>
      )}
      {primary && (
        <button
          onClick={primary.onClick}
          disabled={primary.disabled || primary.loading}
          className={cn(
            "h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition",
            "shadow-[0_8px_20px_-4px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
            "hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            secondary ? "flex-[2]" : "flex-1"
          )}
        >
          {primary.loading ? "Aguarde…" : primary.label}
        </button>
      )}
    </div>
  );
}

/** Section wrapper for consistent body content */
export function AlignPanelSection({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
