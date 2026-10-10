import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useClasses, useEnrollments, useStudentAttendance } from "@/hooks/use-school";
import { CalendarCheck } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/frequencia")({
  head: () => pageHead("Escolar · Frequencia"), component: Page });

function Page() {
  const { data: classes = [] } = useClasses();
  const [classId, setClassId] = useState<string | null>(null);
  const { data: enrollments = [] } = useEnrollments(classId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card">
        <Label className="text-xs uppercase text-muted-foreground">Turma</Label>
        <select className="mt-2 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={classId ?? ""} onChange={(e) => setClassId(e.target.value || null)}>
          <option value="">— escolher —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.nome} · {c.course?.nome}</option>)}
        </select>
      </div>

      {classId && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Aluno</th><th className="px-4 py-3">Presenças</th><th className="px-4 py-3">Faltas</th><th className="px-4 py-3">Atrasos</th><th className="px-4 py-3">Justificadas</th><th className="px-4 py-3">Frequência</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map((e) => <FrequencyRow key={e.id} studentId={e.student_id} nome={e.student?.nome ?? ""} />)}
              {enrollments.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center"><CalendarCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Sem alunos matriculados.</p></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FrequencyRow({ studentId, nome }: { studentId: string; nome: string }) {
  const { data = [] } = useStudentAttendance(studentId);
  const stats = useMemo(() => {
    const c = { presente: 0, falta: 0, atrasado: 0, justificada: 0 };
    data.forEach((a: any) => { c[a.status as keyof typeof c]++; });
    const total = data.length || 1;
    const freq = ((c.presente + c.atrasado * 0.5 + c.justificada) / total) * 100;
    return { ...c, freq };
  }, [data]);
  return (
    <tr className="hover:bg-surface-3/40">
      <td className="px-4 py-3 font-medium">{nome}</td>
      <td className="px-4 py-3 text-center text-success">{stats.presente}</td>
      <td className="px-4 py-3 text-center text-destructive">{stats.falta}</td>
      <td className="px-4 py-3 text-center text-warning">{stats.atrasado}</td>
      <td className="px-4 py-3 text-center text-muted-foreground">{stats.justificada}</td>
      <td className="px-4 py-3 text-center font-semibold">{data.length ? stats.freq.toFixed(0) + "%" : "—"}</td>
    </tr>
  );
}
