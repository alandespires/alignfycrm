import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Loader2, CalendarDays, User, CheckCircle2, XCircle } from "@/components/ui/icons";
import { useAppointments, useUpsertAppointment, useUpdateAppointmentStatus, useProfessionals, usePatients } from "@/hooks/use-clinic";
import { PrimaryButton } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";

export const Route = createFileRoute("/clinicas/agenda")({
  head: () => pageHead("Clinicas · Agenda"),
  component: AgendaPage,
});

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-surface-3 text-foreground border-border",
  confirmado: "bg-[oklch(0.7_0.12_220)/0.15] text-[oklch(0.78_0.13_220)] border-[oklch(0.7_0.12_220)/0.3]",
  em_atendimento: "bg-warning/15 text-warning border-warning/30",
  realizado: "bg-success/15 text-success border-success/30",
  faltou: "bg-destructive/15 text-destructive border-destructive/30",
  cancelado: "bg-muted text-muted-foreground border-border line-through",
  remarcado: "bg-surface-3 text-muted-foreground border-border",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function AgendaPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<"day" | "week">("week");
  const [profFilter, setProfFilter] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === "day") {
      const s = new Date(anchor); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 1);
      return { rangeStart: s, rangeEnd: e, days: [s] };
    }
    const s = startOfWeek(anchor);
    const e = new Date(s); e.setDate(e.getDate() + 7);
    const arr = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return d; });
    return { rangeStart: s, rangeEnd: e, days: arr };
  }, [anchor, view]);

  const { data: appts = [], isLoading } = useAppointments(rangeStart, rangeEnd, profFilter);
  const { data: profs = [] } = useProfessionals();
  const updStatus = useUpdateAppointmentStatus();

  const apptsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of appts) {
      const key = new Date(a.inicio).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-1">
          <Button variant="unstyled" size="unstyled" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() - (view === "day" ? 1 : 7)); setAnchor(d); }} className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="unstyled" size="unstyled" onClick={() => setAnchor(new Date())} className="rounded px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">Hoje</Button>
          <Button variant="unstyled" size="unstyled" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() + (view === "day" ? 1 : 7)); setAnchor(d); }} className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-1">
          {(["day", "week"] as const).map((v) => (
            <Button variant="unstyled" size="unstyled" key={v} onClick={() => setView(v)} className={["rounded px-3 py-1 text-xs font-medium transition", view === v ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>{v === "day" ? "Dia" : "Semana"}</Button>
          ))}
        </div>

        <select
          value={profFilter ?? ""}
          onChange={(e) => setProfFilter(e.target.value || null)}
          className="h-9 rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none"
        >
          <option value="">Todos profissionais</option>
          {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {rangeStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            {view === "week" && ` — ${new Date(rangeEnd.getTime() - 1).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`}
          </span>
          <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>Novo agendamento</PrimaryButton>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className={view === "day" ? "" : "grid grid-cols-7 divide-x divide-border"}>
            {days.map((d) => {
              const dayAppts = apptsByDay.get(d.toDateString()) ?? [];
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={d.toISOString()} className="flex flex-col min-h-[420px]">
                  <div className={["sticky top-0 border-b border-border px-3 py-2.5 text-center text-xs font-medium uppercase tracking-wider", isToday ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted-foreground"].join(" ")}>
                    <div>{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                    <div className={["mt-1 text-lg font-semibold", isToday ? "text-primary" : "text-foreground"].join(" ")}>{d.getDate()}</div>
                  </div>
                  <div className="flex-1 space-y-1.5 p-2">
                    {dayAppts.length === 0 ? (
                      <div className="grid h-full place-items-center text-[11px] text-muted-foreground">—</div>
                    ) : (
                      dayAppts.map((a: any) => (
                        <div key={a.id} className={["group rounded-md border px-2 py-1.5 text-xs", STATUS_COLORS[a.status] ?? STATUS_COLORS.agendado].join(" ")}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold">
                              {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                              <Button variant="unstyled" size="unstyled" onClick={() => updStatus.mutate({ id: a.id, status: "confirmado" })} title="Confirmar" className="rounded p-0.5 hover:bg-surface-3"><CheckCircle2 className="h-3 w-3" /></Button>
                              <Button variant="unstyled" size="unstyled" onClick={() => updStatus.mutate({ id: a.id, status: "realizado" })} title="Marcar realizado" className="rounded p-0.5 hover:bg-surface-3"><CheckCircle2 className="h-3 w-3" /></Button>
                              <Button variant="unstyled" size="unstyled" onClick={() => updStatus.mutate({ id: a.id, status: "faltou" })} title="Faltou" className="rounded p-0.5 hover:bg-surface-3"><XCircle className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-1 truncate font-medium">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{a.patient?.nome}</span>
                          </div>
                          {a.procedimento && <div className="mt-0.5 truncate text-[10px] opacity-70">{a.procedimento}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {creating && <NewAppointmentDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewAppointmentDialog({ onClose }: { onClose: () => void }) {
  const { data: patients = [] } = usePatients();
  const { data: profs = [] } = useProfessionals();
  const upsert = useUpsertAppointment();

  const [patientId, setPatientId] = useState("");
  const [profId, setProfId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duracao, setDuracao] = useState(30);
  const [procedimento, setProcedimento] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [observacoes, setObservacoes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    const inicio = new Date(`${date}T${time}:00`);
    const fim = new Date(inicio.getTime() + duracao * 60000);
    await upsert.mutateAsync({
      patient_id: patientId,
      professional_id: profId || undefined,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      procedimento: procedimento || undefined,
      valor: valor === "" ? 0 : Number(valor),
      observacoes: observacoes || undefined,
    } as any);
    onClose();
  }

  const inputCls = "h-9 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-foreground outline-none focus:border-primary/60";
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Agenda"
      title="Novo agendamento"
      widthClass="md:max-w-[560px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{
            label: "Agendar",
            onClick: () => document.getElementById("appointment-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })),
            loading: upsert.isPending,
          }}
        />
      }
    >
      <form id="appointment-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Paciente" full>
          <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
            <option value="">Selecione...</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
        <Field label="Profissional" full>
          <select value={profId} onChange={(e) => setProfId(e.target.value)} className={inputCls}>
            <option value="">Sem profissional</option>
            {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
        <Field label="Data"><input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Horário"><input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></Field>
        <Field label="Duração (min)"><input type="number" min={5} step={5} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Valor (R$)"><input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} /></Field>
        <Field label="Procedimento" full><input value={procedimento} onChange={(e) => setProcedimento(e.target.value)} placeholder="Ex: Limpeza, restauração..." className={inputCls} /></Field>
        <Field label="Observações" full><textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={`${inputCls} h-auto py-2 resize-none`} /></Field>
      </form>
    </AlignPanel>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
