import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Users, Kanban, Zap, BarChart3, X, ArrowRight, ArrowLeft, Sparkles, Check, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId } from "@/contexts/tenant-context";

type Step = {
  id: string;
  title: string;
  desc: string;
  icon: any;
  to?: string;
  cta?: string;
  /** Objective the user must complete to auto-check this step. */
  check?: (ctx: TourContext) => boolean;
  checkHint: string;
};

type TourContext = {
  leadsCount: number;
  leadsMoved: number;
  automationsCount: number;
  visited: Record<string, boolean>;
};

const STEPS: Step[] = [
  {
    id: "leads",
    title: "Capture seu primeiro lead",
    desc: "Crie leads manualmente ou receba via API/formulários. A IA já classifica origem, interesse e prioridade.",
    icon: Users,
    to: "/leads",
    cta: "Abrir Leads",
    check: (c) => c.leadsCount > 0,
    checkHint: "Concluído quando você cria pelo menos 1 lead.",
  },
  {
    id: "pipeline",
    title: "Mova pelo pipeline",
    desc: "Arraste cards entre etapas — cada movimento dispara automações e atualiza a previsão de receita.",
    icon: Kanban,
    to: "/pipeline",
    cta: "Ver Pipeline",
    check: (c) => c.leadsMoved > 0,
    checkHint: "Concluído quando algum lead sai do estágio 'novo'.",
  },
  {
    id: "automacao",
    title: "Automatize follow-ups",
    desc: "Monte fluxos SE/ENTÃO ou use um dos 4 templates: 24h, cadência de 5 toques, lead quente, reativação.",
    icon: Zap,
    to: "/automacao",
    cta: "Configurar Automações",
    check: (c) => c.automationsCount > 0,
    checkHint: "Concluído quando você ativa pelo menos 1 automação.",
  },
  {
    id: "relatorios",
    title: "Meça tudo em relatórios",
    desc: "Conversão por etapa, previsto vs. fechado, ranking de vendedores e origens que mais convertem.",
    icon: BarChart3,
    to: "/relatorios",
    cta: "Abrir Relatórios",
    check: (c) => !!c.visited["relatorios"],
    checkHint: "Concluído ao abrir a página de Relatórios.",
  },
];

const KEY = "align_tour_v2";
type TourState = { seen: boolean; step: number; done: Record<string, boolean>; visited: Record<string, boolean> };

function readState(): TourState {
  if (typeof window === "undefined") return { seen: false, step: 0, done: {}, visited: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* estado inválido: usa o padrão seguro */ }
  return { seen: false, step: 0, done: {}, visited: {} };
}

function writeState(s: TourState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage pode estar indisponível */ }
}

export function useLaunchTour() {
  return () => window.dispatchEvent(new Event("align:tour"));
}

export function ProductTour() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<TourState>(readState);
  const [ctx, setCtx] = useState<TourContext>({ leadsCount: 0, leadsMoved: 0, automationsCount: 0, visited: {} });
  const navigate = useNavigate();

  // Fetch objective progress from DB when opened
  useEffect(() => {
    if (!open) return;
    const tenantId = getActiveTenantId();
    if (!tenantId) return;
    (async () => {
      const [leadsAll, leadsMoved, autos] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).neq("status", "novo"),
        supabase.from("automations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("ativo", true),
      ]);
      setCtx((c) => ({
        ...c,
        leadsCount: leadsAll.count ?? 0,
        leadsMoved: leadsMoved.count ?? 0,
        automationsCount: autos.count ?? 0,
        visited: state.visited,
      }));
    })();
  }, [open, state.visited]);

  // Recompute per-step done from ctx
  const doneMap = useMemo(() => {
    const m: Record<string, boolean> = { ...state.done };
    STEPS.forEach((s) => {
      if (s.check && s.check(ctx)) m[s.id] = true;
    });
    return m;
  }, [ctx, state.done]);

  // O tour é iniciado sob demanda para não bloquear a primeira tarefa do usuário.
  useEffect(() => {
    function trigger() {
      const s = readState();
      const firstIncomplete = STEPS.findIndex((st) => !s.done[st.id]);
      setState({ ...s, step: firstIncomplete >= 0 ? firstIncomplete : 0 });
      setOpen(true);
    }
    window.addEventListener("align:tour", trigger);
    return () => window.removeEventListener("align:tour", trigger);
  }, []);

  function persist(next: TourState) { setState(next); writeState(next); }

  function close(markSeen = true) {
    persist({ ...state, done: doneMap, seen: markSeen || state.seen });
    setOpen(false);
  }

  function next() {
    const nextIdx = STEPS.findIndex((s, i) => i > state.step && !doneMap[s.id]);
    if (nextIdx >= 0) persist({ ...state, step: nextIdx, done: doneMap });
    else close();
  }

  function goTo(to: string | undefined, stepId: string) {
    const visited = { ...state.visited, [stepId]: true };
    const nextState = { ...state, visited, done: { ...doneMap, [stepId]: doneMap[stepId] || stepId === "relatorios" } };
    persist(nextState);
    if (to) navigate({ to });
    setOpen(false);
  }

  const current = STEPS[state.step] ?? STEPS[0];
  const Icon = current.icon;
  const completed = STEPS.filter((s) => doneMap[s.id]).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => close()}
        >
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-elevated"
          >
            <button
              onClick={() => close()}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"
              aria-label="Fechar tour"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Onboarding · {completed}/{STEPS.length} concluído
              </div>

              <div className="mt-3 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight">{current.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{current.desc}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface-1 px-2 py-1 text-[11px] text-muted-foreground">
                    {doneMap[current.id] ? <Check className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3" />}
                    {current.checkHint}
                  </div>
                </div>
              </div>

              {/* Step list */}
              <ul className="mt-5 space-y-1">
                {STEPS.map((s, i) => {
                  const done = doneMap[s.id];
                  const active = i === state.step;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => persist({ ...state, step: i, done: doneMap })}
                        className={[
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                          active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface-3",
                        ].join(" ")}
                      >
                        <span className={[
                          "grid h-4 w-4 place-items-center rounded-full border",
                          done ? "border-success bg-success text-primary-foreground" : "border-border",
                        ].join(" ")}>
                          {done && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className={done ? "line-through opacity-60" : ""}>{i + 1}. {s.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-1/50 px-5 py-3">
              <button
                onClick={() => (state.step === 0 ? close() : persist({ ...state, step: state.step - 1, done: doneMap }))}
                className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {state.step === 0 ? "Depois" : "Voltar"}
              </button>

              <div className="flex items-center gap-2">
                {current.to && (
                  <button
                    onClick={() => goTo(current.to, current.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-foreground hover:border-primary/40"
                  >
                    {current.cta ?? "Abrir"}
                  </button>
                )}
                <button
                  onClick={next}
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow"
                >
                  {completed === STEPS.length ? "Concluir" : "Próximo"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
