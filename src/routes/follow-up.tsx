import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import {
  usePipelineStageAutomations, useCreatePipelineAutomation, useUpdatePipelineAutomation, useDeletePipelineAutomation,
  type StageTaskTemplate, type PipelineStageAutomation,
} from "@/hooks/use-pipeline-stage-automations";
import { Plus, Trash2, Bell, Power, ListChecks, Sparkles, Clock, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/follow-up")({
  head: () => ({ meta: [{ title: "Follow-up & Cadências — Align CRM" }] }),
  component: FollowUpPage,
});

const STAGES = [
  { id: "novo", label: "Novo lead" },
  { id: "contato_inicial", label: "Contato inicial" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
];

const TEMPLATES: { id: string; label: string; blurb: string; stage: string; tarefas: StageTaskTemplate[] }[] = [
  {
    id: "novo-3-toques",
    label: "Boas-vindas em 3 toques",
    blurb: "Ao entrar como Novo: contato imediato, WhatsApp em 2d, email em 5d.",
    stage: "novo",
    tarefas: [
      { titulo: "Ligar para se apresentar", prioridade: "alta", prazo_dias: 0 },
      { titulo: "WhatsApp com material inicial", prioridade: "media", prazo_dias: 2 },
      { titulo: "Enviar email com case", prioridade: "media", prazo_dias: 5 },
    ],
  },
  {
    id: "proposta-followup",
    label: "Proposta com follow-up 24h",
    blurb: "Quando o lead entra em Proposta: confirmar recebimento no dia seguinte.",
    stage: "proposta",
    tarefas: [
      { titulo: "Confirmar recebimento da proposta", prioridade: "alta", prazo_dias: 1 },
      { titulo: "Ligar para tirar dúvidas", prioridade: "alta", prazo_dias: 3 },
    ],
  },
  {
    id: "negociacao-fecha",
    label: "Negociação acelerada",
    blurb: "Cadência intensiva para não perder momentum.",
    stage: "negociacao",
    tarefas: [
      { titulo: "Alinhar objeções", prioridade: "urgente", prazo_dias: 0 },
      { titulo: "Enviar contrato revisado", prioridade: "alta", prazo_dias: 1 },
      { titulo: "Follow-up final", prioridade: "alta", prazo_dias: 3 },
    ],
  },
  {
    id: "fechado-onboarding",
    label: "Onboarding pós-fechamento",
    blurb: "Toda venda fechada gera onboarding automático.",
    stage: "fechado",
    tarefas: [
      { titulo: "Enviar boas-vindas + acessos", prioridade: "alta", prazo_dias: 0 },
      { titulo: "Kickoff call", prioridade: "media", prazo_dias: 3 },
      { titulo: "Check-in de 30 dias", prioridade: "media", prazo_dias: 30 },
    ],
  },
];

function FollowUpPage() {
  const { data: cads = [], isLoading } = usePipelineStageAutomations();
  const create = useCreatePipelineAutomation();
  const update = useUpdatePipelineAutomation();
  const del = useDeletePipelineAutomation();
  const [editing, setEditing] = useState<{ stage: string; prefill?: PipelineStageAutomation | null } | null>(null);

  function useTemplate(t: typeof TEMPLATES[number]) {
    create.mutate({ nome: t.label, stage: t.stage, ativo: true, tarefas: t.tarefas, notificar: true });
  }

  const byStage = (id: string) => cads.filter((c) => c.stage === id);

  return (
    <AppShell
      title="Follow-up & Cadências"
      subtitle="Sequências automáticas de tarefas para cada etapa do pipeline"
      action={<PrimaryButton icon={Plus} onClick={() => setEditing({ stage: "novo" })}>Nova cadência</PrimaryButton>}
    >
      {/* Templates */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Templates prontos
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => useTemplate(t)}
              disabled={create.isPending}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 text-left shadow-card transition hover:border-primary/40 hover:-translate-y-0.5 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><ListChecks className="h-4 w-4" /></div>
                <div className="text-sm font-semibold">{t.label}</div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t.blurb}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
                <Clock className="h-3 w-3" /> {t.tarefas.length} tarefas · {STAGES.find((s) => s.id === t.stage)?.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid per stage */}
      {isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((s) => {
            const items = byStage(s.id);
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{s.label}</h3>
                    <p className="text-[11px] text-muted-foreground">{items.length} cadência{items.length === 1 ? "" : "s"} ativa{items.length === 1 ? "" : "s"}</p>
                  </div>
                  <button
                    onClick={() => setEditing({ stage: s.id })}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                    aria-label="Adicionar cadência"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                    Nenhuma cadência. Use um template ou crie manualmente.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((c) => (
                      <li key={c.id} className="rounded-lg border border-border bg-surface-1 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">{c.nome}</span>
                              {!c.ativo && <StatusPill tone="warn">Pausada</StatusPill>}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <ListChecks className="h-3 w-3" /> {c.tarefas?.length ?? 0} tarefas
                              {c.notificar && <><Bell className="h-3 w-3" /> notifica</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => update.mutate({ id: c.id, ativo: !c.ativo })}
                              title={c.ativo ? "Pausar" : "Ativar"}
                              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Excluir "${c.nome}"?`)) del.mutate(c.id); }}
                              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {c.tarefas && c.tarefas.length > 0 && (
                          <ol className="mt-2 space-y-0.5 border-t border-border pt-2">
                            {c.tarefas.slice(0, 4).map((t, i) => (
                              <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-surface-3 text-[9px] font-bold">{i + 1}</span>
                                <span className="truncate">{t.titulo}</span>
                                <span className="ml-auto tabular-nums">+{t.prazo_dias ?? 1}d</span>
                              </li>
                            ))}
                            {c.tarefas.length > 4 && <li className="text-[10px] text-muted-foreground">+{c.tarefas.length - 4} tarefas</li>}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CadenceForm
          stage={editing.stage}
          onClose={() => setEditing(null)}
          onSave={async (input) => { await create.mutateAsync(input); setEditing(null); }}
          pending={create.isPending}
        />
      )}
    </AppShell>
  );
}

function CadenceForm({
  stage, onClose, onSave, pending,
}: {
  stage: string;
  onClose: () => void;
  onSave: (input: { nome: string; stage: string; ativo: boolean; tarefas: StageTaskTemplate[]; notificar: boolean }) => Promise<void>;
  pending: boolean;
}) {
  const [nome, setNome] = useState("");
  const [selectedStage, setSelectedStage] = useState(stage);
  const [tarefas, setTarefas] = useState<StageTaskTemplate[]>([
    { titulo: "Fazer follow-up", prioridade: "media", prazo_dias: 1 },
  ]);

  function patch(i: number, p: Partial<StageTaskTemplate>) {
    setTarefas((prev) => prev.map((t, idx) => idx === i ? { ...t, ...p } : t));
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">Nova cadência</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-auto p-5">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cadência de qualificação"
              className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Dispara ao entrar no estágio</label>
            <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm">
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground">Tarefas</label>
              <button onClick={() => setTarefas((p) => [...p, { titulo: "Nova tarefa", prioridade: "media", prazo_dias: 1 }])}
                className="text-[11px] font-semibold text-primary hover:underline">+ Adicionar</button>
            </div>
            {tarefas.map((t, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface-1 p-2">
                <div className="flex items-center gap-2">
                  <input value={t.titulo} onChange={(e) => patch(i, { titulo: e.target.value })}
                    className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs" />
                  <input type="number" min={0} value={t.prazo_dias ?? 1} onChange={(e) => patch(i, { prazo_dias: parseInt(e.target.value || "0", 10) })}
                    className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs tabular-nums" />
                  <span className="text-[10px] text-muted-foreground">dias</span>
                  <button onClick={() => setTarefas((p) => p.filter((_, idx) => idx !== i))} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-1/50 px-5 py-3">
          <button onClick={onClose} className="h-9 rounded-md px-3 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          <button
            onClick={() => nome.trim() && tarefas.length > 0 && onSave({ nome, stage: selectedStage, ativo: true, tarefas, notificar: true })}
            disabled={pending || !nome.trim() || tarefas.length === 0}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Criar cadência
          </button>
        </div>
      </div>
    </div>
  );
}
