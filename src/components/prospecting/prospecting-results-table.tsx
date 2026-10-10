import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import type { ProspectingResultRow } from "@/lib/prospecting/types";
import { ScorePill } from "./score-pill";
import { Star, Mail, Phone, Globe, Instagram, MapPin, Sparkles, CheckCircle2 } from "@/components/ui/icons";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { canImportProspectingResult } from "@/lib/prospecting/demo";
import { WhatsAppContactLink } from "@/components/whatsapp-contact-link";

export function ProspectingResultsTable({
  results, selected, onToggleSelect, onSelectAll, onOpen, onToggleFav,
}: {
  results: ProspectingResultRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpen: (r: ProspectingResultRow) => void;
  onToggleFav: (r: ProspectingResultRow) => void;
}) {
  if (!results.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-16 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Nenhum resultado ainda</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Configure filtros e clique em <strong>Buscar</strong> para gerar leads B2B qualificados.</p>
      </div>
    );
  }

  const importableResults = results.filter(canImportProspectingResult);
  const allSelected =
    importableResults.length > 0 &&
    importableResults.every((result) => selected.has(result.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-1/60">
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">
                <input aria-label="Selecionar todos os resultados importáveis" type="checkbox" checked={allSelected} onChange={onSelectAll} className="h-3.5 w-3.5 rounded border-border accent-primary" />
              </th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Nicho</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Contato</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Oportunidade</th>
              <th />
            </tr>
          </thead>
          <motion.tbody variants={staggerContainer} initial="initial" animate="animate" className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {results.map((r) => (
                <motion.tr
                  key={r.id}
                  variants={staggerItem}
                  layout
                  onClick={() => onOpen(r)}
                  className={`cursor-pointer transition hover:bg-surface-1/50 ${r.status === "importado" ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => onToggleSelect(r.id)}
                      disabled={!canImportProspectingResult(r)}
                      aria-label={`Selecionar ${r.nome}`}
                      title={
                        r.is_demo && !canImportProspectingResult(r)
                          ? "Importação de dados demo bloqueada"
                          : undefined
                      }
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="leading-tight">
                        <div className="font-medium">{r.nome}</div>
                        {r.rating && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            ★ {r.rating} · {r.reviews_count ?? 0} avaliações
                          </div>
                        )}
                      </div>
                      {r.is_demo && <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">Demo</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{r.segmento ?? "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.cidade ? `${r.cidade}/${r.uf ?? ""}` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {r.is_demo ? <span className="text-[10px] font-semibold uppercase tracking-wide text-warning">Bloqueado no Demo</span> : <>
                        {r.whatsapp && <WhatsAppContactLink phone={r.whatsapp_norm ?? r.whatsapp} className="hover:text-success"><Phone className="h-3.5 w-3.5" /></WhatsAppContactLink>}
                        {r.email && <a href={`mailto:${r.email}`} className="hover:text-primary" title={r.email}><Mail className="h-3.5 w-3.5" /></a>}
                        {r.site && <a href={r.site} target="_blank" rel="noreferrer" className="hover:text-primary" title={r.site}><Globe className="h-3.5 w-3.5" /></a>}
                        {r.instagram && <span className="text-muted-foreground" title={r.instagram}><Instagram className="h-3.5 w-3.5" /></span>}
                        {!r.whatsapp && !r.email && !r.site && <span className="text-xs">—</span>}
                      </>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><ScorePill score={r.score} tier={r.tier as any} /></td>
                  <td className="px-4 py-3.5">
                    {r.oportunidade ? (
                      <span className="block max-w-[280px] truncate text-xs text-foreground/90" title={r.oportunidade}>{r.oportunidade}</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "importado" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      <Button variant="unstyled" size="unstyled"
                        onClick={() => onToggleFav(r)}
                        title={r.favorito ? "Remover favorito" : "Favoritar"}
                        aria-label={`${r.favorito ? "Remover dos favoritos" : "Favoritar"} ${r.nome}`}
                        className={`grid h-7 w-7 place-items-center rounded-md transition ${r.favorito ? "text-warning" : "text-muted-foreground hover:text-warning"}`}
                      >
                        <Star className={`h-3.5 w-3.5 ${r.favorito ? "fill-current" : ""}`} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
