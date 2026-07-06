import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Loader2, Trash2, Plus, MessageSquare, Paperclip, Clock, ListChecks,
  Play, Square, CheckCircle2, Circle, GitBranch, AlertTriangle, Calendar, Flag,
} from "lucide-react";
import { useUpdateTask, useDeleteTask, useToggleTask, useCreateTask, useSubtasks, type TaskRow, type ChecklistItem, type TaskPriority, type TaskStatus, TASK_PRIORITY_LABEL } from "@/hooks/use-tasks";
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment } from "@/hooks/use-task-comments";
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-task-attachments";
import { useTaskTimeEntries, useStartTimer, useStopTimer, useAddManualTime, useDeleteTimeEntry, formatDuration } from "@/hooks/use-task-time";
import { useLeads } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { useAuth } from "@/contexts/auth-context";
import { AlignPanel, AlignPanelSection } from "@/components/align-panel";

type Tab = "geral" | "checklist" | "comentarios" | "anexos" | "tempo";

const STATUS_TONE: Record<TaskStatus, "neutral" | "info" | "warn" | "success" | "danger"> = {
  pendente: "neutral", em_andamento: "info", concluida: "success", cancelada: "danger",
};

export function TaskDetailDrawer({ task, allTasks, onClose }: { task: TaskRow; allTasks: TaskRow[]; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("geral");
  const update = useUpdateTask();
  const del = useDeleteTask();
  const toggle = useToggleTask();
  const createTask = useCreateTask();

  const { data: leads = [] } = useLeads();
  const { data: projects = [] } = useProjects();
  const { data: subtasks = [] } = useSubtasks(task.id);

  const lead = leads.find((l) => l.id === task.lead_id);
  const project = projects.find((p) => p.id === task.project_id);

  const blockers = useMemo(
    () => allTasks.filter((t) => task.dependencies?.includes(t.id)),
    [allTasks, task.dependencies],
  );
  const blocked = blockers.some((b) => b.status !== "concluida");

  const [titulo, setTitulo] = useState(task.titulo);
  const [descricao, setDescricao] = useState(task.descricao ?? "");

  useEffect(() => { setTitulo(task.titulo); setDescricao(task.descricao ?? ""); }, [task.id]);

  function patch(p: Partial<TaskRow>) { update.mutate({ id: task.id, ...p }); }

  const tabs = [
    { id: "geral", label: "Geral" },
    { id: "checklist", label: "Checklist & Sub", count: task.checklist.length + subtasks.length },
    { id: "comentarios", label: "Comentários" },
    { id: "anexos", label: "Anexos" },
    { id: "tempo", label: "Tempo" },
  ];

  return (
    <AlignPanel
      open={true}
      onClose={onClose}
      eyebrow={<>
        <span>{TASK_PRIORITY_LABEL[task.prioridade]}</span>
        {blocked && (
          <span className="ml-2 inline-flex items-center gap-1 text-warning">
            <AlertTriangle className="h-3 w-3" /> Bloqueada
          </span>
        )}
      </>}
      title={
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => titulo !== task.titulo && patch({ titulo })}
          className="w-full bg-transparent font-display text-[22px] font-bold leading-tight tracking-tight focus:outline-none"
        />
      }
      status={{ label: task.status.replace("_", " "), tone: STATUS_TONE[task.status] }}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
      headerActions={
        <button
          onClick={() => { if (confirm("Excluir esta tarefa?")) { del.mutate(task.id); onClose(); } }}
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          title="Excluir tarefa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      }
      expandable
    >
      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full bg-primary transition-all" style={{ width: `${task.progresso}%` }} />
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">{task.progresso}%</span>
      </div>

      {tab === "geral" && (
        <div className="space-y-5">
          <Field label="Descrição">
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => descricao !== (task.descricao ?? "") && patch({ descricao: descricao || null as any })}
              rows={3} className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm focus:border-primary/60 focus:outline-none"
              placeholder="Adicione uma descrição..." />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={task.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })} className={selectCls}>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>
            <Field label={<><Flag className="mr-1 inline h-3 w-3" />Prioridade</>}>
              <select value={task.prioridade} onChange={(e) => patch({ prioridade: e.target.value as TaskPriority })} className={selectCls}>
                {(["baixa", "media", "alta", "urgente"] as TaskPriority[]).map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field label={<><Calendar className="mr-1 inline h-3 w-3" />Prazo</>}>
              <input type="datetime-local"
                value={task.prazo ? task.prazo.slice(0, 16) : ""}
                onChange={(e) => patch({ prazo: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={selectCls} />
            </Field>
            <Field label="Projeto">
              <select value={task.project_id ?? ""} onChange={(e) => patch({ project_id: e.target.value || null })} className={selectCls}>
                <option value="">— Sem projeto —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </Field>
            <Field label="Lead">
              <select value={task.lead_id ?? ""} onChange={(e) => patch({ lead_id: e.target.value || null })} className={selectCls}>
                <option value="">— Sem lead —</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa || l.nome}</option>)}
              </select>
            </Field>
            <Field label="Horas estimadas">
              <input type="number" min={0} step={0.5} value={task.horas_estimadas ?? ""}
                onChange={(e) => patch({ horas_estimadas: e.target.value ? Number(e.target.value) : null })}
                className={selectCls} placeholder="ex: 2.5" />
            </Field>
          </div>

          {(task.horas_estimadas ?? 0) > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Horas: {Number(task.horas_realizadas).toFixed(1)}h de {Number(task.horas_estimadas).toFixed(1)}h</span>
                <span className="tabular-nums font-semibold">{Math.round((Number(task.horas_realizadas) / Number(task.horas_estimadas!)) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, (Number(task.horas_realizadas) / Number(task.horas_estimadas!)) * 100)}%` }} />
              </div>
            </div>
          )}

          <DependenciesEditor task={task} allTasks={allTasks} onChange={(deps) => patch({ dependencies: deps })} />
          {(lead || project) && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Vínculos</div>
              {project && <div>📁 {project.titulo}</div>}
              {lead && <div>🎯 {lead.empresa || lead.nome}</div>}
            </div>
          )}

          <button onClick={() => toggle.mutate({ id: task.id, done: task.status !== "concluida" })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-semibold hover:border-primary/50">
            {task.status === "concluida" ? <><CheckCircle2 className="h-4 w-4 text-success" /> Reabrir</> : <><Circle className="h-4 w-4" /> Marcar como concluída</>}
          </button>
        </div>
      )}

      {tab === "checklist" && (
        <div className="space-y-6">
          <ChecklistEditor checklist={task.checklist} onChange={(c) => patch({ checklist: c })} />
          <SubtasksSection parent={task} subtasks={subtasks} onCreate={(t) => createTask.mutate({ titulo: t, parent_task_id: task.id, project_id: task.project_id, lead_id: task.lead_id })} />
        </div>
      )}

      {tab === "comentarios" && <CommentsSection taskId={task.id} />}
      {tab === "anexos" && <AttachmentsSection taskId={task.id} />}
      {tab === "tempo" && <TimeSection task={task} />}
    </AlignPanel>
  );
}

const selectCls = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none";

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>{children}</label>;
}

function ChecklistEditor({ checklist, onChange }: { checklist: ChecklistItem[]; onChange: (c: ChecklistItem[]) => void }) {
  const [novo, setNovo] = useState("");
  const done = checklist.filter((c) => c.feito).length;
  return (
    <AlignPanelSection title="Checklist" icon={ListChecks} action={checklist.length > 0 ? <span className="text-[11px] tabular-nums text-muted-foreground">{done}/{checklist.length}</span> : null}>
      <ul className="space-y-1.5">
        {checklist.map((c) => (
          <li key={c.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <button onClick={() => onChange(checklist.map((x) => x.id === c.id ? { ...x, feito: !x.feito } : x))}>
              {c.feito ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            </button>
            <input value={c.texto}
              onChange={(e) => onChange(checklist.map((x) => x.id === c.id ? { ...x, texto: e.target.value } : x))}
              className={["flex-1 bg-transparent text-sm focus:outline-none", c.feito && "line-through text-muted-foreground"].filter(Boolean).join(" ")} />
            <button onClick={() => onChange(checklist.filter((x) => x.id !== c.id))}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { onChange([...checklist, { id: crypto.randomUUID(), texto: novo.trim(), feito: false }]); setNovo(""); } }}
        className="mt-2 flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Adicionar item..."
          className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
        <button type="submit" disabled={!novo.trim()} className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" /></button>
      </form>
    </AlignPanelSection>
  );
}

function SubtasksSection({ subtasks, onCreate }: { parent: TaskRow; subtasks: TaskRow[]; onCreate: (t: string) => void }) {
  const toggle = useToggleTask();
  const [novo, setNovo] = useState("");
  return (
    <AlignPanelSection title="Subtarefas" icon={GitBranch}>
      <ul className="space-y-1.5">
        {subtasks.map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <button onClick={() => toggle.mutate({ id: s.id, done: s.status !== "concluida" })}>
              {s.status === "concluida" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            </button>
            <span className={["flex-1 text-sm", s.status === "concluida" && "line-through text-muted-foreground"].filter(Boolean).join(" ")}>{s.titulo}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (novo.trim()) { onCreate(novo.trim()); setNovo(""); } }} className="mt-2 flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova subtarefa..."
          className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
        <button type="submit" disabled={!novo.trim()} className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" /></button>
      </form>
    </AlignPanelSection>
  );
}

function DependenciesEditor({ task, allTasks, onChange }: { task: TaskRow; allTasks: TaskRow[]; onChange: (deps: string[]) => void }) {
  const options = allTasks.filter((t) => t.id !== task.id && !task.dependencies?.includes(t.id));
  const linked = allTasks.filter((t) => task.dependencies?.includes(t.id));
  return (
    <AlignPanelSection title="Depende de" icon={GitBranch}>
      {linked.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {linked.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
              {d.status === "concluida" ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3 text-warning" />}
              <span className="flex-1 truncate">{d.titulo}</span>
              <button onClick={() => onChange(task.dependencies.filter((x) => x !== d.id))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="mb-2 text-[11px] text-muted-foreground">Sem dependências.</p>}
      <select onChange={(e) => { if (e.target.value) { onChange([...(task.dependencies ?? []), e.target.value]); e.target.value = ""; } }}
        className={selectCls} defaultValue="">
        <option value="">+ Adicionar dependência</option>
        {options.slice(0, 50).map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
      </select>
    </AlignPanelSection>
  );
}

function CommentsSection({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const create = useCreateTaskComment();
  const del = useDeleteTaskComment();
  const [text, setText] = useState("");
  return (
    <AlignPanelSection title={`Comentários · ${comments.length}`} icon={MessageSquare}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <ul className="space-y-2 mb-3">
          {comments.map((c) => (
            <li key={c.id} className="group rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-semibold">{c.user_id === user?.id ? "Você" : c.user_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  {c.user_id === user?.id && (
                    <button onClick={() => del.mutate({ id: c.id, task_id: taskId })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.content}</p>
            </li>
          ))}
          {comments.length === 0 && <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhum comentário ainda.</li>}
        </ul>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { create.mutate({ task_id: taskId, content: text }, { onSuccess: () => setText("") }); } }} className="space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Escreva um comentário..."
          className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-sm focus:border-primary/60 focus:outline-none" />
        <div className="flex justify-end">
          <button type="submit" disabled={!text.trim() || create.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {create.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Comentar
          </button>
        </div>
      </form>
    </AlignPanelSection>
  );
}

function AttachmentsSection({ taskId }: { taskId: string }) {
  const { data: atts = [] } = useTaskAttachments({ taskId });
  const upload = useUploadAttachment();
  const del = useDeleteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate({ file: f, taskId }));
  }

  return (
    <AlignPanelSection title={`Anexos · ${atts.length}`} icon={Paperclip}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={["mb-3 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-xs transition", drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"].join(" ")}>
        <Paperclip className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
        <p>{upload.isPending ? "Enviando..." : "Arraste arquivos ou clique aqui"}</p>
        <p className="text-[10px] text-muted-foreground">Máx 10MB por arquivo</p>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
      <ul className="space-y-1.5">
        {atts.map((a) => (
          <li key={a.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-primary">{a.nome}</a>
            <span className="text-[10px] text-muted-foreground tabular-nums">{a.tamanho_bytes ? `${Math.round((a.tamanho_bytes ?? 0) / 1024)} KB` : ""}</span>
            <button onClick={() => del.mutate(a)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </AlignPanelSection>
  );
}

function TimeSection({ task }: { task: TaskRow }) {
  const { data: entries = [] } = useTaskTimeEntries(task.id);
  const start = useStartTimer();
  const stop = useStopTimer();
  const manual = useAddManualTime();
  const del = useDeleteTimeEntry();

  const running = entries.find((e) => !e.ended_at);
  const [elapsed, setElapsed] = useState(0);
  const [manualMin, setManualMin] = useState("");
  const [manualDesc, setManualDesc] = useState("");

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(running.started_at).getTime()) / 60000)), 5000);
    setElapsed(Math.floor((Date.now() - new Date(running.started_at).getTime()) / 60000));
    return () => clearInterval(i);
  }, [running]);

  const totalMin = entries.reduce((s, e) => s + Number(e.duracao_min ?? 0), 0);
  return (
    <AlignPanelSection title="Tempo registrado" icon={Clock}>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3">
        {running ? (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
              <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Timer ativo</div>
              <div className="text-lg font-semibold tabular-nums">{formatDuration(elapsed)}</div>
            </div>
            <button onClick={() => stop.mutate({ id: running.id, task_id: task.id })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground">
              <Square className="h-3.5 w-3.5" /> Parar
            </button>
          </>
        ) : (
          <>
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Total registrado</div>
              <div className="text-lg font-semibold tabular-nums">{formatDuration(totalMin)}</div>
            </div>
            <button onClick={() => start.mutate({ task_id: task.id })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Play className="h-3.5 w-3.5" /> Iniciar
            </button>
          </>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const m = Number(manualMin); if (m > 0) { manual.mutate({ task_id: task.id, minutos: m, descricao: manualDesc || undefined }, { onSuccess: () => { setManualMin(""); setManualDesc(""); } }); } }}
        className="mb-3 flex flex-wrap items-end gap-2">
        <Field label="Minutos">
          <input type="number" min={1} value={manualMin} onChange={(e) => setManualMin(e.target.value)} className={selectCls + " w-24"} />
        </Field>
        <Field label="Descrição">
          <input value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className={selectCls} placeholder="O que foi feito?" />
        </Field>
        <button type="submit" disabled={!manualMin} className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-xs font-semibold hover:border-primary/50 disabled:opacity-50">+ Registrar manual</button>
      </form>

      <ul className="space-y-1.5">
        {entries.filter((e) => e.ended_at).map((e) => (
          <li key={e.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{formatDuration(Number(e.duracao_min ?? 0))}</span>
            <span className="flex-1 truncate text-muted-foreground">{e.descricao ?? "—"}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(e.started_at).toLocaleDateString("pt-BR")}</span>
            <button onClick={() => del.mutate({ id: e.id, task_id: task.id })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </AlignPanelSection>
  );
}
