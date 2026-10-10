import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCourses, useUpsertCourse, useDeleteCourse, type Course } from "@/hooks/use-school";
import { Plus, Pencil, Trash2, BookMarked } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/cursos")({
  head: () => pageHead("Escolar · Cursos"), component: Page });

function Page() {
  const { data = [], isLoading } = useCourses();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const upsert = useUpsertCourse();
  const del = useDeleteCourse();

  function openNew() { setEditing({ nome: "", descricao: "", carga_horaria: 0, status: "ativo" }); setOpen(true); }
  function openEdit(c: Course) { setEditing(c); setOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} curso{data.length !== 1 ? "s" : ""}</p>
        <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" />Novo curso</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {data.map((c) => (
          <div key={c.id} className="group rounded-2xl border border-border bg-surface-2 p-5 shadow-card transition hover:shadow-elegant">
            <div className="mb-3 flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <BookMarked className="h-5 w-5" />
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.status === "ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {c.status}
              </span>
            </div>
            <h3 className="font-semibold">{c.nome}</h3>
            {c.descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.descricao}</p>}
            <div className="mt-3 text-xs text-muted-foreground">{c.carga_horaria ?? 0}h</div>
            <div className="mt-4 flex gap-2 opacity-0 transition group-hover:opacity-100">
              <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => confirm("Excluir curso?") && del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {!isLoading && data.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center">
            <BookMarked className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum curso cadastrado.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar curso" : "Novo curso"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editing?.nome ?? ""} onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.descricao ?? ""} onChange={(e) => setEditing((p) => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Carga horária</Label><Input type="number" value={editing?.carga_horaria ?? 0} onChange={(e) => setEditing((p) => ({ ...p, carga_horaria: Number(e.target.value) }))} /></div>
              <div><Label>Status</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={editing?.status ?? "ativo"} onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value as any }))}>
                  <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => editing?.nome && upsert.mutateAsync(editing as any).then(() => setOpen(false))}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
