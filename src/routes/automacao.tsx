import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { RealtimeBadge } from "@/components/realtime-badge";
import { useRealtimeSync } from "@/hooks/use-realtime";
import {
  useAutomations, useCreateAutomation, useToggleAutomation, useDeleteAutomation,
  type AutomationAction, type AutomationTrigger,
} from "@/hooks/use-automations";
import { Plus, Zap, ArrowRight, Loader2, Trash2, X, Power, ListChecks, MessageSquare, Inbox, Bolt, Sparkles } from "lucide-react";
import { AutomationListSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/automacao")({
  head: () => ({ meta: [{ title: "Automação — Align CRM" }] }),
  component: AutomacaoPage,
});

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  lead_criado: "Quando um lead é criado",
  status_mudou: "Quando o status do lead muda",
  score_alto: "Quando o score IA fica alto",
  score_baixou: "Quando o score IA cai",
};

const STATUS_OPTIONS = [
  { v: "novo", l: "Novo" }, { v: "contato_inicial", l: "Contato inicial" },
  { v: "qualificacao", l: "Qualificação" }, { v: "proposta", l: "Proposta" },
  { v: "negociacao", l: "Negociação" }, { v: "fechado", l: "Fechado" }, { v: "perdido", l: "Perdido" },
];

const ACTION_ICON: Record<string, any> = { criar_tarefa: ListChecks, registrar_atividade: MessageSquare };

type TemplateInput = {
  nome: string;
  descricao: string;
  trigger_tipo: AutomationTrigger;
  trigger_valor: string;
  acoes: AutomationAction[];
};

const TEMPLATES: { id: string; label: string; blurb: string; tone: string; input: TemplateInput }[] = [
  {
    id: "followup-24h",
    label: "Follow-up em 24h",
    blurb: "Toda proposta enviada gera lembrete de contato no dia seguinte.",
    tone: "text-primary",
    input: {
      nome: "Follow-up de proposta em 24h",
      descricao: "Cria tarefa de follow-up quando o lead vai para Proposta",
      trigger_tipo: "status_mudou",
      trigger_valor: "proposta",
      acoes: [
        { tipo: "criar_tarefa", titulo: "Ligar para confirmar proposta", prioridade: "alta", prazo_dias: 1 },
        { tipo: "registrar_atividade", tipo_atividade: "nota", descricao: "Proposta enviada — aguardar retorno" },
      ],
    },
  },
  {
    id: "cadencia-5-toques",
    label: "Cadência 5 toques",
    blurb: "Sequência de 5 contatos escalonados assim que o lead entra no CRM.",
    tone: "text-success",
    input: {
      nome: "Cadência de prospecção 5 toques",
      descricao: "Ligação → WhatsApp → Email → WhatsApp → Ligação final",
      trigger_tipo: "lead_criado",
      trigger_valor: "",
      acoes: [
        { tipo: "criar_tarefa", titulo: "Toque 1 · Ligação de descoberta", prioridade: "alta", prazo_dias: 0 },
        { tipo: "criar_tarefa", titulo: "Toque 2 · WhatsApp de reforço", prioridade: "media", prazo_dias: 2 },
        { tipo: "criar_tarefa", titulo: "Toque 3 · Email com case", prioridade: "media", prazo_dias: 4 },
        { tipo: "criar_tarefa", titulo: "Toque 4 · WhatsApp com oferta", prioridade: "media", prazo_dias: 7 },
        { tipo: "criar_tarefa", titulo: "Toque 5 · Ligação final", prioridade: "alta", prazo_dias: 10 },
      ],
    },
  },
  {
    id: "lead-quente",
    label: "Lead quente detectado",
    blurb: "Quando a IA identifica score ≥ 80, prioriza ação imediata.",
    tone: "text-warning",
    input: {
      nome: "Ação imediata para lead quente",
      descricao: "Dispara tarefa urgente sempre que o score IA sobe para 80+",
      trigger_tipo: "score_alto",
      trigger_valor: "80",
      acoes: [
        { tipo: "criar_tarefa", titulo: "🔥 Contato imediato — lead quente", prioridade: "urgente", prazo_dias: 0 },
      ],
    },
  },
  {
    id: "reativacao",
    label: "Reativação de lead frio",
    blurb: "Quando o score cai, agenda ação de recuperação em 3 dias.",
    tone: "text-info",
    input: {
      nome: "Reativação de lead que esfriou",
      descricao: "Quando o score IA cai bastante, cria plano de recuperação",
      trigger_tipo: "score_baixou",
      trigger_valor: "",
      acoes: [
        { tipo: "criar_tarefa", titulo: "Reengajar com conteúdo relevante", prioridade: "media", prazo_dias: 3 },
        { tipo: "registrar_atividade", tipo_atividade: "email", descricao: "Enviar email de reativação" },
      ],
    },
  },
];

