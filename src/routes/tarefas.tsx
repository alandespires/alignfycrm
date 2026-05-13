import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { useTasks, useToggleTask, useDeleteTask, useCreateTask, type TaskPriority, type TaskRow } from "@/hooks/use-tasks";
import { useLeads } from "@/hooks/use-leads";
import { Plus, Calendar, CheckCircle2, Circle, Loader2, Trash2, Inbox, X, Search } from "lucide-react";
import { TaskGroupsSkeleton } from "@/components/skeletons";

type PrazoFilter = "todos" | "hoje" | "atrasadas" | "semana" | "sem_prazo";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Launcher CRM" }] }),
  component: TarefasPage,
});

function tone(p: TaskPriority): "danger" | "warn" | "info" | "neutral" {
  return p === "urgente" || p === "alta" ? "danger" : p === "media" ? "warn" : "neutral";
}

function fmtDue(s: string | null) {
  if (!s) return "Sem prazo";
  const d = new Date(s);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd.getTime() - today.getTime()) / 864e5);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff < 0) return `Atrasada (${Math.abs(diff)}d)`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isToday(s: string | null) {
  if (!s) return false;
  const d = new Date(s); const t = new Date();
  return d.toDateString() === t.toDateString();
}

function TarefasPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: leads = [] } = useLeads();
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const create = useCreateTask();

  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [prazo, setPrazo] = useState("");
  const [leadId, setLeadId] = useState<string>("");

  // filtros
  const [query, setQuery] = useState("");
  const [fPrioridade, setFPrioridade] = useState<TaskPriority | "todas">("todas");
  const [fPrazo, setFPrazo] = useState<PrazoFilter>("todos");
  const [fLead, setFLead] = useState<string>("todos");

  async function submit(e: FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      titulo,
      prioridade,
      prazo: prazo ? new Date(prazo).toISOString() : null,
      lead_id: leadId || null,
    });
    setTitulo(""); setPrazo(""); setLeadId(""); setPrioridade("media"); setOpen(false);
  }

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const endWeek = new Date(now); endWeek.setDate(endWeek.getDate() + 7);
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (fPrioridade !== "todas" && t.prioridade !== fPrioridade) return false;
      if (fLead !== "todos") {
        if (fLead === "sem_lead" ? !!t.lead_id : t.lead_id !== fLead) return false;
      }
      if (fPrazo !== "todos") {
        const d = t.prazo ? new Date(t.prazo) : null;
        if (fPrazo === "sem_prazo" && d) return false;
        if (fPrazo === "hoje" && (!d || d > endToday || d < new Date(now.toDateString()))) return false;
        if (fPrazo === "atrasadas" && (!d || d >= now || t.status === "concluida")) return false;
        if (fPrazo === "semana" && (!d || d > endWeek)) return false;
      }
      if (q && !t.titulo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, fPrioridade, fPrazo, fLead]);

  const ativas = filteredTasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const concluidas = filteredTasks.filter((t) => t.status === "concluida");
  const groups: { label: string; items: TaskRow[] }[] = [
    { label: "Hoje & Atrasadas", items: ativas.filter((t) => t.prazo && new Date(t.prazo) <= new Date(new Date().setHours(23, 59, 59))) },
    { label: "Próximas", items: ativas.filter((t) => !t.prazo || new Date(t.prazo) > new Date(new Date().setHours(23, 59, 59))) },
  ];
  if (concluidas.length > 0) groups.push({ label: "Concluídas", items: concluidas.slice(0, 20) });

  return (
    <AppShell title="Tarefas" subtitle={`${ativas.length} ativas · ${concluidas.length} concluídas`}
      action={<PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova tarefa</PrimaryButton>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa..."
            className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none" />
        </div>
        <select value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value as any)} className={selectCls}>
          <option value="todas">Toda prioridade</option>
          <option value="urgente">Urgente</option><option value="alta">Alta</option>
          <option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
        <select value={fPrazo} onChange={(e) => setFPrazo(e.target.value as PrazoFilter)} className={selectCls}>
          <option value="todos">Qualquer prazo</option>
          <option value="atrasadas">Atrasadas</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Próximos 7 dias</option>
          <option value="sem_prazo">Sem prazo</option>
        </select>
        <select value={fLead} onChange={(e) => setFLead(e.target.value)} className={selectCls}>
          <option value="todos">Todos os leads</option>
          <option value="sem_lead">Sem lead</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa || l.nome}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filteredTasks.length} de {tasks.length}</span>
      </div>

      {isLoading ? (
        <TaskGroupsSkeleton />
      ) : tasks.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhuma tarefa</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Crie tarefas para organizar follow-ups e ações comerciais.</p>
        </div>
      ) : (
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.label} className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{g.items.length}</span>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {g.items.map((t) => {
                const done = t.status === "concluida";
                const lead = leads.find((l) => l.id === t.lead_id);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-1/50">
                    <button onClick={() => toggle.mutate({ id: t.id, done: !done })}>
                      {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDue(t.prazo)}{lead ? ` · ${lead.empresa || lead.nome}` : ""}
                      </div>
                    </div>
                    {!done && <StatusPill tone={tone(t.prioridade)}>{t.prioridade}</StatusPill>}
                    <button onClick={() => del.mutate(t.id)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
              {g.items.length === 0 && <li className="px-5 py-6 text-center text-xs text-muted-foreground">Nada por aqui.</li>}
            </ul>
          </div>
        ))}
      </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-surface-2 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-lg font-semibold">Nova tarefa</h3>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-5">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Título *</span>
                <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Prioridade</span>
                  <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as TaskPriority)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm">
                    <option value="baixa">Baixa</option><option value="media">Média</option>
                    <option value="alta">Alta</option><option value="urgente">Urgente</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Prazo</span>
                  <input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Lead vinculado</span>
                <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm">
                  <option value="">— Sem vínculo —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa ? `${l.empresa} (${l.nome})` : l.nome}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-border bg-surface-1 px-4 text-sm text-muted-foreground">Cancelar</button>
              <button type="submit" disabled={create.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

const selectCls = "h-10 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground focus:border-primary/60 focus:outline-none";

