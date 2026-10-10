import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMyStudentProfile, useStudentGrades, useStudentAttendance, useAnnouncements } from "@/hooks/use-school";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { StudentPortalShell } from "@/components/student-portal-shell";
import { GraduationCap, BookOpen, CalendarCheck, Bell, CalendarDays, CheckCircle2, XCircle } from "@/components/ui/icons";

export const Route = createFileRoute("/portal-aluno")({
  head: () => pageHead("Portal Aluno"), component: Portal });

const TABS = [
  { v: "frequencia", label: "Frequência", icon: CalendarCheck },
  { v: "notas", label: "Notas", icon: BookOpen },
  { v: "comunicados", label: "Comunicados", icon: Bell },
  { v: "agenda", label: "Agenda", icon: CalendarDays },
] as const;

function useStudentClasses(studentId: string | null) {
  return useQuery({
    queryKey: ["student-classes", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_enrollments")
        .select("class_id, klass:school_classes(id,nome,horario,sala,course:school_courses(id,nome,cor),teacher:school_teachers(id,nome))")
        .eq("student_id", studentId!);
      if (error) throw error;
      return (data ?? []).map((e: any) => e.klass).filter(Boolean);
    },
  });
}

function Portal() {
  const { data: student, isLoading } = useMyStudentProfile();
  const [tab, setTab] = useState<typeof TABS[number]["v"]>("frequencia");

  return (
    <StudentPortalShell>
      <div className="ks-escolar-theme relative overflow-hidden border border-primary/25 p-4 shadow-elevated md:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !student ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Sua conta ainda não está vinculada a um aluno.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <StudentHeader student={student} />

            <div className="inline-flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface-1 p-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.v;
                return (
                  <Button variant="unstyled" size="unstyled"
                    key={t.v}
                    onClick={() => setTab(t.v)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </Button>
                );
              })}
            </div>

            {tab === "frequencia" && <FrequenciaTab studentId={student.id} />}
            {tab === "notas" && <NotasTab studentId={student.id} />}
            {tab === "comunicados" && <ComunicadosTab studentId={student.id} />}
            {tab === "agenda" && <AgendaTab studentId={student.id} />}
          </div>
        )}
      </div>
    </StudentPortalShell>
  );
}

