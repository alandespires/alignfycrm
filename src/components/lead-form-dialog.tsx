import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";
import { Plus } from "@/components/ui/icons";
import { useCreateLead, type LeadStatus } from "@/hooks/use-leads";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";

const STATUS_OPTIONS: { v: LeadStatus; l: string }[] = [
  { v: "novo", l: "Novo Lead" },
  { v: "contato_inicial", l: "Contato Inicial" },
  { v: "qualificacao", l: "Qualificação" },
  { v: "proposta", l: "Proposta" },
  { v: "negociacao", l: "Negociação" },
];

export function LeadFormDialog({ defaultStatus = "novo", trigger }: { defaultStatus?: LeadStatus; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState("Site");
  const [nicho, setNicho] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<LeadStatus>(defaultStatus);
  const [obs, setObs] = useState("");
  const create = useCreateLead();

  function reset() {
    setNome(""); setEmpresa(""); setEmail(""); setWhatsapp("");
    setOrigem("Site"); setNicho(""); setValor(""); setStatus(defaultStatus); setObs("");
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!nome.trim()) return;
    await create.mutateAsync({
      nome, empresa: empresa || undefined, email: email || undefined,
      whatsapp: whatsapp || undefined, origem: origem || undefined,
      nicho: nicho.trim() || undefined,
      observacoes: obs || undefined, status,
      valor_estimado: valor ? Number(valor) : undefined,
    });
    reset();
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="unstyled" size="unstyled" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110">
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        )}
      </span>

      <AlignPanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Comercial"
        title="Novo lead"
        subtitle="Adicione ao funil em segundos"
        footer={
          <AlignPanelFooter
            secondary={{ label: "Cancelar", onClick: () => setOpen(false) }}
            primary={{ label: "Criar lead", onClick: () => onSubmit(), loading: create.isPending, disabled: !nome.trim() }}
          />
        }
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <AlignPanelSection title="Identificação">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *"><input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} /></Field>
              <Field label="Empresa"><input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputCls} /></Field>
              <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
              <Field label="WhatsApp"><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+55 11 9..." /></Field>
            </div>
          </AlignPanelSection>

          <AlignPanelSection title="Funil">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Origem">
                <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={inputCls}>
                  <option>Site</option><option>LinkedIn</option><option>Indicação</option>
                  <option>Anúncio</option><option>Evento</option><option>Outro</option>
                </select>
              </Field>
              <Field label="Valor estimado (R$)">
                <input type="number" min="0" step="100" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Nicho" full>
                <input value={nicho} onChange={(e) => setNicho(e.target.value)} className={inputCls} placeholder="Ex.: Saúde, Educação, SaaS..." list="nicho-suggestions" />
                <datalist id="nicho-suggestions">
                  <option value="Saúde" /><option value="Educação" /><option value="Tecnologia" />
                  <option value="SaaS" /><option value="Varejo" /><option value="Serviços" />
                  <option value="Indústria" /><option value="Financeiro" /><option value="Imobiliário" />
                  <option value="Alimentação" /><option value="Consultoria" /><option value="Agronegócio" />
                </datalist>
              </Field>
              <Field label="Etapa" full>
                <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </Field>
            </div>
          </AlignPanelSection>

          <AlignPanelSection title="Observações">
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={4} className={inputCls + " resize-none py-2 h-auto"} placeholder="Contexto, dor, próximo passo..." />
          </AlignPanelSection>

          <Button variant="unstyled" size="unstyled" type="submit" className="sr-only" />
        </form>
      </AlignPanel>
    </>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={["block", full ? "col-span-2" : ""].join(" ")}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
