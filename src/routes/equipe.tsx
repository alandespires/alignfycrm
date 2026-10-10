import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import {
  Users, Building2, Briefcase, Plus, Pencil, Trash2, Search, DollarSign, Mail, Phone, IdCard,
} from "@/components/ui/icons";
import {
  useDepartments, useSaveDepartment, useDeleteDepartment,
  useTeamMembers, useSaveTeamMember, useDeleteTeamMember,
  useJobOpenings, useSaveJobOpening, useDeleteJobOpening,
  type Department, type TeamMember, type JobOpening,
} from "@/hooks/use-team";
import { toast } from "sonner";

export const Route = createFileRoute("/equipe")({
  head: () => pageHead("Equipe"),
  component: EquipePage,
});

type TabId = "colaboradores" | "departamentos" | "vagas";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";
const selectCls =
  "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const MEMBER_STATUS = ["ativo", "ferias", "afastado", "desligado"] as const;
const JOB_STATUS = ["aberta", "em_processo", "fechada", "cancelada"] as const;
const SENIORIDADE = ["estagio", "junior", "pleno", "senior", "especialista"] as const;
const REGIME = ["presencial", "hibrido", "remoto"] as const;

function memberTone(s: string): "success" | "warn" | "danger" | "neutral" {
  if (s === "ativo") return "success";
  if (s === "ferias") return "warn";
  if (s === "desligado") return "danger";
  return "neutral";
}
function jobTone(s: string): "success" | "warn" | "info" | "neutral" {
  if (s === "aberta") return "success";
  if (s === "em_processo") return "info";
  if (s === "cancelada") return "neutral";
  return "warn";
}