function StudentHeader({ student }: { student: any }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-surface-1 p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground shadow-glow">
          {student.nome.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{student.nome}</h2>
          <p className="text-xs text-muted-foreground">Matrícula: {student.matricula ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

function FrequenciaTab({ studentId }: { studentId: string }) {
  const { data: attendance = [] } = useStudentAttendance(studentId);
  const { data: classes = [] } = useStudentClasses(studentId);

  // Agrupar por turma
  const porTurma = useMemo(() => {
    const map = new Map<string, { presente: number; falta: number; atrasado: number; justificada: number; total: number }>();
    attendance.forEach((a: any) => {
      const cId = a.lesson?.class_id ?? "sem";
      const cur = map.get(cId) ?? { presente: 0, falta: 0, atrasado: 0, justificada: 0, total: 0 };
      cur.total++;
      cur[a.status as keyof typeof cur]++;
      map.set(cId, cur);
    });
    return map;
  }, [attendance]);

  const total = attendance.length;
  const presentes = attendance.filter((a: any) => a.status === "presente" || a.status === "atrasado").length;
  const freqGeral = total ? Math.round((presentes / total) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Frequência geral" value={freqGeral != null ? `${freqGeral}%` : "—"} accent={freqGeral != null && freqGeral < 75 ? "text-warning" : "text-success"} />
        <Stat label="Aulas registradas" value={total} />
        <Stat label="Faltas" value={attendance.filter((a: any) => a.status === "falta").length} accent="text-destructive" />
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 shadow-card">
        <div className="border-b border-border px-5 py-3"><h3 className="text-sm font-semibold">Por disciplina</h3></div>
        <ul className="divide-y divide-border">
          {classes.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Você ainda não está em nenhuma turma.</li>}
          {classes.map((c: any) => {
            const s = porTurma.get(c.id) ?? { presente: 0, falta: 0, atrasado: 0, justificada: 0, total: 0 };
            const pct = s.total ? Math.round(((s.presente + s.atrasado) / s.total) * 100) : null;
            return (
              <li key={c.id} className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.course?.nome}</div>
                  </div>
                  <div className={`text-xl font-bold ${pct == null ? "text-muted-foreground" : pct < 75 ? "text-warning" : "text-success"}`}>
                    {pct != null ? `${pct}%` : "—"}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className={`h-full transition-all ${pct != null && pct < 75 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct ?? 0}%` }} />
                </div>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>{s.presente} presenças</span>
                  <span>{s.falta} faltas</span>
                  <span>{s.atrasado} atrasos</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NotasTab({ studentId }: { studentId: string }) {
  const { data: grades = [] } = useStudentGrades(studentId);

  const porTurma = useMemo(() => {
    const map = new Map<string, any[]>();
    grades.forEach((g: any) => {
      const cId = g.assessment?.class_id ?? "sem";
      const arr = map.get(cId) ?? [];
      arr.push(g);
      map.set(cId, arr);
    });
    return map;
  }, [grades]);

  const media = useMemo(() => {
    const valid = grades.filter((g: any) => g.nota != null);
    if (!valid.length) return null;
    const sum = valid.reduce((acc: number, g: any) => acc + (Number(g.nota) / Number(g.assessment?.nota_maxima ?? 10)) * 10 * Number(g.assessment?.peso ?? 1), 0);
    const w = valid.reduce((acc: number, g: any) => acc + Number(g.assessment?.peso ?? 1), 0);
    return +(sum / w).toFixed(1);
  }, [grades]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Média geral" value={media != null ? media.toFixed(1) : "—"} accent={media != null && media < 6 ? "text-destructive" : "text-success"} />
        <Stat label="Avaliações" value={grades.length} />
        <Stat label="Status" value={media == null ? "—" : media >= 6 ? "Aprovado" : "Reprovado"} accent={media != null && media < 6 ? "text-destructive" : "text-success"} />
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 shadow-card">
        <ul className="divide-y divide-border">
          {grades.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma nota lançada.</li>}
          {grades.map((g: any) => {
            const norm = g.nota != null ? (Number(g.nota) / Number(g.assessment?.nota_maxima ?? 10)) * 10 : null;
            return (
              <li key={g.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{g.assessment?.titulo}</div>
                  <div className="text-xs text-muted-foreground">{g.assessment?.tipo} · peso {g.assessment?.peso}</div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className={`text-lg font-semibold ${norm != null && norm < 6 ? "text-destructive" : ""}`}>{g.nota ?? "—"}</span>
                    <span className="text-xs text-muted-foreground"> / {g.assessment?.nota_maxima}</span>
                  </div>
                  {norm != null && (norm >= 6 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ComunicadosTab({ studentId }: { studentId: string }) {
  const { data: announcements = [] } = useAnnouncements();
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(`ks-aluno-read-${studentId}`) || "[]")); } catch { return new Set(); }
  });

  function markRead(id: string) {
    const next = new Set(readIds); next.add(id);
    setReadIds(next);
    localStorage.setItem(`ks-aluno-read-${studentId}`, JSON.stringify([...next]));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 shadow-card">
      <ul className="divide-y divide-border">
        {announcements.length === 0 && <li className="px-5 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum comunicado.</p></li>}
        {announcements.map((a: any) => {
          const lido = readIds.has(a.id);
          return (
            <li key={a.id} className={`px-5 py-4 transition ${lido ? "opacity-60" : ""}`} onMouseEnter={() => !lido && markRead(a.id)}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!lido && <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />}
                  <h4 className="font-semibold">{a.titulo}</h4>
                </div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{a.tipo}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.mensagem}</p>
              <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AgendaTab({ studentId }: { studentId: string }) {
  const { data: classes = [] } = useStudentClasses(studentId);

  return (
    <div className="rounded-2xl border border-border bg-surface-2 shadow-card">
      <div className="border-b border-border px-5 py-3"><h3 className="text-sm font-semibold">Suas turmas</h3></div>
      <ul className="divide-y divide-border">
        {classes.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Sem turmas matriculadas.</li>}
        {classes.map((c: any) => (
          <li key={c.id} className="flex items-center gap-4 px-5 py-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{c.nome}</div>
              <div className="truncate text-xs text-muted-foreground">{c.course?.nome} · {c.teacher?.nome ?? "—"}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">{c.horario ?? "—"}</div>
              {c.sala && <div>Sala {c.sala}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, accent = "text-foreground" }: { label: string; value: any; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
