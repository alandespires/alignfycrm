import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

// ============== TYPES ==============
export type Course = { id: string; tenant_id: string; nome: string; descricao: string | null; carga_horaria: number | null; status: "ativo" | "inativo" | "arquivado"; cor: string | null; created_at: string };
export type Teacher = { id: string; tenant_id: string; user_id: string | null; nome: string; email: string | null; telefone: string | null; disciplinas: string[] | null; bio: string | null; ativo: boolean; created_at: string };
export type Klass = { id: string; tenant_id: string; course_id: string; teacher_id: string | null; nome: string; periodo: string | null; ano: number | null; sala: string | null; horario: string | null; status: "ativo" | "inativo" | "arquivado"; created_at: string; course?: Course; teacher?: Teacher };
export type Student = { id: string; tenant_id: string; user_id: string | null; matricula: string | null; nome: string; cpf: string | null; data_nascimento: string | null; email: string | null; telefone: string | null; responsavel_nome: string | null; responsavel_email: string | null; responsavel_telefone: string | null; status: string; observacoes: string | null; created_at: string };
export type Enrollment = { id: string; class_id: string; student_id: string; status: string; inicio: string; student?: Student; klass?: Klass };
export type Lesson = { id: string; tenant_id: string; class_id: string; teacher_id: string | null; data: string; titulo: string; conteudo: string | null; observacoes: string | null; created_at: string };
export type AttendanceRow = { id: string; lesson_id: string; student_id: string; status: "presente" | "falta" | "justificada" | "atrasado"; observacao: string | null };
export type Assessment = { id: string; tenant_id: string; class_id: string; titulo: string; tipo: "prova" | "trabalho" | "atividade" | "participacao" | "outro"; data: string | null; peso: number; nota_maxima: number; descricao: string | null; created_at: string };
export type Grade = { id: string; assessment_id: string; student_id: string; nota: number | null; comentario: string | null };
export type Announcement = { id: string; tenant_id: string; class_id: string | null; student_id: string | null; titulo: string; mensagem: string; tipo: string; created_at: string };

const tid = () => getActiveTenantId();

