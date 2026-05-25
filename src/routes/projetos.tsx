import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type ProjectStatus, type ProjectRow } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useLeads } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { useEntries, brl, computeEntryReceived, computeEntryBalance } from "@/hooks/use-finance";
import { useAllPayments } from "@/hooks/use-payments";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Briefcase, Plus, X, Loader2, Trash2, Calendar, DollarSign, Target, CheckCircle2, ListChecks, Wallet } from "lucide-react";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Controle de Projetos — Align CRM" }] }),
  component: ProjetosPage,
});

const STATUS_LIST: ProjectStatus[] = ["planejado", "em_andamento", "pausado", "concluido", "cancelado"];
const PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;

function ProjetosPage() {
  useRealtimeSync([
    { table: "projects", queryKeys: [["projects"]] },
    { table: "tasks", queryKeys: [["tasks"]] },
    { table: "financial_entries", queryKeys: [["fin-entries"]] },
  ]);
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useEntries();
  const { data: payments = [] } = useAllPayments();
  const del = useDeleteProject();
  const upd = useUpdateProject();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ProjectStatus | "todos">("todos");
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  const filtered = filter === "todos" ? projects : projects.filter((p) => p.status === filter);

  const stats = useMemo(() => ({
    total: projects.length,
    ativos: projects.filter((p) => p.status === "em_andamento").length,
    concluidos: projects.filter((p) => p.status === "concluido").length,
    valor: projects.filter((p) => p.status !== "cancelado").reduce((s, p) => s + Number(p.valor_total || 0), 0),
  }), [projects]);

  return (
    <AppShell
      title="Controle de Projetos"
      subtitle="Gestão integrada de projetos, tarefas e financeiro"
      action={<PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Novo projeto</PrimaryButton>}
    >
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <KpiCard icon={Briefcase} label="Total" value={String(stats.total)} />
        <KpiCard icon={Target} label="Em andamento" value={String(stats.ativos)} accent />
        <KpiCard icon={CheckCircle2} label="Concluídos" value={String(stats.concluidos)} />
        <KpiCard icon={DollarSign} label="Valor total" value={brl(stats.valor)} accent />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["todos", ...STATUS_LIST] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              filter === s ? "bg-primary text-primary-foreground shadow-glow" : "border border-border bg-surface-1 text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {s === "todos" ? "Todos" : PROJECT_STATUS_LABEL[s as ProjectStatus]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhum projeto ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">Crie seu primeiro projeto para acompanhar entregas, tarefas e receitas.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const client = clients.find((c) => c.id === p.client_id);
            const projectTasks = tasks.filter((t) => (t as any).project_id === p.id);
            const projectEntries = entries.filter((e) => (e as any).project_id === p.id && e.status !== "cancelado");
            const recebido = projectEntries.reduce((s, e) => s + computeEntryReceived(e, payments), 0);
            const pendente = projectEntries.reduce((s, e) => s + computeEntryBalance(e, payments), 0);
            const done = projectTasks.filter((t) => t.status === "concluida").length;
            return (
              <div key={p.id} onClick={() => setSelected(p)} className="cursor-pointer rounded-2xl border border-border bg-surface-2 p-5 shadow-card transition hover:border-primary/40 hover:shadow-elevated">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{p.titulo}</h3>
                    {client && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{client.empresa || client.nome}</p>}
                  </div>
                  <StatusPill tone={PROJECT_STATUS_TONE[p.status] as any}>{PROJECT_STATUS_LABEL[p.status]}</StatusPill>
                </div>
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progresso</span><span className="tabular-nums font-semibold text-foreground">{p.progresso}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
                    <div className="h-full bg-primary transition-all" style={{ width: `${p.progresso}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-surface-1 px-2.5 py-2">
                    <div className="text-muted-foreground">Tarefas</div>
                    <div className="font-semibold tabular-nums">{done}/{projectTasks.length}</div>
                  </div>
                  <div className="rounded-lg bg-surface-1 px-2.5 py-2">
                    <div className="text-muted-foreground">Recebido</div>
                    <div className="font-semibold tabular-nums text-success">{brl(recebido)}</div>
                  </div>
                  <div className="rounded-lg bg-surface-1 px-2.5 py-2">
                    <div className="text-muted-foreground">Pendente</div>
                    <div className="font-semibold tabular-nums text-warning">{brl(pendente)}</div>
                  </div>
                  <div className="rounded-lg bg-surface-1 px-2.5 py-2">
                    <div className="text-muted-foreground">Prazo</div>
                    <div className="font-semibold">{p.prazo ? new Date(p.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <ProjectFormModal onClose={() => setOpen(false)} />}
      {selected && (
        <ProjectDetailDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onDelete={async (id) => { if (confirm("Excluir este projeto?")) { await del.mutateAsync(id); setSelected(null); } }}
          onUpdate={(patch) => upd.mutate({ id: selected.id, ...patch })}
          tasks={tasks.filter((t) => (t as any).project_id === selected.id)}
          entries={entries.filter((e) => (e as any).project_id === selected.id)}
          payments={payments}
        />
      )}
    </AppShell>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={["rounded-2xl border border-border p-4 shadow-card", accent ? "bg-gradient-to-br from-surface-2 to-surface-1" : "bg-surface-2"].join(" ")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ProjectFormModal({ onClose }: { onClose: () => void }) {
  const create = useCreateProject();
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planejado");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [prazo, setPrazo] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    await create.mutateAsync({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      status,
      prioridade,
      prazo: prazo || null,
      valor_total: Number(valor) || 0,
      client_id: clientId || null,
      lead_id: leadId || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-semibold">Novo projeto</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <Field label="Título *"><input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" /></Field>
          <Field label="Descrição"><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-primary/60 focus:outline-none" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                {STATUS_LIST.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Prioridade">
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as any)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Prazo"><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm" /></Field>
            <Field label="Valor total (R$)"><input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm tabular-nums" /></Field>
            <Field label="Cliente">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                <option value="">—</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
              </select>
            </Field>
            <Field label="Lead (Pipeline)">
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                <option value="">—</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.empresa ? `${l.nome} · ${l.empresa}` : l.nome}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs font-medium">Cancelar</button>
          <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Criar projeto
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function ProjectDetailDrawer({ project, onClose, onDelete, onUpdate, tasks, entries, payments }: {
  project: ProjectRow;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (patch: Partial<ProjectRow>) => void;
  tasks: any[];
  entries: any[];
  payments: any[];
}) {
  const recebido = entries.filter((e) => e.status !== "cancelado").reduce((s, e) => s + computeEntryReceived(e, payments), 0);
  const pendente = entries.filter((e) => e.status !== "cancelado").reduce((s, e) => s + computeEntryBalance(e, payments), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-surface-1 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="mb-1.5"><StatusPill tone={PROJECT_STATUS_TONE[project.status] as any}>{PROJECT_STATUS_LABEL[project.status]}</StatusPill></div>
            <h2 className="truncate text-lg font-semibold">{project.titulo}</h2>
            {project.descricao && <p className="mt-1 text-xs text-muted-foreground">{project.descricao}</p>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onDelete(project.id)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-muted-foreground">Progresso</span>
              <span className="tabular-nums font-semibold">{project.progresso}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={project.progresso}
              onChange={(e) => onUpdate({ progresso: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STATUS_LIST.map((s) => (
                <button key={s} onClick={() => onUpdate({ status: s })} className={["rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition", project.status === s ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-muted-foreground"].join(" ")}>{PROJECT_STATUS_LABEL[s]}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat icon={DollarSign} label="Valor total" value={brl(Number(project.valor_total))} />
            <Stat icon={CheckCircle2} label="Recebido" value={brl(recebido)} tone="success" />
            <Stat icon={Wallet} label="Pendente" value={brl(pendente)} tone="warn" />
          </div>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Tarefas vinculadas ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa vinculada. Vá em Tarefas e selecione este projeto.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${t.status === "concluida" ? "text-success" : "text-muted-foreground"}`} />
                    <span className={t.status === "concluida" ? "line-through text-muted-foreground" : ""}>{t.titulo}</span>
                    {t.prazo && <span className="ml-auto text-[10px] text-muted-foreground">{new Date(t.prazo).toLocaleDateString("pt-BR")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Entradas financeiras ({entries.length})</h3>
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma entrada vinculada. Vá em Financeiro e selecione este projeto.</p>
            ) : (
              <ul className="space-y-1.5">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                    <span className="truncate">{e.descricao}</span>
                    <span className="tabular-nums font-semibold text-success">{brl(Number(e.valor))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "success" | "warn" }) {
  const color = tone === "success" ? "text-success" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
