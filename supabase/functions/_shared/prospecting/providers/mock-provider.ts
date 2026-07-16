import type { ProspectingFilters, ProspectingProvider, RawLead } from "../types.ts";

const NICHES = [
  "Odontologia",
  "Restaurante",
  "Academia",
  "Advocacia",
  "Contabilidade",
  "Estética",
  "Imobiliária",
  "Loja de Roupas",
  "Pet Shop",
  "Barbearia",
];
const CITIES = [
  { city: "São Paulo", uf: "SP" },
  { city: "Rio de Janeiro", uf: "RJ" },
  { city: "Belo Horizonte", uf: "MG" },
  { city: "Curitiba", uf: "PR" },
  { city: "Porto Alegre", uf: "RS" },
  { city: "Salvador", uf: "BA" },
];

function random<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

export class MockProspectingProvider implements ProspectingProvider {
  readonly name = "mock";
  readonly isDemo = true;

  async search(filters: ProspectingFilters): Promise<RawLead[]> {
    const desired = Math.min(200, Math.max(1, filters.quantidade ?? 30));
    const results: RawLead[] = [];
    let attempt = 0;

    while (results.length < desired && attempt < desired * 8) {
      attempt += 1;
      const niche = filters.nicho?.trim() || random(NICHES);
      const location = filters.cidade
        ? { city: filters.cidade, uf: filters.uf || "SP" }
        : random(CITIES);
      const suffix = `${Date.now().toString(36)}${attempt}`;
      const name = `${niche} ${["Prime", "Center", "Express", "Plus", "Studio", "Casa", "Grupo"][attempt % 7]} ${attempt}`;
      const hasSite = Math.random() < 0.55;
      const hasWhatsapp = Math.random() < 0.75;
      const hasEmail = Math.random() < 0.6;
      const rating = Math.random() < 0.7 ? Number((3 + Math.random() * 2).toFixed(1)) : null;
      const lead: RawLead = {
        nome: name,
        razao_social: `${name} LTDA`,
        segmento: niche,
        descricao: `${niche} localizada em ${location.city}. Dado simulado para demonstração.`,
        cidade: location.city,
        uf: location.uf,
        endereco: `Rua Exemplo, ${100 + attempt}`,
        telefone: `+55 11 9${String(10000000 + attempt).slice(-8)}`,
        whatsapp: hasWhatsapp ? `+55 11 9${String(20000000 + attempt).slice(-8)}` : null,
        email: hasEmail ? `contato@empresa-${suffix}.example.com` : null,
        site: hasSite ? `https://empresa-${suffix}.example.com` : null,
        instagram: Math.random() < 0.65 ? `@empresa_${suffix}` : null,
        rating,
        reviews_count: rating ? Math.floor(Math.random() * 250) : 0,
        activity_recent: Math.random() < 0.7,
        source: this.name,
        source_ref: `mock-${suffix}`,
        is_demo: true,
      };

      if (filters.sem_site && lead.site) continue;
      if (filters.sem_whatsapp && lead.whatsapp) continue;
      if (filters.possui_site && !lead.site) continue;
      if (filters.possui_whatsapp && !lead.whatsapp) continue;
      if (filters.possui_email && !lead.email) continue;
      if (filters.nota_min && (lead.rating ?? 0) < filters.nota_min) continue;
      if (filters.reviews_min && (lead.reviews_count ?? 0) < filters.reviews_min) continue;
      if (
        filters.baixa_presenca_digital &&
        [lead.site, lead.instagram, lead.whatsapp, lead.email].filter(Boolean).length > 1
      )
        continue;
      if (filters.recem_abertas && lead.activity_recent !== true) continue;
      results.push(lead);
    }

    return results;
  }
}
