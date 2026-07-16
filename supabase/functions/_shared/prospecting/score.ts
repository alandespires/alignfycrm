import type { ProspectingFilters, RawLead } from "./types.ts";
import { extractDomain, isDisposableEmail, normalizeEmail, normalizePhone } from "./normalize.ts";

export const DEFAULT_WEIGHTS: Record<string, number> = {
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

export type ScoreEvidence = {
  criterion: string;
  points: number;
  maxPoints: number;
  status: "presente" | "ausente" | "nao_aplicavel";
  evidence?: string | number | boolean;
};

export function scoreLead(
  raw: RawLead,
  filters: ProspectingFilters,
  customWeights?: Record<string, number>,
) {
  const weights = { ...DEFAULT_WEIGHTS, ...(customWeights ?? {}) };
  const breakdown: ScoreEvidence[] = [];
  const positives: string[] = [];
  const attention: string[] = [];
  let score = 0;

  const apply = (
    criterion: string,
    matches: boolean,
    positive: string,
    warning?: string,
    evidence?: string | number | boolean,
  ) => {
    const maxPoints = Math.max(0, Number(weights[criterion] ?? 0));
    const points = matches ? maxPoints : 0;
    score += points;
    breakdown.push({
      criterion,
      points,
      maxPoints,
      status: matches ? "presente" : "ausente",
      evidence,
    });
    if (matches) positives.push(positive);
    else if (warning) attention.push(warning);
  };

  const phone = normalizePhone(raw.telefone ?? raw.whatsapp);
  const whatsapp = normalizePhone(raw.whatsapp);
  const email = normalizeEmail(raw.email);
  const domain = extractDomain(raw.site);

  apply(
    "telefone",
    !!phone,
    "Telefone com formato válido",
    "Telefone ausente ou com formato inválido",
    phone ?? undefined,
  );
  apply(
    "whatsapp",
    !!whatsapp,
    "WhatsApp informado",
    "Sem WhatsApp identificado",
    whatsapp ?? undefined,
  );
  apply(
    "email",
    !!email && !isDisposableEmail(email),
    "E-mail com formato válido",
    email ? "E-mail possivelmente descartável" : "Sem e-mail identificado",
    email ?? undefined,
  );
  apply("site", !!domain, "Site identificado", "Não possui site identificado", domain ?? undefined);
  apply("instagram", !!raw.instagram, "Instagram informado", undefined, raw.instagram ?? undefined);
  apply("linkedin", !!raw.linkedin, "LinkedIn informado", undefined, raw.linkedin ?? undefined);
  apply(
    "rating",
    (raw.rating ?? 0) >= 4,
    `Boa avaliação (${raw.rating})`,
    raw.rating != null && raw.rating < 3.5 ? `Avaliação baixa (${raw.rating})` : undefined,
    raw.rating ?? undefined,
  );
  apply(
    "reviews",
    (raw.reviews_count ?? 0) >= 30,
    `${raw.reviews_count} avaliações`,
    (raw.reviews_count ?? 0) < 5 ? "Poucas avaliações" : undefined,
    raw.reviews_count ?? 0,
  );

  const completeness = [
    raw.nome,
    raw.telefone,
    raw.email,
    raw.site,
    raw.cidade,
    raw.uf,
    raw.segmento,
  ].filter(Boolean).length;
  apply(
    "completude",
    completeness >= 5,
    "Dados completos",
    completeness <= 3 ? "Dados incompletos" : undefined,
    completeness,
  );
  if (filters.nicho) {
    apply(
      "match_nicho",
      !!raw.segmento?.toLowerCase().includes(filters.nicho.toLowerCase()),
      "Corresponde ao nicho pesquisado",
      "Nicho com baixa correspondência",
      raw.segmento ?? undefined,
    );
  } else {
    breakdown.push({ criterion: "match_nicho", points: 0, maxPoints: 0, status: "nao_aplicavel" });
  }
  if (filters.cidade) {
    apply(
      "match_regiao",
      raw.cidade?.toLowerCase() === filters.cidade.toLowerCase(),
      "Corresponde à região",
      "Região divergente",
      raw.cidade ?? undefined,
    );
  } else {
    breakdown.push({ criterion: "match_regiao", points: 0, maxPoints: 0, status: "nao_aplicavel" });
  }
  apply(
    "atividade",
    raw.activity_recent === true,
    "Sinal recente de atividade",
    raw.activity_recent === false ? "Sem sinal recente de atividade" : undefined,
    raw.activity_recent ?? undefined,
  );

  score = Math.min(100, Math.max(0, Math.round(score)));
  const tier = score >= 85 ? "excelente" : score >= 70 ? "bom" : score >= 50 ? "medio" : "baixo";
  const reliability = phone && (email || domain) ? "media" : phone || email ? "media" : "baixa";

  let opportunity: string | null = null;
  if (!domain && (raw.reviews_count ?? 0) >= 20)
    opportunity =
      "Empresa bem avaliada e sem site identificado — oportunidade para presença digital e captação online.";
  else if (!whatsapp)
    opportunity = "Empresa sem WhatsApp identificado — oportunidade para atendimento digital.";
  else if ((raw.reviews_count ?? 0) < 5 && domain)
    opportunity = "Empresa com pouca prova social — oportunidade para gestão de reputação.";
  else if ((raw.rating ?? 0) >= 4 && !raw.instagram)
    opportunity =
      "Empresa bem avaliada sem Instagram identificado — oportunidade para marketing digital.";

  return { score, tier, reliability, positives, attention, opportunity, breakdown };
}
