import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import {
  useProjects, useCreateProject, useUpdateProject, useDeleteProject,
  useBulkUpdateProjects, useProjectAuditLogs,
  PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE,
  type ProjectStatus, type ProjectRow,
} from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useLeads } from "@/hooks/use-leads";
import { useTasks } from "@/hooks/use-tasks";
import { useEntries, brl, computeEntryReceived, computeEntryBalance } from "@/hooks/use-finance";
import { useAllPayments } from "@/hooks/use-payments";
import { useRealtimeSync } from "@/hooks/use-realtime";
import {
  Briefcase, Plus, X, Loader2, Trash2, DollarSign, Target, CheckCircle2,
  ListChecks, Wallet, Search, Filter, History, AlertCircle, Ban, Sparkles,
} from "@/components/ui/icons";
import { ProjectTemplatesGallery } from "@/components/project-templates-gallery";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";

export const Route = createFileRoute("/projetos")({
  head: () => pageHead("Controle de Projetos"),
  component: ProjetosPage,
});

const STATUS_LIST: ProjectStatus[] = ["planejado", "em_andamento", "pausado", "concluido", "cancelado"];
const PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;

function ProjetosPage() {
  useRealtimeSync([
    { table: "projects", queryKeys: [["projects"]] },
    { table: "tasks", queryKeys: [["tasks"]] },
    { table: "financial_entries", queryKeys: [["fin-entries"]] },
    { table: "project_audit_logs", queryKeys: [["project-audit"]] },
  ]);
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useEntries();
  const { data: payments = [] } = useAllPayments();
  const del = useDeleteProject();
  const upd = useUpdateProject();
  const bulk = useBulkUpdateProjects();

  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "todos">("todos");
  const [leadFilter, setLeadFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      if (leadFilter && p.lead_id !== leadFilter) return false;
      if (clientFilter && p.client_id !== clientFilter) return false;
      if (from && (!p.prazo || p.prazo < from)) return false;
      if (to && (!p.prazo || p.prazo > to)) return false;
      if (term) {
        const hay = `${p.titulo} ${p.descricao ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [projects, q, statusFilter, leadFilter, clientFilter, from, to]);

  const stats = useMemo(() => ({
    total: projects.length,
    ativos: projects.filter((p) => p.status === "em_andamento").length,
    concluidos: projects.filter((p) => p.status === "concluido").length,
    valor: projects.filter((p) => p.status !== "cancelado").reduce((s, p) => s + Number(p.valor_total || 0), 0),
  }), [projects]);

  function clearFilters() {
    setQ(""); setStatusFilter("todos"); setLeadFilter(""); setClientFilter(""); setFrom(""); setTo("");
  }
  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function pickAll() {
    setPicked(picked.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)));
  }
  async function bulkApply(status: ProjectStatus) {
    const ids = Array.from(picked);
    if (!ids.length) return;
    const dangerous = status === "cancelado" || status === "concluido";
    if (dangerous && !confirm(`Aplicar "${PROJECT_STATUS_LABEL[status]}" a ${ids.length} projeto(s)? Isso pode cancelar entradas financeiras, tarefas e mover leads vinculados.`)) return;
    await bulk.mutateAsync({ ids, status });
    setPicked(new Set());
  }

  const activeFilters = (statusFilter !== "todos" ? 1 : 0) + (leadFilter ? 1 : 0) + (clientFilter ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  return (
    <AppShell
      title="Controle de Projetos"
      subtitle="Gestão integrada de projetos, tarefas e financeiro"
      action={
        <div className="flex items-center gap-2">
          <Button variant="unstyled" size="unstyled" onClick={() => setTemplatesOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-xs font-semibold transition hover:border-primary/50">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Templates
          </Button>
          <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Novo projeto</PrimaryButton>
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <KpiCard icon={Briefcase} label="Total" value={String(stats.total)} />
        <KpiCard icon={Target} label="Em andamento" value={String(stats.ativos)} accent />
        <KpiCard icon={CheckCircle2} label="Concluídos" value={String(stats.concluidos)} />
        <KpiCard icon={DollarSign} label="Valor total" value={brl(stats.valor)} accent />
      </div>

      {/* Filters */}
      <div className="mb-3 rounded-2xl border border-border bg-surface-1 p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, descrição ou tag…"
              className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-8 pr-3 text-xs focus:border-primary/60 focus:outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-9 rounded-lg border border-border bg-surface-2 px-2.5 text-xs">
            <option value="todos">Todos os status</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
          </select>
          <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} className="h-9 max-w-[180px] rounded-lg border border-border bg-surface-2 px-2.5 text-xs">
            <option value="">Todos os leads</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-9 max-w-[180px] rounded-lg border border-border bg-surface-2 px-2.5 text-xs">
            <option value="">Todos os clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
          </select>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 text-[10px]">
            <span className="text-muted-foreground">Prazo</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 bg-transparent text-xs focus:outline-none" />
            <span className="text-muted-foreground">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 bg-transparent text-xs focus:outline-none" />
          </div>
          {activeFilters > 0 && (
            <Button variant="unstyled" size="unstyled" onClick={clearFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Limpar ({activeFilters})
            </Button>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {filtered.length} de {projects.length}
          </span>
        </div>

        {picked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">{picked.size} selecionado(s)</span>
            <span className="ml-2 text-[11px] text-muted-foreground">Alterar status para:</span>
            {STATUS_LIST.map((s) => (
              <Button variant="unstyled" size="unstyled"
                key={s} onClick={() => bulkApply(s)} disabled={bulk.isPending}
                className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition hover:border-primary/60 hover:text-primary disabled:opacity-50"
              >
                {PROJECT_STATUS_LABEL[s]}
              </Button>
            ))}
            <Button variant="unstyled" size="unstyled" onClick={() => setPicked(new Set())} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">
              Limpar seleção
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">{projects.length === 0 ? "Nenhum projeto ainda" : "Nenhum projeto corresponde aos filtros"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{projects.length === 0 ? "Crie seu primeiro projeto." : "Ajuste ou limpe os filtros."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2.5 text-left">
                  <input type="checkbox" checked={picked.size === filtered.length && filtered.length > 0} onChange={pickAll} className="h-3.5 w-3.5 accent-primary" />
                </th>
                <th className="px-3 py-2.5 text-left font-semibold">Projeto</th>
                <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold">Progresso</th>
                <th className="px-3 py-2.5 text-left font-semibold">Lead/Cliente</th>
                <th className="px-3 py-2.5 text-right font-semibold">Recebido</th>
                <th className="px-3 py-2.5 text-right font-semibold">Pendente</th>
                <th className="px-3 py-2.5 text-left font-semibold">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const client = clients.find((c) => c.id === p.client_id);
                const lead = leads.find((l) => l.id === p.lead_id);
                const projectTasks = tasks.filter((t) => (t as any).project_id === p.id);
                const projectEntries = entries.filter((e) => (e as any).project_id === p.id && e.status !== "cancelado");
                const recebido = projectEntries.reduce((s, e) => s + computeEntryReceived(e, payments), 0);
                const pendente = projectEntries.reduce((s, e) => s + computeEntryBalance(e, payments), 0);
                const done = projectTasks.filter((t) => t.status === "concluida").length;
                const overdue = p.prazo && new Date(p.prazo + "T12:00:00") < new Date() && p.status !== "concluido" && p.status !== "cancelado";
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-border transition hover:bg-surface-2"
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePick(p.id)} className="h-3.5 w-3.5 accent-primary" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{p.titulo}</div>
                      {p.descricao && <div className="truncate text-[11px] text-muted-foreground">{p.descricao}</div>}
                    </td>
                    <td className="px-3 py-2.5"><StatusPill tone={PROJECT_STATUS_TONE[p.status] as any}>{PROJECT_STATUS_LABEL[p.status]}</StatusPill></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-primary/15">
                          <div className="h-full bg-primary" style={{ width: `${p.progresso}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground">{p.progresso}%</span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{done}/{projectTasks.length} tarefas</div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      {lead && <div className="truncate">🎯 {lead.nome}</div>}
                      {client && <div className="truncate text-muted-foreground">🏢 {client.empresa || client.nome}</div>}
                      {!lead && !client && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-success">{brl(recebido)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-warning">{brl(pendente)}</td>
                    <td className="px-3 py-2.5">
                      <span className={overdue ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {p.prazo ? new Date(p.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                      </span>
                      {overdue && <AlertCircle className="ml-1 inline h-3 w-3 text-destructive" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && <ProjectFormModal onClose={() => setOpen(false)} />}
      {templatesOpen && <ProjectTemplatesGallery onClose={() => setTemplatesOpen(false)} />}
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
      titulo: titulo.trim(), descricao: descricao.trim() || null,
      status, prioridade, prazo: prazo || null,
      valor_total: Number(valor) || 0, client_id: clientId || null, lead_id: leadId || null,
    });
    onClose();
  }

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Projeto"
      title="Novo projeto"
      widthClass="md:max-w-[640px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: "Criar projeto", onClick: () => document.getElementById("project-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })), loading: create.isPending }}
        />
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-3">
        <Field label="Título *"><input required maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" /></Field>
        <Field label="Descrição"><textarea maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-primary/60 focus:outline-none" /></Field>
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
      </form>
    </AlignPanel>
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
  tasks: any[]; entries: any[]; payments: any[];
}) {
  const [tab, setTab] = useState<string>("overview");
  const recebido = entries.filter((e) => e.status !== "cancelado").reduce((s, e) => s + computeEntryReceived(e, payments), 0);
  const pendente = entries.filter((e) => e.status !== "cancelado").reduce((s, e) => s + computeEntryBalance(e, payments), 0);
  const { data: logs = [] } = useProjectAuditLogs(project.id);

  function handleStatusChange(s: ProjectStatus) {
    if (s === project.status) return;
    if (s === "cancelado") {
      if (!confirm("Cancelar este projeto irá:\n• cancelar entradas financeiras vinculadas (saem dos relatórios)\n• cancelar tarefas pendentes\n• marcar o lead vinculado como Perdido\n\nContinuar?")) return;
    }
    if (s === "concluido") {
      if (!confirm("Concluir este projeto irá marcar o lead vinculado como Fechado. Continuar?")) return;
    }
    onUpdate({ status: s });
  }

  const statusTone = project.status === "concluido" ? "success"
    : project.status === "cancelado" ? "danger"
    : project.status === "pausado" ? "warn"
    : project.status === "em_andamento" ? "info"
    : "neutral";

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Projeto"
      title={project.titulo}
      subtitle={project.descricao || undefined}
      status={{ label: PROJECT_STATUS_LABEL[project.status], tone: statusTone as any }}
      expandable
      headerActions={
        <Button variant="unstyled" size="unstyled"
          onClick={() => onDelete(project.id)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      tabs={[
        { id: "overview", label: "Visão geral" },
        { id: "tasks", label: "Tarefas", count: tasks.length },
        { id: "finance", label: "Financeiro", count: entries.length },
        { id: "audit", label: "Histórico", count: logs.length },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      footer={
        <AlignPanelFooter
          secondary={{ label: "Fechar", onClick: onClose }}
          primary={{ label: project.status === "concluido" ? "Reabrir" : "Marcar como concluído", onClick: () => handleStatusChange(project.status === "concluido" ? "em_andamento" : "concluido") }}
        />
      }
    >
      {tab === "overview" && (
        <div className="space-y-6">
          <AlignPanelSection title="Progresso">
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-3xl font-black tabular-nums text-primary">{project.progresso}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Concluído</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-primary shadow-[0_0_10px_var(--primary)] transition-all" style={{ width: `${project.progresso}%` }} />
              </div>
              <input
                type="range" min={0} max={100} step={5} value={project.progresso}
                onChange={(e) => onUpdate({ progresso: Number(e.target.value) })}
                className="mt-3 w-full accent-primary"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATUS_LIST.map((s) => (
                  <Button variant="unstyled" size="unstyled" key={s} onClick={() => handleStatusChange(s)} className={["rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition", project.status === s ? "bg-primary text-primary-foreground" : "border border-border bg-surface-1 text-muted-foreground hover:text-foreground"].join(" ")}>{PROJECT_STATUS_LABEL[s]}</Button>
                ))}
              </div>
            </div>
          </AlignPanelSection>

          <div className="grid grid-cols-3 gap-2">
            <Stat icon={DollarSign} label="Valor total" value={brl(Number(project.valor_total))} />
            <Stat icon={CheckCircle2} label="Recebido" value={brl(recebido)} tone="success" />
            <Stat icon={Wallet} label="Pendente" value={brl(pendente)} tone="warn" />
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <AlignPanelSection title={`Tarefas vinculadas (${tasks.length})`} icon={ListChecks}>
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${t.status === "concluida" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={t.status === "concluida" ? "line-through text-muted-foreground" : ""}>{t.titulo}</span>
                  {t.prazo && <span className="ml-auto text-[10px] text-muted-foreground">{new Date(t.prazo).toLocaleDateString("pt-BR")}</span>}
                </li>
              ))}
            </ul>
          )}
        </AlignPanelSection>
      )}

      {tab === "finance" && (
        <AlignPanelSection title={`Entradas financeiras (${entries.length})`} icon={Wallet}>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">Nenhuma entrada vinculada.</p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <li key={e.id} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${e.status === "cancelado" ? "border-destructive/30 bg-destructive/5" : "border-border bg-surface-2"}`}>
                  <span className="flex items-center gap-2 truncate">
                    {e.status === "cancelado" && <Ban className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                    <span className={e.status === "cancelado" ? "line-through text-muted-foreground" : ""}>{e.descricao}</span>
                  </span>
                  <span className={`tabular-nums font-semibold ${e.status === "cancelado" ? "text-muted-foreground" : "text-primary"}`}>{brl(Number(e.valor))}</span>
                </li>
              ))}
            </ul>
          )}
        </AlignPanelSection>
      )}

      {tab === "audit" && (
        <AlignPanelSection title={`Auditoria (${logs.length})`} icon={History}>
          {logs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">Sem registros de alterações ainda.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-xl border border-border bg-surface-2 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {l.action === "project_cancelled" && "Projeto cancelado"}
                      {l.action === "project_completed" && "Projeto concluído"}
                      {l.action === "status_changed" && "Status alterado"}
                      {l.action === "project_deleted" && "Projeto removido"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {l.from_status && l.to_status && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {PROJECT_STATUS_LABEL[l.from_status as ProjectStatus] ?? l.from_status} → <span className="text-foreground">{PROJECT_STATUS_LABEL[l.to_status as ProjectStatus] ?? l.to_status}</span>
                    </div>
                  )}
                  {(l.affected_entries?.length || 0) > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entradas afetadas ({l.affected_entries.length})</div>
                      <ul className="mt-1 space-y-0.5">
                        {l.affected_entries.map((e: any) => (
                          <li key={e.id} className="flex justify-between text-[11px]">
                            <span className="truncate">• {e.descricao}</span>
                            <span className="ml-2 tabular-nums text-muted-foreground">{brl(Number(e.valor))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(l.affected_tasks?.length || 0) > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarefas afetadas ({l.affected_tasks.length})</div>
                      <ul className="mt-1 space-y-0.5">
                        {l.affected_tasks.map((t: any) => (
                          <li key={t.id} className="text-[11px]">• {t.titulo}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(l.affected_leads?.length || 0) > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lead sincronizado</div>
                      <ul className="mt-1 space-y-0.5">
                        {l.affected_leads.map((ld: any) => (
                          <li key={ld.id} className="text-[11px]">• {ld.nome}: {ld.from_status} → <span className="text-foreground">{ld.to_status}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AlignPanelSection>
      )}
    </AlignPanel>
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
