import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportResults, type ProspectingImportOptions } from "@/hooks/use-prospecting";
import { useTeam } from "@/hooks/use-commercial-role";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

type ImportSummary = {
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  falhos: number;
};

export function ProspectingImportDialog({
  open,
  onOpenChange,
  resultIds,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultIds: string[];
  onCompleted: () => void;
}) {
  const mutation = useImportResults();
  const { data: team = [] } = useTeam();
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [tags, setTags] = useState("prospeccao");
  const [options, setOptions] = useState<ProspectingImportOptions>({
    duplicate_strategy: "ignore",
    score_min: 0,
    require_contact: false,
    initial_stage: "novo",
  });

  useEffect(() => {
    if (open) {
      setRequestKey(crypto.randomUUID());
      setSummary(null);
    }
  }, [open]);

  async function submit() {
    const result = await mutation.mutateAsync({
      resultIds,
      requestKey,
      options: {
        ...options,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
    });
    setSummary(result);
    onCompleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar ao CRM</DialogTitle>
          <DialogDescription>
            Revise as regras para importar {resultIds.length} resultado
            {resultIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <div className="font-semibold">Importação concluída</div>
                <div className="text-sm text-muted-foreground">
                  {summary.criados} criados · {summary.atualizados} atualizados ·{" "}
                  {summary.ignorados} ignorados · {summary.falhos} falhos
                </div>
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Fechar
              </button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Responsável">
                <select
                  value={options.owner_id ?? ""}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      owner_id: event.target.value || undefined,
                    }))
                  }
                  className="field-control"
                >
                  <option value="">Eu mesmo</option>
                  {team.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name ?? member.profile?.email ?? "Usuário"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Funil">
                <select disabled className="field-control opacity-70">
                  <option>Comercial padrão</option>
                </select>
              </Field>
              <Field label="Etapa inicial">
                <select
                  value={options.initial_stage}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      initial_stage: event.target
                        .value as ProspectingImportOptions["initial_stage"],
                    }))
                  }
                  className="field-control"
                >
                  <option value="novo">Novo</option>
                  <option value="contato_inicial">Contato inicial</option>
                  <option value="qualificacao">Qualificação</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociacao">Negociação</option>
                </select>
              </Field>
              <Field label="Score mínimo">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={options.score_min ?? 0}
                  onChange={(event) =>
                    setOptions((current) => ({ ...current, score_min: Number(event.target.value) }))
                  }
                  className="field-control"
                />
              </Field>
              <Field label="Tags">
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="prospeccao, prioridade"
                  className="field-control"
                />
              </Field>
              <Field label="Duplicidades">
                <select
                  value={options.duplicate_strategy}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      duplicate_strategy: event.target.value as "ignore" | "update",
                    }))
                  }
                  className="field-control"
                >
                  <option value="ignore">Ignorar existentes</option>
                  <option value="update">Atualizar existentes</option>
                </select>
              </Field>
            </div>
            <Field label="Observação">
              <textarea
                value={options.observation ?? ""}
                onChange={(event) =>
                  setOptions((current) => ({ ...current, observation: event.target.value }))
                }
                rows={3}
                className="field-control h-auto py-2"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.require_contact}
                onChange={(event) =>
                  setOptions((current) => ({ ...current, require_contact: event.target.checked }))
                }
                className="accent-primary"
              />
              Importar somente contatos com telefone ou WhatsApp em formato válido
            </label>
            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-lg border border-border px-4 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={!resultIds.length || mutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Adicionar ao CRM
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
