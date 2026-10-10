import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useClasses, useLessons, useUpsertLesson, useEnrollments, useAttendance, useSetAttendance } from "@/hooks/use-school";
import { Plus, ClipboardList, Check, X, Clock, FileWarning } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/diario")({
  head: () => pageHead("Escolar · Diario"), component: Page });

function Page() {
  const { data: classes = [] } = useClasses();
  const [classId, setClassId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const { data: lessons = [] } = useLessons(classId);
  const upsertLesson = useUpsertLesson();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ titulo: "", data: new Date().toISOString().slice(0,10), conteudo: "" });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
        <Label className="text-xs uppercase text-muted-foreground">Selecione a turma</Label>
        <select className="mt-2 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={classId ?? ""} onChange={(e) => { setClassId(e.target.value || null); setLessonId(null); }}>
          <option value="">— escolher —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.course?.nome}</option>)}
        </select>
      </div>

      {classId && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Aulas</h3>
              <Button size="sm" onClick={() => { setForm({ titulo: "", data: new Date().toISOString().slice(0,10), conteudo: "" }); setOpen(true); }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <ul className="space-y-1">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Button variant="unstyled" size="unstyled" onClick={() => setLessonId(l.id)} className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${lessonId === l.id ? "border-primary bg-primary/5" : "border-border hover:bg-surface-3"}`}>
                    <div className="font-medium">{l.titulo}</div>
                    <div className="text-xs text-muted-foreground">{new Date(l.data).toLocaleDateString("pt-BR")}</div>
                  </Button>
                </li>
              ))}
              {lessons.length === 0 && <li className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground"><ClipboardList className="mx-auto mb-2 h-5 w-5" />Sem aulas</li>}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
            {lessonId ? <AttendanceBoard classId={classId} lessonId={lessonId} /> : <p className="text-sm text-muted-foreground">Selecione ou crie uma aula.</p>}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova aula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Conteúdo / Plano de aula</Label><Textarea rows={4} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!form.titulo || !classId) return;
              const id = await upsertLesson.mutateAsync({ ...form, class_id: classId });
              setLessonId(id); setOpen(false);
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendanceBoard({ classId, lessonId }: { classId: string; lessonId: string }) {
  const { data: enrollments = [] } = useEnrollments(classId);
  const { data: attendance = [] } = useAttendance(lessonId);
  const set = useSetAttendance();
  const map = new Map(attendance.map((a) => [a.student_id, a.status]));

  const STATUSES: { v: any; label: string; icon: any; cls: string }[] = [
    { v: "presente", label: "P", icon: Check, cls: "bg-success/15 text-success border-success/30" },
    { v: "falta", label: "F", icon: X, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    { v: "atrasado", label: "A", icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" },
    { v: "justificada", label: "J", icon: FileWarning, cls: "bg-muted text-muted-foreground border-border" },
  ];

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Lista de presença ({enrollments.length} alunos)</h3>
      <ul className="divide-y divide-border">
        {enrollments.map((e) => {
          const cur = map.get(e.student_id);
          return (
            <li key={e.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium">{e.student?.nome}</span>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <Button variant="unstyled" size="unstyled" key={s.v} onClick={() => set.mutate({ lesson_id: lessonId, student_id: e.student_id, status: s.v })}
                    className={`grid h-8 w-8 place-items-center rounded-md border text-xs font-bold transition ${cur === s.v ? s.cls : "border-border text-muted-foreground hover:bg-surface-3"}`}
                    title={s.v}>{s.label}</Button>
                ))}
              </div>
            </li>
          );
        })}
        {enrollments.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Sem alunos matriculados.</li>}
      </ul>
    </div>
  );
}