function AutomacaoPage() {
  useRealtimeSync([
    { table: "automations", queryKeys: [["automations"]] },
    { table: "automation_runs", queryKeys: [["automation_runs"]] },
  ]);

  const { data: rules = [], isLoading } = useAutomations();
  const create = useCreateAutomation();
  const toggle = useToggleAutomation();
  const del = useDeleteAutomation();

  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<TemplateInput | null>(null);

  function useTemplate(t: TemplateInput) {
    setPrefill(t);
    setOpen(true);
  }


  return (
    <AppShell
      title="Automação de Marketing"
      subtitle="Workflows SE → ENTÃO que reagem em tempo real a eventos do CRM"
      action={
        <div className="flex items-center gap-2">
          <RealtimeBadge />
          <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Novo fluxo</PrimaryButton>
        </div>
      }
    >
      {/* Template gallery */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Templates prontos
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => useTemplate(t.input)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 text-left shadow-card transition hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                <div className={`grid h-8 w-8 place-items-center rounded-lg bg-primary/10 ${t.tone}`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold">{t.label}</div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t.blurb}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                Usar template <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <AutomationListSkeleton count={3} />
      ) : rules.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhuma automação criada</h3>
          <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
            Use um template acima ou crie um fluxo do zero.
          </p>
          <PrimaryButton icon={Plus} onClick={() => { setPrefill(null); setOpen(true); }}>Criar do zero</PrimaryButton>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((f) => (
            <div key={f.id} className="group rounded-2xl border border-border bg-surface-2 p-5 shadow-card transition hover:border-primary/40">
              <div className="flex items-center gap-4">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${f.ativo ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground"}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{f.nome}</h3>
                  {f.descricao && <p className="mt-0.5 text-[11px] text-muted-foreground">{f.descricao}</p>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Execuções</div>
                  <div className="text-sm font-semibold tabular-nums">{f.execucoes}</div>
                </div>
                <StatusPill tone={f.ativo ? "success" : "neutral"}>{f.ativo ? "Ativo" : "Pausado"}</StatusPill>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggle.mutate({ id: f.id, ativo: !f.ativo })}
                    title={f.ativo ? "Pausar" : "Ativar"}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Excluir "${f.nome}"?`)) del.mutate(f.id); }}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-3 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Visualização de fluxo */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto rounded-xl border border-dashed border-border bg-surface-1/60 p-3">
                <FlowNode kind="trigger" label={TRIGGER_LABEL[f.trigger_tipo]} sublabel={f.trigger_valor || undefined} />
                <FlowConnector />
                {(f.acoes ?? []).map((a, i) => {
                  const A = ACTION_ICON[a.tipo] ?? Zap;
                  const label = a.tipo === "criar_tarefa" ? "Criar tarefa" : "Registrar atividade";
                  const sub = a.tipo === "criar_tarefa" ? a.titulo : a.descricao;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <FlowNode kind="action" label={label} sublabel={sub} icon={A} />
                      {i < (f.acoes?.length ?? 0) - 1 && <FlowConnector />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <AutomationForm prefill={prefill} onClose={() => { setOpen(false); setPrefill(null); }} onSubmit={async (input) => { await create.mutateAsync(input); setOpen(false); setPrefill(null); }} pending={create.isPending} />}
    </AppShell>
  );
}

function AutomationForm({
  onClose, onSubmit, pending,
}: {
  onClose: () => void;
  onSubmit: (input: { nome: string; descricao: string | null; ativo: boolean; trigger_tipo: AutomationTrigger; trigger_valor: string | null; acoes: AutomationAction[] }) => Promise<void>;
  pending: boolean;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("status_mudou");
  const [triggerValor, setTriggerValor] = useState("proposta");
  const [acoes, setAcoes] = useState<AutomationAction[]>([
    { tipo: "criar_tarefa", titulo: "Fazer follow-up", prioridade: "alta", prazo_dias: 1 },
  ]);

  function addAction(tipo: "criar_tarefa" | "registrar_atividade") {
    if (tipo === "criar_tarefa") setAcoes((p) => [...p, { tipo, titulo: "Nova tarefa", prioridade: "media", prazo_dias: 2 }]);
    else setAcoes((p) => [...p, { tipo, descricao: "Atividade automática", tipo_atividade: "nota" }]);
  }
  function patchAction(i: number, patch: any) { setAcoes((p) => p.map((a, idx) => idx === i ? { ...a, ...patch } : a)); }
  function removeAction(i: number) { setAcoes((p) => p.filter((_, idx) => idx !== i)); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || acoes.length === 0) return;
    await onSubmit({
      nome,
      descricao: descricao || null,
      ativo: true,
      trigger_tipo: trigger,
      trigger_valor: triggerValor || null,
      acoes,
    });
  }

  const showStatusValue = trigger === "status_mudou";
  const showOrigemValue = trigger === "lead_criado";
  const showScoreValue = trigger === "score_alto";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-semibold">Nova automação</h3>
            <p className="text-xs text-muted-foreground">Configure o gatilho e as ações que serão executadas</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome do fluxo *">
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inp} placeholder="Ex.: Follow-up de proposta" />
            </Field>
            <Field label="Descrição">
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inp} placeholder="Opcional" />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/20 font-bold">SE</span> Gatilho
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tipo">
                <select value={trigger} onChange={(e) => setTrigger(e.target.value as AutomationTrigger)} className={inp}>
                  {Object.entries(TRIGGER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              {showStatusValue && (
                <Field label="Status alvo">
                  <select value={triggerValor} onChange={(e) => setTriggerValor(e.target.value)} className={inp}>
                    <option value="">Qualquer mudança</option>
                    {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </Field>
              )}
              {showOrigemValue && (
                <Field label="Origem do lead (texto exato)">
                  <input value={triggerValor} onChange={(e) => setTriggerValor(e.target.value)} className={inp} placeholder="Ex.: Site, Indicação..." />
                </Field>
              )}
              {showScoreValue && (
                <Field label="Score mínimo">
                  <input type="number" min="0" max="100" value={triggerValor} onChange={(e) => setTriggerValor(e.target.value)} className={inp} placeholder="80" />
                </Field>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-success/20 font-bold">FAZ</span> Ações
              </h4>
              <div className="flex gap-1">
                <button type="button" onClick={() => addAction("criar_tarefa")} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] hover:border-primary/40">
                  <Plus className="h-3 w-3" /> Tarefa
                </button>
                <button type="button" onClick={() => addAction("registrar_atividade")} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] hover:border-primary/40">
                  <Plus className="h-3 w-3" /> Atividade
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {acoes.length === 0 && <p className="text-xs text-muted-foreground">Adicione ao menos uma ação.</p>}
              {acoes.map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {a.tipo === "criar_tarefa" ? "Criar tarefa" : "Registrar atividade"}
                    </span>
                    <button type="button" onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {a.tipo === "criar_tarefa" ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      <input value={a.titulo} onChange={(e) => patchAction(i, { titulo: e.target.value })} placeholder="Título" className={inp + " md:col-span-2"} />
                      <select value={a.prioridade} onChange={(e) => patchAction(i, { prioridade: e.target.value })} className={inp}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                      <input type="number" min="0" value={a.prazo_dias ?? ""} onChange={(e) => patchAction(i, { prazo_dias: Number(e.target.value) || 0 })} placeholder="Prazo (dias)" className={inp} />
                      <input value={a.descricao ?? ""} onChange={(e) => patchAction(i, { descricao: e.target.value })} placeholder="Descrição (opcional)" className={inp + " md:col-span-2"} />
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-3">
                      <select value={a.tipo_atividade} onChange={(e) => patchAction(i, { tipo_atividade: e.target.value })} className={inp}>
                        <option value="nota">Nota</option>
                        <option value="ligacao">Ligação</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="reuniao">Reunião</option>
                      </select>
                      <input value={a.descricao} onChange={(e) => patchAction(i, { descricao: e.target.value })} placeholder="Descrição" className={inp + " md:col-span-2"} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-border bg-surface-1 px-4 text-sm text-muted-foreground">Cancelar</button>
          <button type="submit" disabled={pending || !nome.trim() || acoes.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Criar fluxo
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = "h-9 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FlowNode({ kind, label, sublabel, icon: Icon }: { kind: "trigger" | "action"; label: string; sublabel?: string; icon?: any }) {
  const I = Icon ?? (kind === "trigger" ? Bolt : ListChecks);
  const styles = kind === "trigger" ? "border-primary/40 bg-primary/10" : "border-success/40 bg-success/10";
  const iconColor = kind === "trigger" ? "text-primary" : "text-success";
  return (
    <div className={`flex min-w-[140px] shrink-0 items-center gap-2 rounded-lg border px-3 py-2 ${styles}`}>
      <I className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 leading-tight">
        <div className={`text-[10px] font-bold uppercase tracking-widest ${iconColor} opacity-80`}>{kind === "trigger" ? "Quando" : "Então"}</div>
        <div className="truncate text-xs font-semibold text-foreground">{label}</div>
        {sublabel && <div className="truncate text-[10px] text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex shrink-0 items-center text-muted-foreground/60">
      <div className="h-px w-3 bg-border" />
      <ArrowRight className="h-3 w-3" />
      <div className="h-px w-3 bg-border" />
    </div>
  );
}
