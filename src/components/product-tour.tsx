import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Users, Kanban, Zap, BarChart3, X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

type Step = {
  title: string;
  desc: string;
  icon: any;
  to?: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    title: "Capture leads em segundos",
    desc: "Crie leads manualmente ou receba via API/formulários. A IA já classifica origem, interesse e prioridade automaticamente.",
    icon: Users,
    to: "/leads",
    cta: "Abrir Leads",
  },
  {
    title: "Mova pelo pipeline com um gesto",
    desc: "Arraste cards entre etapas — cada movimento dispara automações e atualiza previsão de receita em tempo real.",
    icon: Kanban,
    to: "/pipeline",
    cta: "Ver Pipeline",
  },
  {
    title: "Automatize follow-ups e cadências",
    desc: "Monte fluxos SE/ENTÃO ou use templates prontos: lembretes 24h, cadência de 5 toques, reativação de leads frios.",
    icon: Zap,
    to: "/automacao",
    cta: "Configurar Automações",
  },
  {
    title: "Meça tudo em relatórios",
    desc: "Conversão por etapa, previsto vs. fechado, ranking de vendedores e origens que mais convertem.",
    icon: BarChart3,
    to: "/relatorios",
    cta: "Abrir Relatórios",
  },
];

const KEY = "align_tour_seen_v1";

export function useLaunchTour() {
  return () => window.dispatchEvent(new Event("align:tour"));
}

export function ProductTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(KEY);
    if (!seen) {
      // Delay so it appears after the shell mounts
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    function trigger() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener("align:tour", trigger);
    return () => window.removeEventListener("align:tour", trigger);
  }, []);

  function close(markSeen = true) {
    if (markSeen) localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  }

  function goTo(to?: string) {
    if (to) navigate({ to });
    close();
  }

  const current = STEPS[step];
  const Icon = current?.icon ?? Sparkles;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => close()}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-elevated"
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
                <Sparkles className="h-3 w-3" /> Tour · passo {step + 1} de {STEPS.length}
              </div>

              <div className="mt-3 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight">{current.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{current.desc}</p>
                </div>
              </div>

              {/* progress dots */}
              <div className="mt-5 flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`Ir para passo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-primary" : "w-1.5 bg-surface-3 hover:bg-surface-3/80"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-1/50 px-5 py-3">
              <button
                onClick={() => (step === 0 ? close() : setStep(step - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {step === 0 ? "Pular" : "Voltar"}
              </button>

              <div className="flex items-center gap-2">
                {current.to && (
                  <button
                    onClick={() => goTo(current.to)}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-foreground hover:border-primary/40"
                  >
                    {current.cta ?? "Abrir"}
                  </button>
                )}
                <button
                  onClick={next}
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow"
                >
                  {step === STEPS.length - 1 ? "Concluir" : "Próximo"}
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
