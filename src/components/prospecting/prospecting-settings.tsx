import { useEffect, useState } from "react";
import { useProspectingSettings, useSaveProspectingSettings } from "@/hooks/use-prospecting";
import { Settings2 } from "lucide-react";

const DEFAULT_WEIGHTS = {
  telefone: 12,
  whatsapp: 10,
  email: 8,
  site: 8,
  instagram: 6,
  linkedin: 6,
  rating: 12,
  reviews: 10,
  completude: 8,
  match_nicho: 8,
  match_regiao: 6,
  atividade: 6,
};

export function ProspectingSettings() {
  const { data } = useProspectingSettings();
  const save = useSaveProspectingSettings();
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(100);
  const [scoreMinimum, setScoreMinimum] = useState(50);
  const [quantityMaximum, setQuantityMaximum] = useState(100);
  const [retentionDays, setRetentionDays] = useState(180);

  useEffect(() => {
    const source = data?.sources.find((item: any) => item.provider === "google_places");
    if (source) {
      setEnabled(source.ativo);
      setConfigured(source.configurado);
      setMonthlyLimit(source.limite_mensal);
    }
    if (data?.rules) {
      setScoreMinimum(data.rules.score_minimo);
      setQuantityMaximum(data.rules.quantidade_max);
      setRetentionDays(data.rules.retencao_dias);
    }
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Settings2 className="h-4 w-4" /> Google Places API (New)
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          A chave continua exclusivamente no secret <code>GOOGLE_PLACES_API_KEY</code> da Edge
          Function. O valor nunca é retornado para esta tela.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Check label="Provider ativo" checked={enabled} onChange={setEnabled} />
          <Check label="Secret configurado" checked={configured} onChange={setConfigured} />
          <NumberField label="Limite mensal" value={monthlyLimit} onChange={setMonthlyLimit} />
        </div>
      </div>
      <div className="grid gap-3 rounded-xl border border-border bg-surface-1 p-4 sm:grid-cols-3">
        <NumberField
          label="Score mínimo padrão"
          value={scoreMinimum}
          onChange={setScoreMinimum}
          max={100}
        />
        <NumberField
          label="Máximo por pesquisa"
          value={quantityMaximum}
          onChange={setQuantityMaximum}
          max={1000}
        />
        <NumberField label="Retenção em dias" value={retentionDays} onChange={setRetentionDays} />
      </div>
      <button
        onClick={() =>
          save.mutate({
            source: {
              provider: "google_places",
              ativo: enabled,
              configurado: configured,
              limite_mensal: monthlyLimit,
            },
            rules: {
              score_minimo: scoreMinimum,
              quantidade_max: quantityMaximum,
              retencao_dias: retentionDays,
              pesos: data?.rules?.pesos ?? DEFAULT_WEIGHTS,
            },
          })
        }
        disabled={save.isPending}
        className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Salvar configurações
      </button>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
      />
    </label>
  );
}
