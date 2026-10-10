import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useClasses, useCourses, useTeachers, useUpsertClass, useDeleteClass, useEnrollments, useStudents, useEnrollStudent, useUnenrollStudent, type Klass } from "@/hooks/use-school";
import { Plus, Pencil, Trash2, Users, UserPlus, X, Clock, MapPin, ArrowRight, GraduationCap } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/turmas")({
  head: () => pageHead("Escolar · Turmas"), component: Page });

const DAYS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

// Codifica como "seg/qua 19:00-21:00"
function buildHorario(days: string[], hi: string, hf: string) {
  const d = days.length ? days.join("/") : "";
  const h = hi && hf ? ` ${hi}-${hf}` : hi ? ` ${hi}` : "";
  return (d + h).trim();
}
function parseHorario(s: string | null | undefined) {
  if (!s) return { days: [] as string[], hi: "", hf: "" };
  const lower = s.toLowerCase();
  const days = DAYS.map((d) => d.key).filter((k) => lower.includes(k));
  const time = lower.match(/(\d{1,2}[:h]\d{0,2})\s*-\s*(\d{1,2}[:h]\d{0,2})/);
  const norm = (t: string) => t.replace("h", ":").padEnd(5, "0").slice(0, 5);
  return { days, hi: time ? norm(time[1]) : "", hf: time ? norm(time[2]) : "" };
}

