import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { useGoals, useSaveGoal, useDeleteGoal, type Goal } from "@/hooks/use-goals";
import { useDepartments } from "@/hooks/use-team";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas — Align CRM" }] }),
  component: MetasPage,
});

function MetasPage() {
  const { data: goals = [] } = useGoals();
  const { data: deps = [] } = useDepartments();
  const del = useDeleteGoal();
  const save = useSaveGoal();
  const [f, setF] = useState<Partial<Goal>>({});
  const [open, setOpen] = useState(false);
  const depMap = useMemo(() => Object.fromEntries(deps.map(d => [d.id, d.nome])), [deps]);

  return (
    <div className="p-6 space-y-6 anim-fade-up">
      <header className="flex items-start justify-between">
        <div className="stack-tight">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Target className="size-6" />Metas</h1>
          <p className="text-sm text-muted-foreground">Objetivos por departamento com progresso e prazo.</p>
        </div>
        <Button onClick={() => { setF({ status: "em_andamento", prioridade: "media", progresso: 0 }); setOpen(true); }}><Plus className="size-4 mr-1" />Nova meta</Button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {goals.map(g => (
          <Card key={g.id} className="p-4 lift">
            <div className="flex justify-between items-start">
              <div className="font-semibold">{g.nome}</div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setF(g); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(g.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.descricao ?? "—"}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
              <Badge variant="secondary" className="text-[10px]">{g.prioridade}</Badge>
              {g.categoria && <Badge variant="outline" className="text-[10px]">{g.categoria}</Badge>}
              {g.department_id && <Badge variant="outline" className="text-[10px]">{depMap[g.department_id]}</Badge>}
              {g.prazo && <Badge variant="outline" className="text-[10px]">Prazo: {g.prazo}</Badge>}
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs"><span>Progresso</span><span>{g.progresso}%</span></div>
              <Progress value={g.progresso} />
            </div>
          </Card>
        ))}
        {goals.length === 0 && <div className="col-span-3 text-center text-sm text-muted-foreground py-12"><Target className="size-8 mx-auto mb-2 opacity-40" />Nenhuma meta ainda.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{f.id ? "Editar" : "Nova"} meta</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome</Label><Input value={f.nome ?? ""} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Textarea value={f.descricao ?? ""} onChange={e => setF({ ...f, descricao: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={f.categoria ?? ""} onChange={e => setF({ ...f, categoria: e.target.value })} /></div>
            <div><Label>Departamento</Label>
              <Select value={f.department_id ?? "none"} onValueChange={v => setF({ ...f, department_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{deps.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status ?? "em_andamento"} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["em_andamento", "concluida", "atrasada", "cancelada"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={f.prioridade ?? "media"} onValueChange={v => setF({ ...f, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixa", "media", "alta", "urgente"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data início</Label><Input type="date" value={f.data_inicio ?? ""} onChange={e => setF({ ...f, data_inicio: e.target.value || null })} /></div>
            <div><Label>Prazo</Label><Input type="date" value={f.prazo ?? ""} onChange={e => setF({ ...f, prazo: e.target.value || null })} /></div>
            <div><Label>Progresso (%)</Label><Input type="number" min={0} max={100} value={f.progresso ?? 0} onChange={e => setF({ ...f, progresso: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!f.nome) return; save.mutate({ ...f, nome: f.nome! }, { onSuccess: () => setOpen(false) }); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
