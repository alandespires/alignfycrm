import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Building2, Briefcase, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import {
  useDepartments, useSaveDepartment, useDeleteDepartment,
  useTeamMembers, useSaveTeamMember, useDeleteTeamMember,
  useJobOpenings, useSaveJobOpening, useDeleteJobOpening,
  type Department, type TeamMember, type JobOpening,
} from "@/hooks/use-team";

export const Route = createFileRoute("/equipe")({
  head: () => ({ meta: [{ title: "Equipe — Align CRM" }] }),
  component: EquipePage,
});

function EquipePage() {
  return (
    <div className="p-6 space-y-6 anim-fade-up">
      <header className="stack-tight">
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">Colaboradores, departamentos e vagas abertas.</p>
      </header>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          <TabsTrigger value="vagas">Vagas</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><DashboardTab /></TabsContent>
        <TabsContent value="colaboradores" className="mt-4"><MembersTab /></TabsContent>
        <TabsContent value="departamentos" className="mt-4"><DepartmentsTab /></TabsContent>
        <TabsContent value="vagas" className="mt-4"><JobsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const members = useTeamMembers().data ?? [];
  const jobs = useJobOpenings().data ?? [];
  const departments = useDepartments().data ?? [];
  const ativos = members.filter(m => m.status === "ativo").length;
  const ferias = members.filter(m => m.status === "ferias").length;
  const abertas = jobs.filter(j => j.status === "aberta").length;
  const folha = members.filter(m => m.status === "ativo").reduce((s, m) => s + (m.salario ?? 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Kpi icon={<Users className="size-4" />} label="Colaboradores ativos" value={ativos} />
      <Kpi icon={<Users className="size-4" />} label="Em férias" value={ferias} />
      <Kpi icon={<Building2 className="size-4" />} label="Departamentos" value={departments.length} />
      <Kpi icon={<Briefcase className="size-4" />} label="Vagas abertas" value={abertas} />
      <Card className="p-4 md:col-span-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Folha mensal (ativos)</div>
            <div className="text-2xl font-bold">{brl(folha)}</div>
          </div>
          <DollarSign className="size-6 text-primary" />
        </div>
      </Card>
    </div>
  );
}
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4 lift">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}
function brl(n: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0); }

function MembersTab() {
  const { data: members = [] } = useTeamMembers();
  const { data: deps = [] } = useDepartments();
  const del = useDeleteTeamMember();
  const [edit, setEdit] = useState<TeamMember | null>(null);
  const [open, setOpen] = useState(false);
  const depMap = useMemo(() => Object.fromEntries(deps.map(d => [d.id, d.nome])), [deps]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{members.length} colaboradores</div>
        <Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="size-4 mr-1" />Novo</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead><TableHead>Cargo</TableHead><TableHead>Departamento</TableHead>
          <TableHead>Status</TableHead><TableHead>Salário</TableHead><TableHead className="w-24"></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {members.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.nome}<div className="text-xs text-muted-foreground">{m.email}</div></TableCell>
              <TableCell>{m.cargo ?? "—"}</TableCell>
              <TableCell>{m.department_id ? depMap[m.department_id] ?? "—" : "—"}</TableCell>
              <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
              <TableCell>{m.salario ? brl(m.salario) : "—"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => { setEdit(m); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(m.id)}><Trash2 className="size-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum colaborador ainda.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <MemberDialog open={open} onOpenChange={setOpen} item={edit} deps={deps} members={members} />
    </Card>
  );
}
function MemberDialog({ open, onOpenChange, item, deps, members }: { open: boolean; onOpenChange: (v: boolean) => void; item: TeamMember | null; deps: Department[]; members: TeamMember[] }) {
  const save = useSaveTeamMember();
  const [f, setF] = useState<Partial<TeamMember>>({});
  const isNew = !item;
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setF(item ?? { status: "ativo" }); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "Novo colaborador" : "Editar colaborador"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={f.nome ?? ""} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>Cargo</Label><Input value={f.cargo ?? ""} onChange={e => setF({ ...f, cargo: e.target.value })} /></div>
          <div><Label>Departamento</Label>
            <Select value={f.department_id ?? "none"} onValueChange={v => setF({ ...f, department_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nenhum</SelectItem>{deps.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={f.status ?? "ativo"} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ativo", "ferias", "afastado", "desligado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Gestor</Label>
            <Select value={f.manager_id ?? "none"} onValueChange={v => setF({ ...f, manager_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nenhum</SelectItem>{members.filter(m => m.id !== item?.id).map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data contratação</Label><Input type="date" value={f.data_contratacao ?? ""} onChange={e => setF({ ...f, data_contratacao: e.target.value || null })} /></div>
          <div><Label>Email</Label><Input type="email" value={f.email ?? ""} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={f.telefone ?? ""} onChange={e => setF({ ...f, telefone: e.target.value })} /></div>
          <div><Label>Salário</Label><Input type="number" step="0.01" value={f.salario ?? ""} onChange={e => setF({ ...f, salario: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome) return; save.mutate({ ...(item ?? {}), ...f, nome: f.nome! }, { onSuccess: () => onOpenChange(false) }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsTab() {
  const { data: deps = [] } = useDepartments();
  const save = useSaveDepartment();
  const del = useDeleteDepartment();
  const [f, setF] = useState<Partial<Department>>({});
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{deps.length} departamentos</div>
        <Button onClick={() => { setF({}); setOpen(true); }}><Plus className="size-4 mr-1" />Novo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {deps.map(d => (
          <Card key={d.id} className="p-4 lift">
            <div className="flex items-start justify-between">
              <div><div className="font-semibold">{d.nome}</div><div className="text-xs text-muted-foreground">{d.descricao ?? "—"}</div></div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setF(d); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(d.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {deps.length === 0 && <div className="text-sm text-muted-foreground col-span-3 text-center py-8">Nenhum departamento.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{f.id ? "Editar" : "Novo"} departamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={f.nome ?? ""} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={f.descricao ?? ""} onChange={e => setF({ ...f, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!f.nome) return; save.mutate({ ...f, nome: f.nome! }, { onSuccess: () => setOpen(false) }); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function JobsTab() {
  const { data: jobs = [] } = useJobOpenings();
  const { data: deps = [] } = useDepartments();
  const save = useSaveJobOpening();
  const del = useDeleteJobOpening();
  const [f, setF] = useState<Partial<JobOpening>>({});
  const [open, setOpen] = useState(false);
  const depMap = useMemo(() => Object.fromEntries(deps.map(d => [d.id, d.nome])), [deps]);
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{jobs.length} vagas</div>
        <Button onClick={() => { setF({ status: "aberta", vagas: 1 }); setOpen(true); }}><Plus className="size-4 mr-1" />Nova vaga</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {jobs.map(j => (
          <Card key={j.id} className="p-4 lift">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{j.titulo}</div>
                <div className="text-xs text-muted-foreground">{j.department_id ? depMap[j.department_id] : "—"} · {j.senioridade} · {j.regime}</div>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline">{j.status}</Badge>
                  <Badge variant="secondary">{j.vagas} vaga(s)</Badge>
                  <Badge variant="secondary">{j.candidatos} candidatos</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setF(j); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(j.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {jobs.length === 0 && <div className="text-sm text-muted-foreground col-span-2 text-center py-8">Nenhuma vaga.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{f.id ? "Editar" : "Nova"} vaga</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Título</Label><Input value={f.titulo ?? ""} onChange={e => setF({ ...f, titulo: e.target.value })} /></div>
            <div><Label>Departamento</Label>
              <Select value={f.department_id ?? "none"} onValueChange={v => setF({ ...f, department_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{deps.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status ?? "aberta"} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["aberta", "em_processo", "fechada", "cancelada"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Senioridade</Label>
              <Select value={f.senioridade ?? "pleno"} onValueChange={v => setF({ ...f, senioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["estagio", "junior", "pleno", "senior", "especialista"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Regime</Label>
              <Select value={f.regime ?? "presencial"} onValueChange={v => setF({ ...f, regime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["presencial", "hibrido", "remoto"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nº vagas</Label><Input type="number" value={f.vagas ?? 1} onChange={e => setF({ ...f, vagas: Number(e.target.value) })} /></div>
            <div><Label>Salário mín</Label><Input type="number" step="0.01" value={f.salario_min ?? ""} onChange={e => setF({ ...f, salario_min: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Salário máx</Label><Input type="number" step="0.01" value={f.salario_max ?? ""} onChange={e => setF({ ...f, salario_max: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Textarea value={f.descricao ?? ""} onChange={e => setF({ ...f, descricao: e.target.value })} /></div>
            <div className="col-span-2"><Label>Requisitos</Label><Textarea value={f.requisitos ?? ""} onChange={e => setF({ ...f, requisitos: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!f.titulo) return; save.mutate({ ...f, titulo: f.titulo!, vagas: f.vagas ?? 1 }, { onSuccess: () => setOpen(false) }); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
