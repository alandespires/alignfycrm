import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSchoolDashboard, useTodayClasses, useTeacherAlerts } from "@/hooks/use-school";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId } from "@/contexts/tenant-context";
import { Users, GraduationCap, BookCheck, AlertTriangle, ArrowRight, Clock, FileWarning, CalendarDays, TrendingUp, Activity, Megaphone } from "@/components/ui/icons";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/escolar/")({
  head: () => pageHead("Escolar · Index"), component: SchoolDashboard });

// Frequência semanal agregada (últimos 14 dias)
function useWeeklyAttendance() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["school-weekly-att", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 13);
      const sinceIso = since.toISOString();
      const { data } = await supabase.from("school_attendance")
        .select("status,created_at")
        .eq("tenant_id", tenantId!)
        .gte("created_at", sinceIso);
      const byDay = new Map<string, { presentes: number; faltas: number }>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().slice(0, 10);
        byDay.set(key, { presentes: 0, faltas: 0 });
      }
      (data ?? []).forEach((r: any) => {
        const k = r.created_at.slice(0, 10);
        const cur = byDay.get(k); if (!cur) return;
        if (r.status === "presente" || r.status === "atrasado") cur.presentes++;
        else if (r.status === "falta") cur.faltas++;
      });
      return [...byDay.entries()].map(([d, v]) => ({
        dia: new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ...v,
        taxa: v.presentes + v.faltas ? Math.round((v.presentes / (v.presentes + v.faltas)) * 100) : 0,
      }));
    },
  });
}

function useRecentActivity() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["school-recent-activity", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [lessons, ann, grades] = await Promise.all([
        supabase.from("school_lessons").select("id,titulo,data,created_at,class:school_classes(nome)").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(5),
        supabase.from("school_announcements").select("id,titulo,created_at").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(3),
        supabase.from("school_grades").select("id,nota,created_at,assessment:school_assessments(titulo)").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(3),
      ]);
      const items: { kind: string; title: string; sub: string; ts: string; icon: any }[] = [];
      (lessons.data ?? []).forEach((l: any) => items.push({ kind: "aula", title: l.titulo, sub: l.class?.nome ?? "", ts: l.created_at, icon: BookCheck }));
      (ann.data ?? []).forEach((a: any) => items.push({ kind: "comunicado", title: a.titulo, sub: "Comunicado enviado", ts: a.created_at, icon: Megaphone }));
      (grades.data ?? []).forEach((g: any) => items.push({ kind: "nota", title: `Nota ${g.nota ?? "—"}`, sub: g.assessment?.titulo ?? "Avaliação", ts: g.created_at, icon: TrendingUp }));
      return items.sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 8);
    },
  });
}

function SchoolDashboard() {
  const { data } = useSchoolDashboard();
  const today = useTodayClasses();
  const { data: alerts } = useTeacherAlerts();
  const { data: weekly = [] } = useWeeklyAttendance();
  const { data: recent = [] } = useRecentActivity();

  const taxaMedia = weekly.length ? Math.round(weekly.reduce((a, b) => a + b.taxa, 0) / weekly.length) : 0;
  const pendencias = (alerts?.avaliacoesPendentes?.length ?? 0) + (alerts?.alunosRisco?.length ?? 0);

  const kpis = [
    { label: "Turmas hoje", value: today.length, icon: CalendarDays, accent: "text-primary" },
    { label: "Total de alunos", value: data?.alunos ?? 0, icon: GraduationCap, accent: "text-accent" },
    { label: "Frequência média (14d)", value: `${taxaMedia}%`, icon: TrendingUp, accent: taxaMedia < 75 ? "text-warning" : "text-success" },
    { label: "Pendências", value: pendencias, icon: AlertTriangle, accent: pendencias > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="ks-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.accent}`} />
              </div>
              <div className="text-4xl font-bold tracking-tight">{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Gráfico + Turmas hoje */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="ks-card lg:col-span-2 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Frequência — últimos 14 dias</h2>
              <p className="text-xs text-muted-foreground">% de presença diária consolidada de todas as turmas.</p>
            </div>
            <span className="ks-pill"><TrendingUp className="h-3 w-3" /> {taxaMedia}% média</span>
          </header>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="freq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--border)" />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--border)" tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [`${v}%`, "Presença"]}
                />
                <Area type="monotone" dataKey="taxa" stroke="var(--primary)" strokeWidth={2} fill="url(#freq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ks-card p-5">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Turmas de hoje</h2>
            <Link to="/escolar/mapa" className="text-xs font-semibold text-primary hover:underline">Semana →</Link>
          </header>
          <div className="space-y-2">
            {today.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <CalendarDays className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">Sem turmas agendadas para hoje.</p>
              </div>
            )}
            {today.map((c: any) => (
              <Link key={c.id} to="/escolar/turma/$classId" params={{ classId: c.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-3 transition hover:border-primary/40 hover:bg-surface-2">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                  {c.nome.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.nome}</div>
                  <div className="truncate text-[11px] text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{c.horario ?? "—"}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Alertas + Atividade recente */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="ks-card p-5 lg:col-span-2">
          <header className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Atividades recentes</h2>
          </header>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem atividades recentes.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r, i) => {
                const Icon = r.icon;
                return (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{r.sub}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(r.ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="ks-card border-warning/30 bg-warning/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Alunos em risco</h3>
            </div>
            {alerts?.alunosRisco?.length ? (
              <ul className="space-y-2">
                {alerts.alunosRisco.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2 text-sm">
                    <span className="truncate font-medium">{a.nome}</span>
                    <span className="text-xs text-warning">{a.faltas}/{a.total}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nada crítico ✨</p>}
          </section>

          <section className="ks-card border-destructive/30 bg-destructive/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Notas pendentes</h3>
            </div>
            {alerts?.avaliacoesPendentes?.length ? (
              <ul className="space-y-2">
                {alerts.avaliacoesPendentes.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2 text-sm">
                    <span className="truncate font-medium">{a.titulo}</span>
                    <span className="text-xs text-destructive">{a.faltam}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Tudo em dia 🎯</p>}
          </section>
        </div>
      </div>

      {/* Atalhos */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link to="/escolar/mapa" className="ks-card p-5">
          <CalendarDays className="mb-2 h-5 w-5 text-primary" />
          <div className="text-sm font-semibold">Mapa de turmas</div>
          <div className="text-xs text-muted-foreground">Visão semanal</div>
        </Link>
        <Link to="/escolar/alunos" className="ks-card p-5">
          <Users className="mb-2 h-5 w-5 text-primary" />
          <div className="text-sm font-semibold">Gestão pedagógica</div>
          <div className="text-xs text-muted-foreground">Alunos · Cursos · Turmas</div>
        </Link>
        <Link to="/escolar/comunicacao" className="ks-card p-5">
          <Megaphone className="mb-2 h-5 w-5 text-primary" />
          <div className="text-sm font-semibold">Comunicação</div>
          <div className="text-xs text-muted-foreground">Avisos para turmas e alunos</div>
        </Link>
      </div>
    </div>
  );
}
