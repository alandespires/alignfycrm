import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTeachers, useUpsertTeacher, useDeleteTeacher, type Teacher } from "@/hooks/use-school";
import { Plus, Pencil, Trash2, IdCard } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/professores")({
  head: () => pageHead("Escolar · Professores"), component: Page });

function Page() {
  const { data = [] } = useTeachers();
  const upsert = useUpsertTeacher();
  const del = useDeleteTeacher();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Teacher> | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} professor{data.length !== 1 ? "es" : ""}</p>
        <Button onClick={() => { setEditing({ nome: "", ativo: true, disciplinas: [] }); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Novo professor</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] text-sm font-bold text-primary-foreground">
                {t.nome.split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="truncate font-semibold">{t.nome}</h3>
                <p className="truncate text-xs text-muted-foreground">{t.email ?? "—"}</p>
              </div>
            </div>
            {t.disciplinas && t.disciplinas.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {t.disciplinas.map((d) => <span key={d} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{d}</span>)}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => confirm("Excluir professor?") && del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center">
            <IdCard className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum professor cadastrado.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar professor" : "Novo professor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={editing?.nome ?? ""} onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={editing?.email ?? ""} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={editing?.telefone ?? ""} onChange={(e) => setEditing((p) => ({ ...p, telefone: e.target.value }))} /></div>
            </div>
            <div><Label>Disciplinas (separadas por vírgula)</Label>
              <Input value={(editing?.disciplinas ?? []).join(", ")} onChange={(e) => setEditing((p) => ({ ...p, disciplinas: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
            </div>
            <div><Label>Bio</Label><Textarea value={editing?.bio ?? ""} onChange={(e) => setEditing((p) => ({ ...p, bio: e.target.value }))} /></div>
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