// ============== COURSES ==============
export function useCourses() {
  return useQuery({
    queryKey: ["school-courses", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const { data, error } = await supabase.from("school_courses").select("*").eq("tenant_id", requireTenantId()).order("nome");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

export function useUpsertCourse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Course> & { nome: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("school_courses").update(rest).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_courses").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-courses"] }); toast.success("Curso salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-courses"] }); toast.success("Curso removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== TEACHERS ==============
export function useTeachers() {
  return useQuery({
    queryKey: ["school-teachers", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const { data, error } = await supabase.from("school_teachers").select("*").eq("tenant_id", requireTenantId()).order("nome");
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });
}

export function useUpsertTeacher() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Teacher> & { nome: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("school_teachers").update(rest).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_teachers").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-teachers"] }); toast.success("Professor salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-teachers"] }); toast.success("Professor removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== CLASSES ==============
export function useClasses() {
  return useQuery({
    queryKey: ["school-classes", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const { data, error } = await supabase.from("school_classes")
        .select("*, course:school_courses(id,nome,cor), teacher:school_teachers(id,nome)")
        .eq("tenant_id", requireTenantId())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Klass[];
    },
  });
}

export function useUpsertClass() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Klass> & { nome: string; course_id: string; id?: string }) => {
      if (input.id) {
        const { id, course, teacher, ...rest } = input as any;
        const { error } = await supabase.from("school_classes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { course, teacher, ...rest } = input as any;
        const { error } = await supabase.from("school_classes").insert({ ...rest, tenant_id: requireTenantId(), created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-classes"] }); toast.success("Turma salva"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-classes"] }); toast.success("Turma removida"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== STUDENTS ==============
export function useStudents(search?: string) {
  return useQuery({
    queryKey: ["school-students", tid(), search ?? ""],
    enabled: !!tid(),
    queryFn: async () => {
      let q = supabase.from("school_students").select("*").eq("tenant_id", requireTenantId()).order("nome");
      if (search?.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`nome.ilike.${s},matricula.ilike.${s},email.ilike.${s},cpf.ilike.${s}`);
      }
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}

export function useUpsertStudent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Student> & { nome: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("school_students").update(rest).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_students").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-students"] }); toast.success("Aluno salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-students"] }); toast.success("Aluno removido"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== ENROLLMENTS ==============
export function useEnrollments(classId: string | null) {
  return useQuery({
    queryKey: ["school-enrollments", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_enrollments")
        .select("*, student:school_students(id,nome,matricula,email)")
        .eq("class_id", classId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Enrollment[];
    },
  });
}

export function useEnrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ class_id, student_id }: { class_id: string; student_id: string }) => {
      const { error } = await supabase.from("school_enrollments").insert({ class_id, student_id, tenant_id: requireTenantId() } as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["school-enrollments", v.class_id] }); toast.success("Aluno matriculado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUnenrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-enrollments"] }); toast.success("Matrícula removida"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== LESSONS ==============
export function useLessons(classId: string | null) {
  return useQuery({
    queryKey: ["school-lessons", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_lessons").select("*").eq("class_id", classId!).order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });
}

export function useUpsertLesson() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Lesson> & { class_id: string; titulo: string; data: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("school_lessons").update(rest).eq("id", id!);
        if (error) throw error;
        return id!;
      } else {
        const { data, error } = await supabase.from("school_lessons").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any).select().single();
        if (error) throw error;
        return data!.id as string;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-lessons"] }); toast.success("Aula salva"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== ATTENDANCE ==============
export function useAttendance(lessonId: string | null) {
  return useQuery({
    queryKey: ["school-attendance", lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_attendance").select("*").eq("lesson_id", lessonId!);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}

export function useSetAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lesson_id, student_id, status }: { lesson_id: string; student_id: string; status: AttendanceRow["status"] }) => {
      const { error } = await supabase.from("school_attendance").upsert({
        lesson_id, student_id, status, tenant_id: requireTenantId(), created_by: user!.id,
      } as any, { onConflict: "lesson_id,student_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["school-attendance", v.lesson_id] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useStudentAttendance(studentId: string | null) {
  return useQuery({
    queryKey: ["school-student-attendance", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_attendance")
        .select("*, lesson:school_lessons(id,data,titulo,class_id)")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ============== ASSESSMENTS / GRADES ==============
export function useAssessments(classId: string | null) {
  return useQuery({
    queryKey: ["school-assessments", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_assessments").select("*").eq("class_id", classId!).order("data", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });
}

export function useUpsertAssessment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Assessment> & { class_id: string; titulo: string; id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("school_assessments").update(rest).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_assessments").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-assessments"] }); toast.success("Avaliação salva"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-assessments"] }); toast.success("Avaliação removida"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGrades(assessmentId: string | null) {
  return useQuery({
    queryKey: ["school-grades", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_grades").select("*").eq("assessment_id", assessmentId!);
      if (error) throw error;
      return (data ?? []) as Grade[];
    },
  });
}

export function useSetGrade() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ assessment_id, student_id, nota, comentario }: { assessment_id: string; student_id: string; nota: number | null; comentario?: string | null }) => {
      const { error } = await supabase.from("school_grades").upsert({
        assessment_id, student_id, nota, comentario, tenant_id: requireTenantId(), created_by: user!.id,
      } as any, { onConflict: "assessment_id,student_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["school-grades", v.assessment_id] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useStudentGrades(studentId: string | null) {
  return useQuery({
    queryKey: ["school-student-grades", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_grades")
        .select("*, assessment:school_assessments(id,titulo,tipo,nota_maxima,peso,data,class_id)")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ============== ANNOUNCEMENTS ==============
export function useAnnouncements() {
  return useQuery({
    queryKey: ["school-announcements", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const { data, error } = await supabase.from("school_announcements")
        .select("*, klass:school_classes(id,nome), student:school_students(id,nome)")
        .eq("tenant_id", requireTenantId())
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { titulo: string; mensagem: string; tipo?: string; class_id?: string | null; student_id?: string | null }) => {
      const { error } = await supabase.from("school_announcements").insert({ ...input, tenant_id: requireTenantId(), created_by: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-announcements"] }); toast.success("Comunicado enviado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== DASHBOARD ==============
export function useSchoolDashboard() {
  return useQuery({
    queryKey: ["school-dashboard", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const tenantId = requireTenantId();
      const [courses, classes, students, teachers, lessons, ann] = await Promise.all([
        supabase.from("school_courses").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "ativo"),
        supabase.from("school_classes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "ativo"),
        supabase.from("school_students").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "ativo"),
        supabase.from("school_teachers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("ativo", true),
        supabase.from("school_lessons").select("id,titulo,data,class_id").eq("tenant_id", tenantId).order("data", { ascending: false }).limit(5),
        supabase.from("school_announcements").select("id,titulo,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        cursos: courses.count ?? 0,
        turmas: classes.count ?? 0,
        alunos: students.count ?? 0,
        professores: teachers.count ?? 0,
        ultimasAulas: lessons.data ?? [],
        ultimosComunicados: ann.data ?? [],
      };
    },
  });
}

// ============== TEACHER DAY / ALERTS ==============
const DAY_MAP: Record<number, string> = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
const DAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function classMatchesDay(horario: string | null | undefined, dayIdx: number) {
  if (!horario) return false;
  const h = horario.toLowerCase();
  const target = DAY_MAP[dayIdx];
  // matches "seg", "segunda", "seg/qua", "seg, qua 19h" etc
  return h.includes(target);
}

export function useTodayClasses() {
  const { data: classes = [] } = useClasses();
  const today = new Date().getDay();
  return classes.filter((c) => classMatchesDay(c.horario, today));
}

export function useWeekMap() {
  const { data: classes = [] } = useClasses();
  return DAY_LABELS.map((label, idx) => ({
    label,
    idx,
    classes: classes.filter((c) => classMatchesDay(c.horario, idx)),
  }));
}

export function useTeacherAlerts() {
  return useQuery({
    queryKey: ["school-alerts", tid()],
    enabled: !!tid(),
    queryFn: async () => {
      const tenantId = requireTenantId();
      // Lê configurações de alertas (localStorage)
      let cfg = { faltaPctLimite: 25, minAulasParaRisco: 3, diasParaNotaPendente: 0 };
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("ks-escolar-settings") : null;
        if (raw) cfg = { ...cfg, ...JSON.parse(raw) };
      } catch { /* mantém os limites padrão */ }
      const limite = cfg.faltaPctLimite / 100;
      // Faltas por aluno (últimas 500)
      const { data: att } = await supabase.from("school_attendance")
        .select("student_id,status,lesson:school_lessons(class_id)")
        .eq("tenant_id", tenantId).limit(500);
      const counts = new Map<string, { faltas: number; total: number }>();
      (att ?? []).forEach((r: any) => {
        const cur = counts.get(r.student_id) ?? { faltas: 0, total: 0 };
        cur.total++;
        if (r.status === "falta") cur.faltas++;
        counts.set(r.student_id, cur);
      });
      const riskIds = [...counts.entries()].filter(([, v]) => v.total >= cfg.minAulasParaRisco && v.faltas / v.total >= limite).map(([id]) => id);
      let alunosRisco: any[] = [];
      if (riskIds.length) {
        const { data } = await supabase.from("school_students").select("id,nome").in("id", riskIds.slice(0, 10));
        alunosRisco = (data ?? []).map((s: any) => ({ ...s, ...counts.get(s.id) }));
      }
      // Notas pendentes: avaliações com data passada (+ N dias de tolerância) e sem todas as notas
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - cfg.diasParaNotaPendente);
      const { data: assess } = await supabase.from("school_assessments")
        .select("id,titulo,class_id,data").eq("tenant_id", tenantId).lt("data", cutoff.toISOString().slice(0,10)).limit(20);
      const pendentes: any[] = [];
      for (const a of assess ?? []) {
        const [{ count: enrollC }, { count: gradeC }] = await Promise.all([
          supabase.from("school_enrollments").select("id", { count: "exact", head: true }).eq("class_id", (a as any).class_id),
          supabase.from("school_grades").select("id", { count: "exact", head: true }).eq("assessment_id", (a as any).id),
        ]);
        if ((enrollC ?? 0) > (gradeC ?? 0)) pendentes.push({ ...a, faltam: (enrollC ?? 0) - (gradeC ?? 0) });
      }
      return { alunosRisco, avaliacoesPendentes: pendentes.slice(0, 8) };
    },
  });
}

export function useClassStats(classId: string | null) {
  return useQuery({
    queryKey: ["school-class-stats", classId],
    enabled: !!classId,
    queryFn: async () => {
      const [{ count: enrollC }, attRes, gradesRes] = await Promise.all([
        supabase.from("school_enrollments").select("id", { count: "exact", head: true }).eq("class_id", classId!),
        supabase.from("school_attendance").select("status,lesson:school_lessons!inner(class_id)").eq("lesson.class_id", classId!),
        supabase.from("school_grades").select("nota,assessment:school_assessments!inner(class_id,nota_maxima)").eq("assessment.class_id", classId!),
      ]);
      const att = (attRes.data ?? []) as any[];
      const presentes = att.filter((a) => a.status === "presente" || a.status === "atrasado").length;
      const presencaPct = att.length ? Math.round((presentes / att.length) * 100) : null;
      const grades = (gradesRes.data ?? []) as any[];
      const notasNorm = grades.filter((g) => g.nota != null).map((g) => Number(g.nota) / Number(g.assessment?.nota_maxima ?? 10) * 10);
      const media = notasNorm.length ? +(notasNorm.reduce((a, b) => a + b, 0) / notasNorm.length).toFixed(1) : null;
      return { alunos: enrollC ?? 0, presencaPct, media };
    },
  });
}

// ============== STUDENT PORTAL ==============
export function useMyStudentProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-student", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("school_students").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Student | null;
    },
  });
}
