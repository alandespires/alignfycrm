import type { RawLead } from "./types.ts";
import {
  extractDomain,
  normalizeCnpj,
  normalizeEmail,
  normalizePhone,
  normalizeSocial,
  normalizeText,
} from "./normalize.ts";

export type ExistingLead = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  whatsapp: string | null;
  identifiers?: Array<{ kind: string; value: string }>;
};

export type DedupResult = {
  level: "confirmada" | "possivel" | "novo";
  confidence: number;
  matchedLeadId: string | null;
  reasons: string[];
};

function identityMap(raw: RawLead): Record<string, string | null> {
  return {
    telefone: normalizePhone(raw.telefone),
    whatsapp: normalizePhone(raw.whatsapp),
    email: normalizeEmail(raw.email),
    cnpj: normalizeCnpj(raw.cnpj),
    dominio: extractDomain(raw.site),
    instagram: normalizeSocial(raw.instagram),
    linkedin: normalizeSocial(raw.linkedin),
  };
}

export function deduplicate(raw: RawLead, existing: ExistingLead[]): DedupResult {
  const identities = identityMap(raw);
  const rawName = normalizeText(raw.razao_social ?? raw.nome_fantasia ?? raw.nome);

  for (const lead of existing) {
    const known = new Map<string, Set<string>>();
    const add = (kind: string, value?: string | null) => {
      if (!value) return;
      const values = known.get(kind) ?? new Set<string>();
      values.add(value);
      known.set(kind, values);
    };
    add("whatsapp", normalizePhone(lead.whatsapp));
    add("telefone", normalizePhone(lead.whatsapp));
    add("email", normalizeEmail(lead.email));
    for (const identifier of lead.identifiers ?? []) add(identifier.kind, identifier.value);

    const exactReasons: string[] = [];
    for (const [kind, value] of Object.entries(identities)) {
      if (value && known.get(kind)?.has(value)) exactReasons.push(`${kind} idêntico`);
    }
    if (exactReasons.length) {
      return {
        level: "confirmada",
        confidence: 0.99,
        matchedLeadId: lead.id,
        reasons: exactReasons,
      };
    }

    const leadName = normalizeText(lead.empresa ?? lead.nome);
    if (
      rawName &&
      leadName &&
      (rawName === leadName || rawName.includes(leadName) || leadName.includes(rawName))
    ) {
      return {
        level: "possivel",
        confidence: rawName === leadName ? 0.82 : 0.68,
        matchedLeadId: lead.id,
        reasons: ["nome empresarial semelhante"],
      };
    }
  }

  return { level: "novo", confidence: 0, matchedLeadId: null, reasons: [] };
}

export function batchFingerprint(raw: RawLead): string[] {
  const identities = identityMap(raw);
  return Object.entries(identities)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([kind, value]) => `${kind}:${value}`);
}
