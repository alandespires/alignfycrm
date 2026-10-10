import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";
import type { ProspectingFilters } from "@/lib/prospecting/types";
import { Search, MapPin, Sparkles, Zap } from "@/components/ui/icons";
import { fadeUp } from "@/lib/motion";

const NICHOS_SUGERIDOS = [
  "Odontologia",
  "Restaurante",
  "Academia",
  "Advocacia",
  "Contabilidade",
  "Estética",
  "Imobiliária",
  "Pet Shop",
  "Barbearia",
  "Clínica Médica",
];

export function ProspectingFiltersBar({
  value,
  onChange,
  onRun,
  running,
}: {
  value: ProspectingFilters;
  onChange: (v: ProspectingFilters) => void;
  onRun: () => void;
  running?: boolean;
}) {
  const [showAdv, setShowAdv] = useState(false);
  const patch = (p: Partial<ProspectingFilters>) => onChange({ ...value, ...p });

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1.5fr_1fr_120px_auto]">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Nicho / Segmento
          </span>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              list="nichos-sugeridos"
              value={value.nicho ?? ""}
              onChange={(e) => patch({ nicho: e.target.value })}
              placeholder="Ex: Odontologia"
              className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <datalist id="nichos-sugeridos">
              {NICHOS_SUGERIDOS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cidade
          </span>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={value.cidade ?? ""}
              onChange={(e) => patch({ cidade: e.target.value })}
              placeholder="Ex: São Paulo"
              className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            UF
          </span>
          <input
            value={value.uf ?? ""}
            onChange={(e) => patch({ uf: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="SP"
            maxLength={2}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm uppercase focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Qtd
          </span>
          <input
            type="number"
            min={5}
            max={200}
            value={value.quantidade ?? 30}
            onChange={(e) =>
              patch({ quantidade: Math.min(200, Math.max(5, Number(e.target.value) || 30)) })
            }
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="flex items-end">
          <Button variant="unstyled" size="unstyled"
            onClick={onRun}
            disabled={running}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {running ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Intenção:
        </span>
        <Chip active={!!value.sem_site} onClick={() => patch({ sem_site: !value.sem_site })}>
          Sem site
        </Chip>
        <Chip
          active={!!value.sem_whatsapp}
          onClick={() => patch({ sem_whatsapp: !value.sem_whatsapp })}
        >
          WhatsApp não identificado
        </Chip>
        <Chip
          active={!!value.baixa_presenca_digital}
          onClick={() => patch({ baixa_presenca_digital: !value.baixa_presenca_digital })}
        >
          Baixa presença digital
        </Chip>
        <Chip
          active={!!value.excluir_cadastrados}
          onClick={() => patch({ excluir_cadastrados: !value.excluir_cadastrados })}
        >
          Excluir já cadastrados
        </Chip>
        <Button variant="unstyled" size="unstyled"
          onClick={() => setShowAdv((s) => !s)}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Zap className="h-3 w-3" /> {showAdv ? "Menos filtros" : "Mais filtros"}
        </Button>
      </div>

      {showAdv && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-4">
          <NumberField
            label="Score mínimo"
            value={value.score_min}
            onChange={(v) => patch({ score_min: v })}
          />
          <NumberField
            label="Nota mínima"
            value={value.nota_min}
            onChange={(v) => patch({ nota_min: v })}
            step={0.1}
            max={5}
          />
          <NumberField
            label="Reviews mínimos"
            value={value.reviews_min}
            onChange={(v) => patch({ reviews_min: v })}
          />
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Palavra-chave
            </span>
            <input
              value={value.palavra_chave ?? ""}
              onChange={(e) => patch({ palavra_chave: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      )}
    </motion.div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="unstyled" size="unstyled"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[11px] font-medium transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface-1 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  max,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  step?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        step={step}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
