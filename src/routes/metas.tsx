import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import {
  Target, Plus, Pencil, Trash2, Search, TrendingUp, CheckCircle2, AlertTriangle, Clock, Filter,
} from "lucide-react";
import { useGoals, useSaveGoal, useDeleteGoal, type Goal } from "@/hooks/use-goals";
import { useDepartments } from "@/hooks/use-team";
import { toast } from "sonner";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas — Align CRM" }] }),
  component: MetasPage,
});

const STATUS_OPTIONS = ["em_andamento", "concluida", "atrasada", "cancelada"] as const;
const PRIORIDADE_OPTIONS = ["baixa", "media", "alta", "urgente"] as const;

const STATUS_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};
const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
function statusTone(s: string): "success" | "warn" | "danger" | "neutral" {
  if (s === "concluida") return "success";
  if (s === "atrasada") return "danger";
  if (s === "cancelada") return "neutral";
  return "warn";
}
function prioridadeTone(p: string): "success" | "warn" | "danger" | "neutral" {
  return p === "urgente" || p === "alta" ? "danger" : p === "media" ? "warn" : "neutral";
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";
const selectCls =
  "h-10 rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";

function MetasPage() {
  const { data: goals = [], isLoading } = useGoals();
  const { data: deps = [] } = useDepartments();
  const del = useDeleteGoal();
  const save = useSaveGoal();

  const depMap = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.nome])), [deps]);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [fPrio, setFPrio] = useState<string>("todas");
  const [fDep, setFDep] = useState<string>("todos");

  const filtered = useMemo(() => {
    return goals.filter((g) => {
      if (fStatus !== "todos" && g.status !== fStatus) return false;
      if (fPrio !== "todas" && g.prioridade !== fPrio) return false;
      if (fDep !== "todos") {
        if (fDep === "sem_dep" && g.department_id) return false;
        if (fDep !== "sem_dep" && g.department_id !== fDep) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          g.nome.toLowerCase().includes(q) ||
          (g.descricao ?? "").toLowerCase().includes(q) ||
          (g.categoria ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [goals, fStatus, fPrio, fDep, query]);

  const metrics = useMemo(() => {
    const total = goals.length;
    const emAndamento = goals.filter((g) => g.status === "em_andamento").length;
    const concluidas = goals.filter((g) => g.status === "concluida").length;
    const atrasadas = goals.filter((g) => g.status === "atrasada").length;
    const media = total ? Math.round(goals.reduce((s, g) => s + (g.progresso ?? 0), 0) / total) : 0;
    return { total, emAndamento, concluidas, atrasadas, media };
  }, [goals]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);

  const openNew = () =>
    (setEditing({ status: "em_andamento", prioridade: "media", progresso: 0 }), setOpen(true));
  const openEdit = (g: Goal) => (setEditing(g), setOpen(true));

  function submitGoal() {
    if (!editing?.nome?.trim()) return toast.error("Informe o nome da meta");
    save.mutate({ ...(editing as any), nome: editing.nome! }, { onSuccess: () => setOpen(false) });
  }

  return (
    <AppShell
      title="Metas"
      subtitle={`${metrics.total} metas · ${metrics.media}% de progresso médio`}
      action={<PrimaryButton icon={Plus} onClick={openNew}>Nova meta</PrimaryButton>}
    >
      {/* Métricas */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Metric icon={Target} label="Total" value={metrics.total} />
        <Metric icon={Clock} label="Em andamento" value={metrics.emAndamento} tone="warn" />
        <Metric icon={CheckCircle2} label="Concluídas" value={metrics.concluidas} tone="success" />
        <Metric icon={AlertTriangle} label="Atrasadas" value={metrics.atrasadas} tone="danger" />
        <Metric icon={TrendingUp} label="Progresso médio" value={`${metrics.media}%`} />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar meta..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls}>
          <option value="todos">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={fPrio} onChange={(e) => setFPrio(e.target.value)} className={selectCls}>
          <option value="todas">Toda prioridade</option>
          {PRIORIDADE_OPTIONS.map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
        </select>
        <select value={fDep} onChange={(e) => setFDep(e.target.value)} className={selectCls}>
          <option value="todos">Todos os departamentos</option>
          <option value="sem_dep">Sem departamento</option>
          {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} de {goals.length}
        </span>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
          <Target className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhuma meta encontrada</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crie objetivos por departamento, defina prazo e acompanhe o progresso.
          </p>
          <button
            onClick={openNew}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <article
              key={g.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 shadow-card transition hover:-translate-y-px hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => openEdit(g)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-display text-[15px] font-semibold tracking-tight">{g.nome}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {g.descricao ?? "Sem descrição"}
                  </div>
                </button>
                <div className="flex opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(g)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                    aria-label="Editar"
                  ><Pencil className="h-3.5 w-3.5" /></button>
                  <button
                    onClick={() => confirm("Remover meta?") && del.mutate(g.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    aria-label="Remover"
                  ><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusPill tone={statusTone(g.status)}>{STATUS_LABEL[g.status] ?? g.status}</StatusPill>
                <StatusPill tone={prioridadeTone(g.prioridade)}>{PRIORIDADE_LABEL[g.prioridade] ?? g.prioridade}</StatusPill>
                {g.categoria && (
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {g.categoria}
                  </span>
                )}
                {g.department_id && depMap[g.department_id] && (
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {depMap[g.department_id]}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Progresso</span>
                  <span className="tabular-nums font-semibold text-foreground">{g.progresso}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, g.progresso ?? 0))}%` }}
                  />
                </div>
              </div>

              {g.prazo && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Prazo: {new Date(g.prazo).toLocaleDateString("pt-BR")}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Panel */}
      <AlignPanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Meta"
        title={editing?.id ? editing.nome ?? "Editar meta" : "Nova meta"}
        subtitle={editing?.id ? "Atualize dados, progresso e prazo" : "Defina objetivo, prazo e responsáveis"}
        status={editing?.status ? { label: STATUS_LABEL[editing.status] ?? String(editing.status), tone: statusTone(String(editing.status)) } : undefined}
        footer={
          <AlignPanelFooter
            secondary={{ label: "Cancelar", onClick: () => setOpen(false) }}
            primary={{ label: editing?.id ? "Salvar alterações" : "Criar meta", onClick: submitGoal, loading: save.isPending }}
          />
        }
      >
        {editing && (
          <div className="space-y-5">
            <AlignPanelSection title="Identificação" icon={Target}>
              <FormField label="Nome da meta *">
                <input
                  autoFocus
                  value={editing.nome ?? ""}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  className={inputCls}
                  placeholder="Ex: Fechar 20 contratos no Q4"
                />
              </FormField>
              <FormField label="Descrição">
                <textarea
                  rows={3}
                  value={editing.descricao ?? ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none"
                  placeholder="Contexto, critérios de sucesso e observações"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Categoria">
                  <input
                    value={editing.categoria ?? ""}
                    onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                    className={inputCls}
                    placeholder="Vendas, Operações…"
                  />
                </FormField>
                <FormField label="Departamento">
                  <select
                    value={editing.department_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
                    className={`${selectCls} w-full`}
                  >
                    <option value="">—</option>
                    {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </FormField>
              </div>
            </AlignPanelSection>

            <AlignPanelSection title="Status e prioridade" icon={Filter}>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Status">
                  <select
                    value={editing.status ?? "em_andamento"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className={`${selectCls} w-full`}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </FormField>
                <FormField label="Prioridade">
                  <select
                    value={editing.prioridade ?? "media"}
                    onChange={(e) => setEditing({ ...editing, prioridade: e.target.value })}
                    className={`${selectCls} w-full`}
                  >
                    {PRIORIDADE_OPTIONS.map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
                  </select>
                </FormField>
              </div>
            </AlignPanelSection>

            <AlignPanelSection title="Prazo e progresso" icon={Clock}>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Início">
                  <input
                    type="date"
                    value={editing.data_inicio ?? ""}
                    onChange={(e) => setEditing({ ...editing, data_inicio: e.target.value || null })}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Prazo final">
                  <input
                    type="date"
                    value={editing.prazo ?? ""}
                    onChange={(e) => setEditing({ ...editing, prazo: e.target.value || null })}
                    className={inputCls}
                  />
                </FormField>
              </div>
              <FormField label={`Progresso (${editing.progresso ?? 0}%)`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editing.progresso ?? 0}
                  onChange={(e) => setEditing({ ...editing, progresso: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Meta valor">
                  <input
                    type="number"
                    step="0.01"
                    value={editing.meta_valor ?? ""}
                    onChange={(e) => setEditing({ ...editing, meta_valor: e.target.value ? Number(e.target.value) : null })}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Valor atual">
                  <input
                    type="number"
                    step="0.01"
                    value={editing.valor_atual ?? ""}
                    onChange={(e) => setEditing({ ...editing, valor_atual: e.target.value ? Number(e.target.value) : null })}
                    className={inputCls}
                  />
                </FormField>
              </div>
            </AlignPanelSection>

            {editing.id && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (confirm("Remover esta meta permanentemente?")) {
                      del.mutate(editing.id!, { onSuccess: () => setOpen(false) });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir meta
                </button>
              </div>
            )}
          </div>
        )}
      </AlignPanel>
    </AppShell>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number | string; tone?: "danger" | "warn" | "success" }) {
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
