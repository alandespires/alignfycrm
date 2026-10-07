import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Loader2, UserCog } from "lucide-react";
import { useProfessionals, useUpsertProfessional } from "@/hooks/use-clinic";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";

export const Route = createFileRoute("/clinicas/configuracoes")({
  component: ConfigClinicaPage,
});

function ConfigClinicaPage() {
  const { data: profs = [], isLoading } = useProfessionals();
  const upsert = useUpsertProfessional();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-1 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Profissionais da clínica</h3>
            <p className="text-xs text-muted-foreground">Cadastre dentistas e especialistas para usar na agenda.</p>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110">
            <Plus className="h-4 w-4" /> Novo profissional
          </button>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : profs.length === 0 ? (
          <div className="grid place-items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10"><UserCog className="h-5 w-5 text-primary" /></div>
            <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {profs.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-3 w-3 rounded-full" style={{ background: p.cor }} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.especialidade ?? "—"}{p.cro ? ` · CRO ${p.cro}` : ""}
                  </div>
                </div>
                <span className={`text-xs ${p.ativo ? "text-success" : "text-muted-foreground"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <NewProfDialog onClose={() => setCreating(false)} onSave={async (d) => { await upsert.mutateAsync(d); setCreating(false); }} />
      )}
    </div>
  );
}

function NewProfDialog({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [cro, setCro] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const inputCls = "h-9 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ nome, especialidade, cro, cor });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Equipe"
      title="Novo profissional"
      widthClass="md:max-w-[480px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{
            label: "Salvar",
            onClick: () => document.getElementById("professional-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })),
            loading: saving,
          }}
        />
      }
    >
      <form id="professional-form" onSubmit={submit} className="space-y-3">
        <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</label><input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} /></div>
        <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Especialidade</label><input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CRO</label><input value={cro} onChange={(e) => setCro(e.target.value)} className={inputCls} /></div>
          <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cor</label><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface-2" /></div>
        </div>
      </form>
    </AlignPanel>
  );
}
