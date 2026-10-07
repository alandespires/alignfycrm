import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, FileText, Plus, Loader2, User } from "lucide-react";
import { usePatients, useClinicalRecords, useCreateRecord } from "@/hooks/use-clinic";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";

export const Route = createFileRoute("/clinicas/prontuarios")({
  component: ProntuariosPage,
});

const TIPO_LABEL: Record<string, string> = {
  anamnese: "Anamnese",
  evolucao: "Evolução",
  observacao: "Observação",
  retorno: "Retorno",
  procedimento: "Procedimento",
};

function ProntuariosPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: patients = [], isLoading: lp } = usePatients(search);
  const { data: records = [], isLoading: lr } = useClinicalRecords(selected);
  const createRec = useCreateRecord();

  const selectedPatient = patients.find((p) => p.id === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-border bg-surface-1 shadow-card">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {lp ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : patients.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum paciente encontrado</div>
          ) : (
            patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={["flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition", selected === p.id ? "bg-surface-3" : "hover:bg-surface-2"].join(" ")}
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {p.nome.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">{p.nome}</div>
                  {p.ultimo_atendimento_em && <div className="text-[10px] text-muted-foreground">Último: {new Date(p.ultimo_atendimento_em).toLocaleDateString("pt-BR")}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 shadow-card">
        {!selectedPatient ? (
          <div className="grid place-items-center gap-3 py-24 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <p className="text-sm text-muted-foreground">Selecione um paciente para ver o prontuário.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{selectedPatient.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.data_nascimento ? `${new Date(selectedPatient.data_nascimento).toLocaleDateString("pt-BR")} · ` : ""}
                    {selectedPatient.convenio ?? "Particular"}
                  </p>
                </div>
              </div>
              <button onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110">
                <Plus className="h-4 w-4" /> Novo registro
              </button>
            </div>

            {(selectedPatient.alergias || selectedPatient.medicamentos_uso || selectedPatient.doencas_preexistentes) && (
              <div className="grid gap-3 border-b border-border bg-surface-2/40 p-4 md:grid-cols-3">
                {selectedPatient.alergias && <InfoBlock label="Alergias" value={selectedPatient.alergias} tone="danger" />}
                {selectedPatient.medicamentos_uso && <InfoBlock label="Medicamentos" value={selectedPatient.medicamentos_uso} tone="warn" />}
                {selectedPatient.doencas_preexistentes && <InfoBlock label="Pré-existentes" value={selectedPatient.doencas_preexistentes} tone="warn" />}
              </div>
            )}

            <div className="divide-y divide-border">
              {lr ? (
                <div className="grid place-items-center py-12"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : records.length === 0 ? (
                <div className="grid place-items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                  Nenhum registro clínico ainda.
                </div>
              ) : (
                records.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{TIPO_LABEL[r.tipo] ?? r.tipo}</span>
                      {r.dente && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Dente {r.dente}</span>}
                      <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    {r.titulo && <div className="text-sm font-medium">{r.titulo}</div>}
                    {r.queixa_principal && <div className="mt-1 text-xs italic text-muted-foreground">Queixa: {r.queixa_principal}</div>}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.conteudo}</p>
                    {r.procedimento && <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Procedimento:</span> {r.procedimento}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {creating && selected && (
        <NewRecordDialog
          patientId={selected}
          onClose={() => setCreating(false)}
          onSave={async (input) => { await createRec.mutateAsync(input); setCreating(false); }}
        />
      )}
    </div>
  );
}

function InfoBlock({ label, value, tone }: { label: string; value: string; tone: "danger" | "warn" }) {
  const c = tone === "danger" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning";
  return (
    <div className={`rounded-lg border p-2.5 ${c}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 text-xs">{value}</div>
    </div>
  );
}

function NewRecordDialog({ patientId, onClose, onSave }: { patientId: string; onClose: () => void; onSave: (i: any) => Promise<void> }) {
  const [tipo, setTipo] = useState<"anamnese" | "evolucao" | "observacao" | "retorno" | "procedimento">("evolucao");
  const [titulo, setTitulo] = useState("");
  const [queixa, setQueixa] = useState("");
  const [dente, setDente] = useState("");
  const [procedimento, setProcedimento] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        patient_id: patientId, tipo, titulo: titulo || null, queixa_principal: queixa || null,
        dente: dente || null, procedimento: procedimento || null, conteudo,
      });
    } finally { setSaving(false); }
  }

  const inputCls = "h-9 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-foreground outline-none focus:border-primary/60";
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Prontuário"
      title="Novo registro clínico"
      widthClass="md:max-w-[640px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{
            label: "Salvar registro",
            onClick: () => document.getElementById("record-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })),
            loading: saving,
          }}
        />
      }
    >
      <form id="record-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className={inputCls}>
            <option value="anamnese">Anamnese</option>
            <option value="evolucao">Evolução</option>
            <option value="procedimento">Procedimento</option>
            <option value="retorno">Retorno</option>
            <option value="observacao">Observação</option>
          </select>
        </Field>
        <Field label="Dente / Região"><input value={dente} onChange={(e) => setDente(e.target.value)} placeholder="Ex: 36, sup. esq." className={inputCls} /></Field>
        <Field label="Título" full><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} /></Field>
        <Field label="Queixa principal" full><input value={queixa} onChange={(e) => setQueixa(e.target.value)} className={inputCls} /></Field>
        <Field label="Procedimento realizado" full><input value={procedimento} onChange={(e) => setProcedimento(e.target.value)} className={inputCls} /></Field>
        <Field label="Descrição clínica" full>
          <textarea required value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={5} className={`${inputCls} h-auto py-2 resize-none`} placeholder="Descreva a evolução, exame clínico, conduta..." />
        </Field>
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
