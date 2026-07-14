import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import type { ProspectingResultRow } from "@/lib/prospecting/types";
import { ScorePill } from "./score-pill";
import { CheckCircle2, AlertTriangle, Mail, Phone, Globe, Instagram, Linkedin, MapPin, Sparkles } from "lucide-react";
import { useImportResults, useToggleFavorite, useUpdateResultStatus } from "@/hooks/use-prospecting";

export function ProspectingResultDrawer({ result, onClose }: { result: ProspectingResultRow | null; onClose: () => void }) {
  const importMut = useImportResults();
  const favMut = useToggleFavorite();
  const statusMut = useUpdateResultStatus();

  if (!result) return null;

  const canImport = result.status !== "importado";

  return (
    <AlignPanel
      open={!!result}
      onClose={onClose}
      eyebrow="Prospecção B2B"
      title={result.nome}
      subtitle={[result.segmento, result.cidade && `${result.cidade}/${result.uf ?? ""}`].filter(Boolean).join(" · ") || undefined}
      status={{ label: `Score ${result.score}`, tone: result.score >= 70 ? "success" : result.score >= 50 ? "warn" : "neutral" }}
      footer={
        <AlignPanelFooter
          secondary={{ label: result.favorito ? "Remover favorito" : "Favoritar", onClick: () => favMut.mutate({ id: result.id, favorito: !result.favorito }) }}
          primary={{
            label: canImport ? "Importar como lead" : "Já importado",
            onClick: () => importMut.mutate({ resultIds: [result.id] }, { onSuccess: () => onClose() }),
            loading: importMut.isPending,
            disabled: !canImport,
          }}
        />
      }
    >
      <div className="space-y-5">
        {result.is_demo && (
          <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
            ⚠️ Dados de demonstração. Configure um provedor real para prospectar leads reais.
          </div>
        )}

        <AlignPanelSection title="Score & Qualificação">
          <div className="mb-3 flex items-center gap-3">
            <ScorePill score={result.score} tier={result.tier as any} />
            <span className="text-xs text-muted-foreground">Confiabilidade: <strong className="text-foreground">{result.confiabilidade}</strong></span>
          </div>
          {result.motivos_positivos?.length > 0 && (
            <ul className="mb-2 space-y-1 text-xs">
              {result.motivos_positivos.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-success"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {m}</li>
              ))}
            </ul>
          )}
          {result.motivos_atencao?.length > 0 && (
            <ul className="space-y-1 text-xs">
              {result.motivos_atencao.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-warning"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {m}</li>
              ))}
            </ul>
          )}
        </AlignPanelSection>

        {result.oportunidade && (
          <AlignPanelSection title="Oportunidade sugerida">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p>{result.oportunidade}</p>
              </div>
            </div>
          </AlignPanelSection>
        )}

        <AlignPanelSection title="Contato">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <ContactRow icon={Phone} label={result.telefone ?? "—"} href={result.telefone_norm ? `tel:${result.telefone_norm}` : undefined} />
            <ContactRow icon={Phone} label={result.whatsapp ?? "—"} href={result.whatsapp_norm ? `https://wa.me/${result.whatsapp_norm}` : undefined} accent="text-success" />
            <ContactRow icon={Mail} label={result.email ?? "—"} href={result.email ? `mailto:${result.email}` : undefined} />
            <ContactRow icon={Globe} label={result.site ?? "—"} href={result.site ?? undefined} />
            <ContactRow icon={Instagram} label={result.instagram ?? "—"} />
            <ContactRow icon={Linkedin} label={result.linkedin ?? "—"} />
            <ContactRow icon={MapPin} label={result.endereco ? `${result.endereco} · ${result.cidade ?? ""}/${result.uf ?? ""}` : (result.cidade ? `${result.cidade}/${result.uf ?? ""}` : "—")} />
          </div>
        </AlignPanelSection>

        {result.descricao && (
          <AlignPanelSection title="Descrição">
            <p className="text-sm text-muted-foreground">{result.descricao}</p>
          </AlignPanelSection>
        )}

        <AlignPanelSection title="Ações">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => statusMut.mutate({ id: result.id, status: "ignorado" })} className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs hover:border-destructive/40 hover:text-destructive">Ignorar</button>
            <button onClick={() => statusMut.mutate({ id: result.id, status: "invalido" })} className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs hover:border-destructive/40 hover:text-destructive">Marcar inválido</button>
          </div>
        </AlignPanelSection>
      </div>
    </AlignPanel>
  );
}

function ContactRow({ icon: Icon, label, href, accent }: { icon: any; label: string; href?: string; accent?: string }) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${accent ?? "text-foreground"}`}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </span>
  );
  return href && label !== "—" ? (
    <a href={href} target="_blank" rel="noreferrer" className="hover:underline">{content}</a>
  ) : (
    <div>{content}</div>
  );
}
