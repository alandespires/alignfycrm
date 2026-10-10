import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useWeekMap, useClasses } from "@/hooks/use-school";
import { useMemo, useState } from "react";
import { Clock, Users } from "@/components/ui/icons";

export const Route = createFileRoute("/escolar/mapa")({
  head: () => pageHead("Escolar · Mapa"), component: WeekMap });

const FULL_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function WeekMap() {
  const week = useWeekMap();
  const { data: classes = [] } = useClasses();
  const [filterCourse, setFilterCourse] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");

  const courses = useMemo(() => Array.from(new Map(classes.map((c) => [c.course?.id, c.course])).values()).filter(Boolean), [classes]);
  const teachers = useMemo(() => Array.from(new Map(classes.map((c) => [c.teacher?.id, c.teacher])).values()).filter(Boolean), [classes]);
  const today = new Date().getDay();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2 p-3 shadow-card">
        <select className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="">Todos os cursos</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
          <option value="">Todos os professores</option>
          {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {week.map(({ idx, classes: dayClasses }) => {
          const filtered = dayClasses.filter((c: any) =>
            (!filterCourse || c.course?.id === filterCourse) &&
            (!filterTeacher || c.teacher?.id === filterTeacher)
          );
          const isToday = idx === today;
          return (
            <div key={idx} className={`rounded-2xl border bg-surface-2 p-3 shadow-card ${isToday ? "border-primary/50 ring-1 ring-primary/30" : "border-border"}`}>
              <header className="mb-3 flex items-center justify-between">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>{FULL_DAYS[idx]}</h3>
                <span className="text-xs text-muted-foreground">{filtered.length}</span>
              </header>
              <div className="space-y-2">
                {filtered.length === 0 && <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">Sem turmas</p>}
                {filtered.map((c: any) => (
                  <Link
                    key={c.id}
                    to="/escolar/turma/$classId"
                    params={{ classId: c.id }}
                    className="block rounded-xl border border-border bg-surface-1 p-3 transition hover:border-primary/50 hover:shadow-card"
                    style={{ borderLeft: `3px solid ${c.course?.cor ?? "var(--primary)"}` }}
                  >
                    <div className="truncate text-sm font-semibold">{c.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{c.course?.nome}</div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />{c.horario ?? "—"}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />{c.teacher?.nome ?? "—"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
