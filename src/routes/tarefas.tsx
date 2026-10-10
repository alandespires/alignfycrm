import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";
import { useTasks, useToggleTask, useDeleteTask, useCreateTask, type TaskPriority, type TaskRow, type TaskStatus, TASK_STATUS_LABEL } from "@/hooks/use-tasks";
import { useLeads } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { Plus, Calendar, CheckCircle2, Circle, Loader2, Trash2, Inbox, X, Search, LayoutGrid, List, AlertCircle, TrendingUp, Clock, ListChecks } from "@/components/ui/icons";
import { TaskGroupsSkeleton } from "@/components/skeletons";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";

type PrazoFilter = "todos" | "hoje" | "atrasadas" | "semana" | "sem_prazo";
type ViewMode = "lista" | "kanban";

export const Route = createFileRoute("/tarefas")({
  head: () => pageHead("Tarefas"),
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

function TarefasPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: leads = [] } = useLeads();
  const { data: projects = [] } = useProjects();
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const create = useCreateTask();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("lista");
  const [selected, setSelected] = useState<TaskRow | null>(null);

  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [prazo, setPrazo] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  const [query, setQuery] = useState("");
  const [fPrioridade, setFPrioridade] = useState<TaskPriority | "todas">("todas");
  const [fPrazo, setFPrazo] = useState<PrazoFilter>("todos");
  const [fLead, setFLead] = useState<string>("todos");
  const [fProject, setFProject] = useState<string>("todos");

  async function submit(e: FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      titulo, prioridade,
      prazo: prazo ? new Date(prazo).toISOString() : null,
      lead_id: leadId || null,
      project_id: projectId || null,
    });
    setTitulo(""); setPrazo(""); setLeadId(""); setProjectId(""); setPrioridade("media"); setOpen(false);
  }

  // Métricas
  const metrics = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endWeek = new Date(now); endWeek.setDate(endWeek.getDate() + 7);
    const ativas = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
    const atrasadas = ativas.filter((t) => t.prazo && new Date(t.prazo) < now);
    const hoje = ativas.filter((t) => t.prazo && new Date(t.prazo) >= startToday && new Date(t.prazo) <= endToday);
    const semana = ativas.filter((t) => t.prazo && new Date(t.prazo) <= endWeek);
    const concluidasSemana = tasks.filter((t) => t.status === "concluida" && t.concluida_em && new Date(t.concluida_em) >= new Date(Date.now() - 7 * 86400000));
    return {
      ativas: ativas.length, atrasadas: atrasadas.length, hoje: hoje.length,
      semana: semana.length, throughput: concluidasSemana.length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
    const endWeek = new Date(now); endWeek.setDate(endWeek.getDate() + 7);
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.parent_task_id) return false; // hide subtasks in main view
      if (fPrioridade !== "todas" && t.prioridade !== fPrioridade) return false;
      if (fLead !== "todos") {
        if (fLead === "sem_lead" ? !!t.lead_id : t.lead_id !== fLead) return false;
      }
      if (fProject !== "todos") {
        if (fProject === "sem_proj" ? !!t.project_id : t.project_id !== fProject) return false;
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
  }, [tasks, query, fPrioridade, fPrazo, fLead, fProject]);

  const ativas = filteredTasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const concluidas = filteredTasks.filter((t) => t.status === "concluida");

  return (
    <AppShell title="Tarefas" subtitle={`${metrics.ativas} ativas · ${metrics.throughput} concluídas/sem`}
      action={
        <div className="flex items-center gap-2">
          <div className="hidden md:flex rounded-lg border border-border bg-surface-1 p-0.5">
            <Button variant="unstyled" size="unstyled" onClick={() => setView("lista")} className={["inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium", view === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
              <List className="h-3 w-3" /> Lista
            </Button>
            <Button variant="unstyled" size="unstyled" onClick={() => setView("kanban")} className={["inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
              <LayoutGrid className="h-3 w-3" /> Kanban
            </Button>
          </div>
          <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova tarefa</PrimaryButton>
        </div>
      }>

      {/* Métricas */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <MetricCard icon={ListChecks} label="Ativas" value={metrics.ativas} />
        <MetricCard icon={AlertCircle} label="Atrasadas" value={metrics.atrasadas} tone="danger" />
        <MetricCard icon={Calendar} label="Hoje" value={metrics.hoje} tone="warn" />
        <MetricCard icon={Clock} label="Próx. 7 dias" value={metrics.semana} />
        <MetricCard icon={TrendingUp} label="Throughput/sem" value={metrics.throughput} tone="success" />
      </div>

      {/* Filtros */}
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
        <select value={fProject} onChange={(e) => setFProject(e.target.value)} className={selectCls}>
          <option value="todos">Todos projetos</option>
          <option value="sem_proj">Sem projeto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>
        <select value={fLead} onChange={(e) => setFLead(e.target.value)} className={selectCls}>
          <option value="todos">Todos os leads</option>
          <option value="sem_lead">Sem lead</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa || l.nome}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filteredTasks.length} de {tasks.length}</span>
      </div>

      {isLoading ? <TaskGroupsSkeleton /> :
        tasks.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : view === "kanban" ? (
          <KanbanView tasks={filteredTasks} onPick={setSelected} leads={leads} projects={projects} />
        ) : (
          <ListView ativas={ativas} concluidas={concluidas} toggle={toggle} del={del} onPick={setSelected} leads={leads} projects={projects} />
        )}

      <AlignPanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Tarefa"
        title="Nova tarefa"
        widthClass="md:max-w-[520px]"
        footer={
          <AlignPanelFooter
            secondary={{ label: "Cancelar", onClick: () => setOpen(false) }}
            primary={{
              label: "Criar",
              onClick: () => (document.getElementById("nova-tarefa-form") as HTMLFormElement | null)?.requestSubmit(),
              loading: create.isPending,
            }}
          />
        }
      >
        <form id="nova-tarefa-form" onSubmit={submit} className="space-y-3">
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
            <span className="text-xs font-medium text-muted-foreground">Projeto</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm">
              <option value="">— Sem projeto —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Lead vinculado</span>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm">
              <option value="">— Sem vínculo —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa ? `${l.empresa} (${l.nome})` : l.nome}</option>)}
            </select>
          </label>
        </form>
      </AlignPanel>

      {selected && <TaskDetailDrawer task={selected} allTasks={tasks} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
      <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">Nenhuma tarefa</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Crie tarefas, defina checklists, subtarefas e acompanhe o tempo gasto.</p>
      <Button variant="unstyled" size="unstyled" onClick={onCreate} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
        <Plus className="h-3.5 w-3.5" /> Criar primeira tarefa
      </Button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: "danger" | "warn" | "success" }) {
  const colorMap = { danger: "text-destructive", warn: "text-warning", success: "text-success" } as const;
  const color = tone ? colorMap[tone] : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 shadow-card">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ListView({ ativas, concluidas, toggle, del, onPick, leads, projects }: any) {
  const groups: { label: string; items: TaskRow[] }[] = [
    { label: "Hoje & Atrasadas", items: ativas.filter((t: TaskRow) => t.prazo && new Date(t.prazo) <= new Date(new Date().setHours(23, 59, 59))) },
    { label: "Próximas", items: ativas.filter((t: TaskRow) => !t.prazo || new Date(t.prazo) > new Date(new Date().setHours(23, 59, 59))) },
  ];
  if (concluidas.length > 0) groups.push({ label: "Concluídas", items: concluidas.slice(0, 20) });

  return (
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
              const lead = leads.find((l: any) => l.id === t.lead_id);
              const proj = projects.find((p: any) => p.id === t.project_id);
              const checklistTotal = t.checklist?.length ?? 0;
              const checklistDone = t.checklist?.filter((c: any) => c.feito).length ?? 0;
              return (
                <li key={t.id} onClick={() => onPick(t)}
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition hover:bg-surface-1/50">
                  <Button variant="unstyled" size="unstyled" onClick={(e) => { e.stopPropagation(); toggle.mutate({ id: t.id, done: !done }); }}>
                    {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>{fmtDue(t.prazo)}</span>
                      {proj && <span>📁 {proj.titulo}</span>}
                      {lead && <span>🎯 {lead.empresa || lead.nome}</span>}
                      {checklistTotal > 0 && <span className="inline-flex items-center gap-0.5"><ListChecks className="h-3 w-3" /> {checklistDone}/{checklistTotal}</span>}
                    </div>
                  </div>
                  {!done && <StatusPill tone={tone(t.prioridade)}>{t.prioridade}</StatusPill>}
                  <Button variant="unstyled" size="unstyled" onClick={(e) => { e.stopPropagation(); if (confirm("Excluir?")) del.mutate(t.id); }}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
            {g.items.length === 0 && <li className="px-5 py-6 text-center text-xs text-muted-foreground">Nada por aqui.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

function KanbanView({ tasks, onPick, leads, projects }: { tasks: TaskRow[]; onPick: (t: TaskRow) => void; leads: any[]; projects: any[] }) {
  const cols: { key: TaskStatus; label: string }[] = [
    { key: "pendente", label: TASK_STATUS_LABEL.pendente },
    { key: "em_andamento", label: TASK_STATUS_LABEL.em_andamento },
    { key: "concluida", label: TASK_STATUS_LABEL.concluida },
    { key: "cancelada", label: TASK_STATUS_LABEL.cancelada },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cols.map((c) => {
        const items = tasks.filter((t) => t.status === c.key);
        return (
          <div key={c.key} className="rounded-2xl border border-border bg-surface-2 shadow-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider">{c.label}</h3>
              <span className="text-[10px] tabular-nums text-muted-foreground">{items.length}</span>
            </div>
            <ul className="space-y-1.5 p-2 max-h-[60vh] overflow-y-auto">
              {items.map((t) => {
                const lead = leads.find((l) => l.id === t.lead_id);
                const proj = projects.find((p) => p.id === t.project_id);
                return (
                  <li key={t.id} onClick={() => onPick(t)}
                    className="cursor-pointer rounded-lg border border-border bg-surface-1 p-2.5 text-xs transition hover:border-primary/40">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug line-clamp-2">{t.titulo}</span>
                      <StatusPill tone={tone(t.prioridade)}>{t.prioridade}</StatusPill>
                    </div>
                    {t.progresso > 0 && t.progresso < 100 && (
                      <div className="my-1.5 h-1 overflow-hidden rounded-full bg-primary/15">
                        <div className="h-full bg-primary" style={{ width: `${t.progresso}%` }} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{fmtDue(t.prazo)}</span>
                      {proj && <span>📁 {proj.titulo.slice(0, 20)}</span>}
                      {lead && <span>🎯 {(lead.empresa || lead.nome).slice(0, 16)}</span>}
                    </div>
                  </li>
                );
              })}
              {items.length === 0 && <li className="py-4 text-center text-[10px] text-muted-foreground">—</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const selectCls = "h-10 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground focus:border-primary/60 focus:outline-none";