function EquipePage() {
  const [tab, setTab] = useState<TabId>("colaboradores");
  const members = useTeamMembers().data ?? [];
  const deps = useDepartments().data ?? [];
  const jobs = useJobOpenings().data ?? [];

  const ativos = members.filter((m) => m.status === "ativo").length;
  const abertas = jobs.filter((j) => j.status === "aberta").length;
  const folha = members.filter((m) => m.status === "ativo").reduce((s, m) => s + (m.salario ?? 0), 0);

  // Panel state — shared for all three entity types
  const [panel, setPanel] = useState<
    | { kind: "member"; item: Partial<TeamMember> | null }
    | { kind: "department"; item: Partial<Department> | null }
    | { kind: "job"; item: Partial<JobOpening> | null }
    | null
  >(null);

  return (
    <AppShell
      title="Equipe"
      subtitle={`${ativos} ativos · ${deps.length} departamentos · ${abertas} vagas abertas`}
      action={
        <PrimaryButton
          icon={Plus}
          onClick={() => {
            if (tab === "colaboradores") setPanel({ kind: "member", item: { status: "ativo" } });
            else if (tab === "departamentos") setPanel({ kind: "department", item: {} });
            else setPanel({ kind: "job", item: { status: "aberta", vagas: 1, senioridade: "pleno", regime: "presencial" } });
          }}
        >
          {tab === "colaboradores" ? "Novo colaborador" : tab === "departamentos" ? "Novo departamento" : "Nova vaga"}
        </PrimaryButton>
      }
    >
      {/* Métricas */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Users} label="Colaboradores ativos" value={ativos} tone="success" />
        <Metric icon={Building2} label="Departamentos" value={deps.length} />
        <Metric icon={Briefcase} label="Vagas abertas" value={abertas} tone="warn" />
        <Metric icon={DollarSign} label="Folha mensal" value={brl(folha)} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
        <TabBtn active={tab === "colaboradores"} onClick={() => setTab("colaboradores")}>Colaboradores ({members.length})</TabBtn>
        <TabBtn active={tab === "departamentos"} onClick={() => setTab("departamentos")}>Departamentos ({deps.length})</TabBtn>
        <TabBtn active={tab === "vagas"} onClick={() => setTab("vagas")}>Vagas ({jobs.length})</TabBtn>
      </div>

      {tab === "colaboradores" && (
        <MembersView
          members={members}
          deps={deps}
          onEdit={(m) => setPanel({ kind: "member", item: m })}
        />
      )}
      {tab === "departamentos" && (
        <DepartmentsView
          deps={deps}
          members={members}
          onEdit={(d) => setPanel({ kind: "department", item: d })}
        />
      )}
      {tab === "vagas" && (
        <JobsView
          jobs={jobs}
          deps={deps}
          onEdit={(j) => setPanel({ kind: "job", item: j })}
        />
      )}

      {panel?.kind === "member" && (
        <MemberPanel
          member={panel.item}
          deps={deps}
          members={members}
          onClose={() => setPanel(null)}
        />
      )}
      {panel?.kind === "department" && (
        <DepartmentPanel
          department={panel.item}
          members={members}
          onClose={() => setPanel(null)}
        />
      )}
      {panel?.kind === "job" && (
        <JobPanel
          job={panel.item}
          deps={deps}
          onClose={() => setPanel(null)}
        />
      )}
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="unstyled" size="unstyled"
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition ${
        active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

/* ==================== MEMBERS ==================== */

function MembersView({
  members, deps, onEdit,
}: { members: TeamMember[]; deps: Department[]; onEdit: (m: TeamMember) => void }) {
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fDep, setFDep] = useState("todos");
  const del = useDeleteTeamMember();
  const depMap = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.nome])), [deps]);

  const filtered = members.filter((m) => {
    if (fStatus !== "todos" && m.status !== fStatus) return false;
    if (fDep !== "todos" && m.department_id !== fDep) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      return (
        m.nome.toLowerCase().includes(s) ||
        (m.cargo ?? "").toLowerCase().includes(s) ||
        (m.email ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colaborador..." className={`${inputCls} pl-9`} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls + " max-w-[180px]"}>
          <option value="todos">Todos os status</option>
          {MEMBER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fDep} onChange={(e) => setFDep(e.target.value)} className={selectCls + " max-w-[220px]"}>
          <option value="todos">Todos os departamentos</option>
          {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length} de {members.length}</span>
      </div>

      {filtered.length === 0 ? (
        <Empty icon={Users} title="Nenhum colaborador" hint="Adicione pessoas à equipe para começar." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Salário</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="cursor-pointer transition hover:bg-surface-3/50" onClick={() => onEdit(m)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                        {m.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{m.nome}</div>
                        {m.email && <div className="truncate text-[11px] text-muted-foreground">{m.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.cargo ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.department_id ? depMap[m.department_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3"><StatusPill tone={memberTone(m.status)}>{m.status}</StatusPill></td>
                  <td className="px-4 py-3 text-right tabular-nums">{m.salario ? brl(m.salario) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="unstyled" size="unstyled"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Remover colaborador?")) del.mutate(m.id); }}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberPanel({
  member, deps, members, onClose,
}: {
  member: Partial<TeamMember> | null;
  deps: Department[]; members: TeamMember[]; onClose: () => void;
}) {
  const save = useSaveTeamMember();
  const del = useDeleteTeamMember();
  const [f, setF] = useState<Partial<TeamMember>>(member ?? {});

  function submit() {
    if (!f.nome?.trim()) return toast.error("Informe o nome");
    save.mutate({ ...f, nome: f.nome! }, { onSuccess: onClose });
  }

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Colaborador"
      title={f.id ? f.nome ?? "Editar colaborador" : "Novo colaborador"}
      subtitle={f.cargo ?? "Complete os dados profissionais"}
      status={f.status ? { label: String(f.status), tone: memberTone(String(f.status)) } : undefined}
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: f.id ? "Salvar" : "Criar colaborador", onClick: submit, loading: save.isPending }}
        />
      }
    >
      <div className="space-y-5">
        <AlignPanelSection title="Perfil" icon={IdCard}>
          <FormField label="Nome completo *">
            <input autoFocus value={f.nome ?? ""} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cargo">
              <input value={f.cargo ?? ""} onChange={(e) => setF({ ...f, cargo: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Departamento">
              <select value={f.department_id ?? ""} onChange={(e) => setF({ ...f, department_id: e.target.value || null })} className={selectCls}>
                <option value="">—</option>
                {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Gestor direto">
            <select value={f.manager_id ?? ""} onChange={(e) => setF({ ...f, manager_id: e.target.value || null })} className={selectCls}>
              <option value="">—</option>
              {members.filter((m) => m.id !== f.id).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </FormField>
        </AlignPanelSection>

        <AlignPanelSection title="Contato" icon={Mail}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Telefone">
              <input value={f.telefone ?? ""} onChange={(e) => setF({ ...f, telefone: e.target.value })} className={inputCls} />
            </FormField>
          </div>
        </AlignPanelSection>

        <AlignPanelSection title="Vínculo" icon={Briefcase}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select value={f.status ?? "ativo"} onChange={(e) => setF({ ...f, status: e.target.value })} className={selectCls}>
                {MEMBER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Salário (R$)">
              <input
                type="number" step="0.01"
                value={f.salario ?? ""}
                onChange={(e) => setF({ ...f, salario: e.target.value ? Number(e.target.value) : null })}
                className={inputCls}
              />
            </FormField>
            <FormField label="Contratação">
              <input
                type="date"
                value={f.data_contratacao ?? ""}
                onChange={(e) => setF({ ...f, data_contratacao: e.target.value || null })}
                className={inputCls}
              />
            </FormField>
            <FormField label="Desligamento">
              <input
                type="date"
                value={f.data_desligamento ?? ""}
                onChange={(e) => setF({ ...f, data_desligamento: e.target.value || null })}
                className={inputCls}
              />
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea
              rows={3}
              value={f.observacoes ?? ""}
              onChange={(e) => setF({ ...f, observacoes: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none"
            />
          </FormField>
        </AlignPanelSection>

        {f.id && (
          <div className="pt-2">
            <Button variant="unstyled" size="unstyled"
              onClick={() => { if (confirm("Remover colaborador permanentemente?")) del.mutate(f.id!, { onSuccess: onClose }); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
            ><Trash2 className="h-3.5 w-3.5" /> Excluir colaborador</Button>
          </div>
        )}
      </div>
    </AlignPanel>
  );
}

/* ==================== DEPARTMENTS ==================== */

function DepartmentsView({
  deps, members, onEdit,
}: { deps: Department[]; members: TeamMember[]; onEdit: (d: Department) => void }) {
  const del = useDeleteDepartment();
  if (deps.length === 0) return <Empty icon={Building2} title="Nenhum departamento" hint="Crie departamentos para organizar sua equipe." />;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {deps.map((d) => {
        const count = members.filter((m) => m.department_id === d.id && m.status === "ativo").length;
        return (
          <Button variant="unstyled" size="unstyled"
            key={d.id}
            onClick={() => onEdit(d)}
            className="group rounded-2xl border border-border bg-surface-2 p-4 text-left shadow-card transition hover:-translate-y-px hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-semibold tracking-tight">{d.nome}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.descricao ?? "Sem descrição"}</div>
              </div>
              <Button variant="unstyled" size="unstyled"
                onClick={(e) => { e.stopPropagation(); if (confirm("Remover departamento?")) del.mutate(d.id); }}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive"
              ><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> {count} colaborador{count === 1 ? "" : "es"} ativo{count === 1 ? "" : "s"}
            </div>
          </Button>
        );
      })}
    </div>
  );
}

function DepartmentPanel({
  department, members, onClose,
}: { department: Partial<Department> | null; members: TeamMember[]; onClose: () => void }) {
  const save = useSaveDepartment();
  const del = useDeleteDepartment();
  const [f, setF] = useState<Partial<Department>>(department ?? {});
  function submit() {
    if (!f.nome?.trim()) return toast.error("Informe o nome");
    save.mutate({ ...f, nome: f.nome! }, { onSuccess: onClose });
  }
  return (
    <AlignPanel
      open onClose={onClose}
      eyebrow="Departamento"
      title={f.id ? f.nome ?? "Editar" : "Novo departamento"}
      subtitle={f.id ? "Ajuste dados e gestor" : "Crie uma nova área organizacional"}
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: f.id ? "Salvar" : "Criar", onClick: submit, loading: save.isPending }}
        />
      }
    >
      <div className="space-y-5">
        <AlignPanelSection title="Dados" icon={Building2}>
          <FormField label="Nome *">
            <input autoFocus value={f.nome ?? ""} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Descrição">
            <textarea
              rows={4}
              value={f.descricao ?? ""}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gestor">
              <select value={f.manager_id ?? ""} onChange={(e) => setF({ ...f, manager_id: e.target.value || null })} className={selectCls}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </FormField>
            <FormField label="Cor (hex)">
              <input
                value={f.cor ?? ""} onChange={(e) => setF({ ...f, cor: e.target.value })}
                placeholder="#a3ff12"
                className={inputCls}
              />
            </FormField>
          </div>
        </AlignPanelSection>
        {f.id && (
          <div className="pt-2">
            <Button variant="unstyled" size="unstyled"
              onClick={() => { if (confirm("Remover departamento?")) del.mutate(f.id!, { onSuccess: onClose }); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
            ><Trash2 className="h-3.5 w-3.5" /> Excluir departamento</Button>
          </div>
        )}
      </div>
    </AlignPanel>
  );
}

/* ==================== JOBS ==================== */

function JobsView({
  jobs, deps, onEdit,
}: { jobs: JobOpening[]; deps: Department[]; onEdit: (j: JobOpening) => void }) {
  const del = useDeleteJobOpening();
  const depMap = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.nome])), [deps]);
  if (jobs.length === 0) return <Empty icon={Briefcase} title="Nenhuma vaga" hint="Publique vagas para atrair novos talentos." />;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {jobs.map((j) => (
        <Button variant="unstyled" size="unstyled"
          key={j.id}
          onClick={() => onEdit(j)}
          className="group rounded-2xl border border-border bg-surface-2 p-4 text-left shadow-card transition hover:-translate-y-px hover:border-primary/30"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[15px] font-semibold tracking-tight">{j.titulo}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {j.department_id ? depMap[j.department_id] ?? "—" : "Sem departamento"} · {j.senioridade ?? "—"} · {j.regime ?? "—"}
              </div>
            </div>
            <Button variant="unstyled" size="unstyled"
              onClick={(e) => { e.stopPropagation(); if (confirm("Remover vaga?")) del.mutate(j.id); }}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive"
            ><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusPill tone={jobTone(j.status)}>{j.status}</StatusPill>
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {j.vagas} vaga{j.vagas === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {j.candidatos} candidato{j.candidatos === 1 ? "" : "s"}
            </span>
            {j.salario_min && j.salario_max && (
              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {brl(j.salario_min)} – {brl(j.salario_max)}
              </span>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}

function JobPanel({
  job, deps, onClose,
}: { job: Partial<JobOpening> | null; deps: Department[]; onClose: () => void }) {
  const save = useSaveJobOpening();
  const del = useDeleteJobOpening();
  const [f, setF] = useState<Partial<JobOpening>>(job ?? { vagas: 1 });
  function submit() {
    if (!f.titulo?.trim()) return toast.error("Informe o título");
    save.mutate({ ...f, titulo: f.titulo!, vagas: f.vagas ?? 1 }, { onSuccess: onClose });
  }
  return (
    <AlignPanel
      open onClose={onClose}
      eyebrow="Vaga"
      title={f.id ? f.titulo ?? "Editar vaga" : "Nova vaga"}
      subtitle={f.senioridade ? `${f.senioridade} · ${f.regime ?? "—"}` : "Cadastre a oportunidade"}
      status={f.status ? { label: String(f.status), tone: jobTone(String(f.status)) } : undefined}
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: f.id ? "Salvar" : "Criar vaga", onClick: submit, loading: save.isPending }}
        />
      }
    >
      <div className="space-y-5">
        <AlignPanelSection title="Identificação" icon={Briefcase}>
          <FormField label="Título *">
            <input autoFocus value={f.titulo ?? ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Departamento">
              <select value={f.department_id ?? ""} onChange={(e) => setF({ ...f, department_id: e.target.value || null })} className={selectCls}>
                <option value="">—</option>
                {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={f.status ?? "aberta"} onChange={(e) => setF({ ...f, status: e.target.value })} className={selectCls}>
                {JOB_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Senioridade">
              <select value={f.senioridade ?? "pleno"} onChange={(e) => setF({ ...f, senioridade: e.target.value })} className={selectCls}>
                {SENIORIDADE.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Regime">
              <select value={f.regime ?? "presencial"} onChange={(e) => setF({ ...f, regime: e.target.value })} className={selectCls}>
                {REGIME.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
        </AlignPanelSection>

        <AlignPanelSection title="Remuneração e vagas" icon={DollarSign}>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Nº vagas">
              <input type="number" min={1} value={f.vagas ?? 1} onChange={(e) => setF({ ...f, vagas: Number(e.target.value) })} className={inputCls} />
            </FormField>
            <FormField label="Salário mín">
              <input type="number" step="0.01" value={f.salario_min ?? ""} onChange={(e) => setF({ ...f, salario_min: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </FormField>
            <FormField label="Salário máx">
              <input type="number" step="0.01" value={f.salario_max ?? ""} onChange={(e) => setF({ ...f, salario_max: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </FormField>
          </div>
        </AlignPanelSection>

        <AlignPanelSection title="Descrição">
          <FormField label="Descrição da vaga">
            <textarea
              rows={4} value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none"
            />
          </FormField>
          <FormField label="Requisitos">
            <textarea
              rows={4} value={f.requisitos ?? ""} onChange={(e) => setF({ ...f, requisitos: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 p-3 text-sm focus:border-primary/60 focus:outline-none"
            />
          </FormField>
        </AlignPanelSection>

        {f.id && (
          <div className="pt-2">
            <Button variant="unstyled" size="unstyled"
              onClick={() => { if (confirm("Remover vaga?")) del.mutate(f.id!, { onSuccess: onClose }); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
            ><Trash2 className="h-3.5 w-3.5" /> Excluir vaga</Button>
          </div>
        )}
      </div>
    </AlignPanel>
  );
}

/* ==================== SHARED ==================== */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Empty({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
    </div>
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
