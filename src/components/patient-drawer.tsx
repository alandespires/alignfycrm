import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Trash2 } from "@/components/ui/icons";
import { useDeletePatient, type Patient } from "@/hooks/use-clinic";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";

type FormData = Partial<Patient> & { nome: string };

export function PatientDrawer({ patient, onClose, onSave }: {
  patient: Patient | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  const del = useDeletePatient();
  const [data, setData] = useState<FormData>(patient ?? { nome: "", status: "ativo" } as any);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setData(patient ?? { nome: "", status: "ativo" } as any); }, [patient]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((p) => ({ ...p, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }

  const statusTone: "success" | "neutral" | "danger" =
    data.status === "ativo" ? "success" : data.status === "bloqueado" ? "danger" : "neutral";

  return (
    <AlignPanel
      open={true}
      onClose={onClose}
      eyebrow="Clínica"
      title={patient ? "Editar paciente" : "Novo paciente"}
      subtitle="Dados pessoais, contato e histórico clínico básico"
      status={{ label: data.status ?? "ativo", tone: statusTone }}
      headerActions={
        patient && (
          <Button variant="unstyled" size="unstyled"
            type="button"
            onClick={async () => { if (confirm(`Remover ${patient.nome}?`)) { await del.mutateAsync(patient.id); onClose(); } }}
            className="grid h-9 w-9 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive transition hover:bg-destructive/20"
            title="Remover paciente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      }
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: "Salvar", onClick: submit, loading: saving, disabled: !data.nome?.trim() }}
        />
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6">
        <AlignPanelSection title="Identificação">
          <Grid>
            <Field label="Nome completo" full><input required value={data.nome ?? ""} onChange={(e) => update("nome", e.target.value)} className={inputCls} /></Field>
            <Field label="CPF"><input value={data.cpf ?? ""} onChange={(e) => update("cpf", e.target.value)} className={inputCls} /></Field>
            <Field label="Data de nascimento"><input type="date" value={data.data_nascimento ?? ""} onChange={(e) => update("data_nascimento", e.target.value || null)} className={inputCls} /></Field>
            <Field label="Gênero">
              <select value={data.genero ?? ""} onChange={(e) => update("genero", e.target.value || null)} className={inputCls}>
                <option value="">—</option><option>Feminino</option><option>Masculino</option><option>Outro</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={data.status ?? "ativo"} onChange={(e) => update("status", e.target.value as any)} className={inputCls}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="bloqueado">Bloqueado</option>
              </select>
            </Field>
          </Grid>
        </AlignPanelSection>

        <AlignPanelSection title="Contato">
          <Grid>
            <Field label="WhatsApp"><input value={data.whatsapp ?? ""} onChange={(e) => update("whatsapp", e.target.value)} className={inputCls} /></Field>
            <Field label="Telefone"><input value={data.telefone ?? ""} onChange={(e) => update("telefone", e.target.value)} className={inputCls} /></Field>
            <Field label="E-mail" full><input type="email" value={data.email ?? ""} onChange={(e) => update("email", e.target.value)} className={inputCls} /></Field>
            <Field label="Endereço" full><input value={data.endereco ?? ""} onChange={(e) => update("endereco", e.target.value)} className={inputCls} /></Field>
            <Field label="Cidade"><input value={data.cidade ?? ""} onChange={(e) => update("cidade", e.target.value)} className={inputCls} /></Field>
            <Field label="UF"><input value={data.estado ?? ""} maxLength={2} onChange={(e) => update("estado", e.target.value.toUpperCase())} className={inputCls} /></Field>
          </Grid>
        </AlignPanelSection>

        <AlignPanelSection title="Convênio">
          <Grid>
            <Field label="Convênio"><input value={data.convenio ?? ""} onChange={(e) => update("convenio", e.target.value)} placeholder="Particular / nome do convênio" className={inputCls} /></Field>
            <Field label="Nº carteirinha"><input value={data.numero_convenio ?? ""} onChange={(e) => update("numero_convenio", e.target.value)} className={inputCls} /></Field>
          </Grid>
        </AlignPanelSection>

        <AlignPanelSection title="Histórico clínico">
          <Grid>
            <Field label="Alergias" full><textarea rows={2} value={data.alergias ?? ""} onChange={(e) => update("alergias", e.target.value)} className={inputCls + " h-auto resize-none py-2"} /></Field>
            <Field label="Medicamentos em uso" full><textarea rows={2} value={data.medicamentos_uso ?? ""} onChange={(e) => update("medicamentos_uso", e.target.value)} className={inputCls + " h-auto resize-none py-2"} /></Field>
            <Field label="Doenças pré-existentes" full><textarea rows={2} value={data.doencas_preexistentes ?? ""} onChange={(e) => update("doencas_preexistentes", e.target.value)} className={inputCls + " h-auto resize-none py-2"} /></Field>
            <Field label="Observações gerais" full><textarea rows={3} value={data.observacoes ?? ""} onChange={(e) => update("observacoes", e.target.value)} className={inputCls + " h-auto resize-none py-2"} /></Field>
          </Grid>
        </AlignPanelSection>

        <Button variant="unstyled" size="unstyled" type="submit" className="sr-only" />
      </form>
    </AlignPanel>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
