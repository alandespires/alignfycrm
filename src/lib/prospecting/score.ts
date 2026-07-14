import type { RawLead, Tier, Confiabilidade, ProspectingFilters } from "./types";
import { normalizePhone, normalizeEmail, extractDomain, isDisposableEmail } from "./normalize";

export type ScoreOutput = {
  score: number;
  tier: Tier;
  confiabilidade: Confiabilidade;
  motivos_positivos: string[];
  motivos_atencao: string[];
  oportunidade: string | null;
};

// Regras de qualificação. Pesos podem ser sobrescritos por prospecting_score_rules.
const DEFAULT_WEIGHTS: Record<string, number> = {
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

export function scoreLead(raw: RawLead, filters: ProspectingFilters, weights = DEFAULT_WEIGHTS): ScoreOutput {
  let score = 0;
  const pos: string[] = [];
  const att: string[] = [];

  const phone = normalizePhone(raw.telefone ?? raw.whatsapp);
  const whats = normalizePhone(raw.whatsapp);
  const email = normalizeEmail(raw.email);
  const domain = extractDomain(raw.site);

  if (phone) { score += weights.telefone; pos.push("Telefone válido"); }
  else att.push("Telefone não validado");

  if (whats) { score += weights.whatsapp; pos.push("WhatsApp identificado"); }
  else att.push("Sem WhatsApp identificado");

  if (email && !isDisposableEmail(email)) { score += weights.email; pos.push("E-mail válido"); }
  else if (email && isDisposableEmail(email)) att.push("E-mail possivelmente descartável");
  else att.push("Sem e-mail identificado");

  if (domain) { score += weights.site; pos.push("Possui site"); }
  else att.push("Não possui site identificado");

  if (raw.instagram) { score += weights.instagram; pos.push("Instagram ativo"); }
  if (raw.linkedin) { score += weights.linkedin; pos.push("LinkedIn identificado"); }

  if ((raw.rating ?? 0) >= 4) { score += weights.rating; pos.push(`Boa avaliação (${raw.rating})`); }
  else if (raw.rating != null && raw.rating < 3.5) att.push(`Avaliação baixa (${raw.rating})`);

  if ((raw.reviews_count ?? 0) >= 30) { score += weights.reviews; pos.push(`${raw.reviews_count} avaliações`); }
  else if ((raw.reviews_count ?? 0) < 5) att.push("Poucas avaliações");

  // Completude
  const camposPreenchidos = [raw.nome, raw.telefone, raw.email, raw.site, raw.cidade, raw.uf, raw.segmento].filter(Boolean).length;
  if (camposPreenchidos >= 5) { score += weights.completude; pos.push("Dados completos"); }
  else if (camposPreenchidos <= 3) att.push("Dados incompletos");

  // Match nicho
  if (filters.nicho && raw.segmento?.toLowerCase().includes(filters.nicho.toLowerCase())) {
    score += weights.match_nicho; pos.push("Corresponde ao nicho pesquisado");
  }

  // Match região
  if (filters.cidade && raw.cidade?.toLowerCase() === filters.cidade.toLowerCase()) {
    score += weights.match_regiao; pos.push("Corresponde à região");
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  const tier: Tier = score >= 85 ? "excelente" : score >= 70 ? "bom" : score >= 50 ? "medio" : "baixo";
  const confiabilidade: Confiabilidade = (phone && (email || domain)) ? "alta" : (phone || email) ? "media" : "baixa";

  // Oportunidade
  let oportunidade: string | null = null;
  if (!domain && (raw.reviews_count ?? 0) >= 20) oportunidade = "Empresa com presença física relevante e sem site — oportunidade para criação de site e captação online.";
  else if (!whats) oportunidade = "Empresa sem canal de WhatsApp — oportunidade para implementar atendimento digital.";
  else if ((raw.reviews_count ?? 0) < 5 && domain) oportunidade = "Empresa com pouca prova social — oportunidade para gestão de reputação.";
  else if ((raw.rating ?? 0) >= 4 && !raw.instagram) oportunidade = "Empresa bem avaliada sem presença no Instagram — oportunidade para marketing digital.";

  return { score, tier, confiabilidade, motivos_positivos: pos, motivos_atencao: att, oportunidade };
}