function Page() {
  const { data: classes = [] } = useClasses();
  const { data: courses = [] } = useCourses();
  const { data: teachers = [] } = useTeachers();
  const upsert = useUpsertClass();
  const del = useDeleteClass();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Klass> | null>(null);
  const [enrollClassId, setEnrollClassId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  function openNew() {
    setEditing({ nome: "", course_id: courses[0]?.id, status: "ativo", horario: "" });
    setOpen(true);
  }

  const filtered = useMemo(
    () => classes.filter((c) => !filter || c.nome.toLowerCase().includes(filter.toLowerCase()) || c.course?.nome?.toLowerCase().includes(filter.toLowerCase())),
    [classes, filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Turmas</h2>
          <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{classes.length}</span>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Buscar turma ou curso..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-56" />
          <Button onClick={openNew} disabled={courses.length === 0}><Plus className="mr-1.5 h-4 w-4" />Nova turma</Button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-sm text-muted-foreground">
          Crie um <Link to="/escolar/cursos" className="font-semibold text-primary">curso</Link> antes de adicionar turmas.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const parsed = parseHorario(c.horario);
          const cor = c.course?.cor || "oklch(0.72 0.2 50)";
          return (
            <div key={c.id} className="group relative overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card transition hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: cor }} />
              <Link to="/escolar/turma/$classId" params={{ classId: c.id }} className="block p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">{c.course?.nome ?? "—"}</div>
                    <h3 className="mt-1 truncate text-lg font-semibold">{c.nome}</h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.status === "ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {c.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span className="truncate">{c.teacher?.nome ?? "Sem professor"}</span>
                  </div>
                  {parsed.days.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {DAYS.map((d) => {
                        const active = parsed.days.includes(d.key);
                        return (
                          <span key={d.key} className={`grid h-6 w-8 place-items-center rounded text-[10px] font-bold ${active ? "bg-primary text-primary-foreground" : "bg-surface-3 text-muted-foreground/50"}`}>
                            {d.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {parsed.hi && parsed.hf && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{parsed.hi}–{parsed.hf}</span>
                    )}
                    {c.sala && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.sala}</span>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] font-semibold text-muted-foreground">Abrir console</span>
                  <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
                </div>
              </Link>
              <div className="flex gap-1 border-t border-border bg-surface-1/50 px-3 py-2">
                <Button size="sm" variant="ghost" onClick={() => setEnrollClassId(c.id)}><Users className="mr-1 h-3.5 w-3.5" />Alunos</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => confirm("Excluir turma?") && del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && courses.length > 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface-2 p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma turma encontrada.</p>
          </div>
        )}
      </div>

      <ClassFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        setEditing={setEditing}
        courses={courses}
        teachers={teachers}
        onSave={(payload: any) => upsert.mutateAsync(payload).then(() => setOpen(false))}
      />

      <EnrollDialog classId={enrollClassId} onClose={() => setEnrollClassId(null)} />
    </div>
  );
}

function ClassFormDialog({ open, onOpenChange, editing, setEditing, courses, teachers, onSave }: any) {
  const parsed = useMemo(() => parseHorario(editing?.horario), [editing?.horario]);
  const [days, setDays] = useState<string[]>(parsed.days);
  const [hi, setHi] = useState(parsed.hi || "19:00");
  const [hf, setHf] = useState(parsed.hf || "21:00");

  // Re-sync when opening with different editing target
  useMemo(() => {
    setDays(parsed.days);
    setHi(parsed.hi || "19:00");
    setHf(parsed.hf || "21:00");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  function toggleDay(k: string) {
    setDays((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing?.id ? "Editar turma" : "Nova turma"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da turma</Label>
            <Input value={editing?.nome ?? ""} onChange={(e) => setEditing((p: any) => ({ ...p, nome: e.target.value }))} placeholder="Turma A — 2026.1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Curso</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={editing?.course_id ?? ""} onChange={(e) => setEditing((p: any) => ({ ...p, course_id: e.target.value }))}>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <Label>Professor</Label>
              <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={editing?.teacher_id ?? ""} onChange={(e) => setEditing((p: any) => ({ ...p, teacher_id: e.target.value || null }))}>
                <option value="">— sem —</option>
                {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <Label>Período</Label>
              <Input value={editing?.periodo ?? ""} onChange={(e) => setEditing((p: any) => ({ ...p, periodo: e.target.value }))} placeholder="2026.1" />
            </div>
            <div>
              <Label>Sala</Label>
              <Input value={editing?.sala ?? ""} onChange={(e) => setEditing((p: any) => ({ ...p, sala: e.target.value }))} placeholder="Sala 12" />
            </div>
          </div>

          <div>
            <Label>Dias da semana</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const active = days.includes(d.key);
                return (
                  <Button variant="unstyled" size="unstyled"
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`h-9 min-w-[44px] rounded-lg border px-2 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground shadow-glow" : "border-border bg-surface-1 text-muted-foreground hover:border-primary/50"}`}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="time" value={hi} onChange={(e) => setHi(e.target.value)} />
            </div>
            <div>
              <Label>Término</Label>
              <Input type="time" value={hf} onChange={(e) => setHf(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!editing?.nome || !editing?.course_id) return;
            const horario = buildHorario(days, hi, hf);
            onSave({ ...editing, horario });
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollDialog({ classId, onClose }: { classId: string | null; onClose: () => void }) {
  const { data: enrollments = [] } = useEnrollments(classId);
  const { data: students = [] } = useStudents();
  const enroll = useEnrollStudent();
  const unenroll = useUnenrollStudent();
  const [search, setSearch] = useState("");
  const enrolledIds = new Set(enrollments.map((e) => e.student_id));
  const filtered = students.filter((s) => !enrolledIds.has(s.id) && s.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={!!classId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Alunos da turma</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Matriculados ({enrollments.length})</h4>
            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{e.student?.nome}</span>
                  <Button variant="unstyled" size="unstyled" onClick={() => unenroll.mutate(e.id)}><X className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                </li>
              ))}
              {enrollments.length === 0 && <li className="text-xs text-muted-foreground">Nenhum aluno.</li>}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Adicionar</h4>
            <Input placeholder="Buscar aluno" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {filtered.slice(0, 30).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{s.nome}</span>
                  <Button variant="unstyled" size="unstyled" onClick={() => enroll.mutate({ class_id: classId!, student_id: s.id })}><UserPlus className="h-3.5 w-3.5 text-primary" /></Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
