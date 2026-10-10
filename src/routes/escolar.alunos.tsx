import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStudents, useUpsertStudent, useDeleteStudent, type Student } from "@/hooks/use-school";
import { Plus, Pencil, Trash2, Search, GraduationCap } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/alunos")({
  head: () => pageHead("Escolar · Alunos"), component: Page });

function Page() {
  const [search, setSearch] = useState("");
  const { data = [] } = useStudents(search);
  const upsert = useUpsertStudent();
  const del = useDeleteStudent();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Student> | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar aluno (nome, matrícula, email, CPF)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditing({ nome: "", status: "ativo" }); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Novo aluno</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-surface-3 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Matrícula</th>
              <th className="px-4 py-3 text-left">Contato</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((s) => (
              <tr key={s.id} className="hover:bg-surface-3/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{s.nome.slice(0,2).toUpperCase()}</div>
                    <span className="font-medium">{s.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.matricula ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email ?? s.telefone ?? "—"}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">{s.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Excluir aluno?") && del.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center"><GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum aluno encontrado.</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar aluno" : "Novo aluno"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome completo *</Label><Input value={editing?.nome ?? ""} onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Matrícula</Label><Input value={editing?.matricula ?? ""} onChange={(e) => setEditing((p) => ({ ...p, matricula: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={editing?.cpf ?? ""} onChange={(e) => setEditing((p) => ({ ...p, cpf: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={editing?.email ?? ""} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={editing?.telefone ?? ""} onChange={(e) => setEditing((p) => ({ ...p, telefone: e.target.value }))} /></div>
            <div><Label>Data de nascimento</Label><Input type="date" value={editing?.data_nascimento ?? ""} onChange={(e) => setEditing((p) => ({ ...p, data_nascimento: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={editing?.status ?? "ativo"} onChange={(e) => setEditing((p) => ({ ...p, status: e.target.value }))}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="trancado">Trancado</option>
              </select>
            </div>
            <div className="col-span-2"><Label>Responsável (nome)</Label><Input value={editing?.responsavel_nome ?? ""} onChange={(e) => setEditing((p) => ({ ...p, responsavel_nome: e.target.value }))} /></div>
            <div><Label>Email do responsável</Label><Input value={editing?.responsavel_email ?? ""} onChange={(e) => setEditing((p) => ({ ...p, responsavel_email: e.target.value }))} /></div>
            <div><Label>Telefone do responsável</Label><Input value={editing?.responsavel_telefone ?? ""} onChange={(e) => setEditing((p) => ({ ...p, responsavel_telefone: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={editing?.observacoes ?? ""} onChange={(e) => setEditing((p) => ({ ...p, observacoes: e.target.value }))} /></div>
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
