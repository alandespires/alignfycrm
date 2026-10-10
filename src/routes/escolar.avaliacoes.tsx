import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useClasses, useAssessments, useUpsertAssessment, useDeleteAssessment, useEnrollments, useGrades, useSetGrade, type Assessment } from "@/hooks/use-school";
import { Plus, FileText, Trash2 } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/avaliacoes")({
  head: () => pageHead("Escolar · Avaliacoes"), component: Page });

function Page() {
  const { data: classes = [] } = useClasses();
  const [classId, setClassId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const { data: assessments = [] } = useAssessments(classId);
  const upsert = useUpsertAssessment();
  const del = useDeleteAssessment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Assessment>>({ titulo: "", tipo: "prova", peso: 1, nota_maxima: 10 });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
        <Label className="text-xs uppercase text-muted-foreground">Turma</Label>
        <select className="mt-2 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={classId ?? ""} onChange={(e) => { setClassId(e.target.value || null); setAssessmentId(null); }}>
          <option value="">— escolher —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.course?.nome}</option>)}
        </select>
      </div>

      {classId && (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Avaliações</h3>
              <Button size="sm" onClick={() => { setForm({ titulo: "", tipo: "prova", peso: 1, nota_maxima: 10 }); setOpen(true); }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <ul className="space-y-1">
              {assessments.map((a) => (
                <li key={a.id} className={`group flex items-center gap-2 rounded-md border px-3 py-2 ${assessmentId === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <Button variant="unstyled" size="unstyled" onClick={() => setAssessmentId(a.id)} className="flex-1 text-left">
                    <div className="text-sm font-medium">{a.titulo}</div>
                    <div className="text-xs text-muted-foreground">{a.tipo} · peso {a.peso} · máx {a.nota_maxima}</div>
                  </Button>
                  <Button variant="unstyled" size="unstyled" onClick={() => confirm("Excluir?") && del.mutate(a.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                </li>
              ))}
              {assessments.length === 0 && <li className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground"><FileText className="mx-auto mb-2 h-5 w-5" />Nenhuma avaliação</li>}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
            {assessmentId ? <GradesEditor classId={classId} assessmentId={assessmentId} max={assessments.find((a) => a.id === assessmentId)?.nota_maxima ?? 10} /> : <p className="text-sm text-muted-foreground">Selecione uma avaliação.</p>}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}>
                  <option value="prova">Prova</option><option value="trabalho">Trabalho</option><option value="atividade">Atividade</option><option value="participacao">Participação</option><option value="outro">Outro</option>
                </select>
              </div>
              <div><Label>Data</Label><Input type="date" value={form.data ?? ""} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div><Label>Peso</Label><Input type="number" step="0.1" value={form.peso ?? 1} onChange={(e) => setForm({ ...form, peso: Number(e.target.value) })} /></div>
              <div><Label>Nota máxima</Label><Input type="number" value={form.nota_maxima ?? 10} onChange={(e) => setForm({ ...form, nota_maxima: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => form.titulo && classId && upsert.mutateAsync({ ...form, class_id: classId } as any).then(() => setOpen(false))}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GradesEditor({ classId, assessmentId, max }: { classId: string; assessmentId: string; max: number }) {
  const { data: enrollments = [] } = useEnrollments(classId);
  const { data: grades = [] } = useGrades(assessmentId);
  const setGrade = useSetGrade();
  const map = new Map(grades.map((g) => [g.student_id, g.nota]));
  const validas = grades.filter((g) => g.nota != null).map((g) => Number(g.nota));
  const media = validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Notas ({enrollments.length} alunos)</h3>
        <span className="text-xs text-muted-foreground">Média da turma: <span className="font-semibold text-foreground">{media.toFixed(2)}</span></span>
      </div>
      <ul className="divide-y divide-border">
        {enrollments.map((e) => {
          const cur = map.get(e.student_id);
          return (
            <li key={e.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium">{e.student?.nome}</span>
              <div className="flex items-center gap-2">
                <input type="number" step="0.1" min={0} max={max} defaultValue={cur ?? ""} placeholder="—"
                  onBlur={(ev) => {
                    const v = ev.target.value === "" ? null : Number(ev.target.value);
                    setGrade.mutate({ assessment_id: assessmentId, student_id: e.student_id, nota: v });
                  }}
                  className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-right text-sm" />
                <span className="text-xs text-muted-foreground">/ {max}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
