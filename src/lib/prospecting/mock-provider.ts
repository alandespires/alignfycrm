// Provider MOCK — usado quando nenhuma chave de API real está configurada.
// Todos os resultados são marcados com is_demo=true e não podem ser importados em produção.
import type { RawLead, ProspectingFilters } from "./types";

const NICHOS = ["Odontologia", "Restaurante", "Academia", "Advocacia", "Contabilidade", "Estética", "Imobiliária", "Loja de Roupas", "Pet Shop", "Barbearia"];
const CIDADES = [
  { c: "São Paulo", u: "SP" }, { c: "Rio de Janeiro", u: "RJ" }, { c: "Belo Horizonte", u: "MG" },
  { c: "Curitiba", u: "PR" }, { c: "Porto Alegre", u: "RS" }, { c: "Salvador", u: "BA" },
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p: number): boolean { return Math.random() < p; }

let counter = 1;

export function mockSearch(filters: ProspectingFilters): RawLead[] {
  const qtd = Math.min(200, Math.max(1, filters.quantidade ?? 30));
  const results: RawLead[] = [];
  for (let i = 0; i < qtd; i++) {
    const nicho = filters.nicho || rand(NICHOS);
    const cid = filters.cidade ? { c: filters.cidade, u: filters.uf ?? "SP" } : rand(CIDADES);
    const n = counter++;
    const nomeBase = `${nicho} ${["Prime", "Center", "Express", "Plus", "Studio", "Casa", "Grupo"][n % 7]} ${n}`;
    const temSite = chance(0.55);
    const temInsta = chance(0.65);
    const temWa = chance(0.75);
    const temEmail = chance(0.6);
    const rating = chance(0.7) ? +(3 + Math.random() * 2).toFixed(1) : null;
    const reviews = rating ? Math.floor(Math.random() * 250) : 0;
    results.push({
      nome: nomeBase,
      razao_social: `${nomeBase} LTDA`,
      cnpj: null,
      segmento: nicho,
      descricao: `${nicho} localizada em ${cid.c}. Dados simulados para demonstração.`,
      cidade: cid.c,
      uf: cid.u,
      endereco: `Rua Exemplo, ${100 + n}`,
      telefone: `+55 ${11 + (n % 20)} 9${String(1000 + n).slice(0, 4)}-${String(1000 + n * 3).slice(0, 4)}`,
      whatsapp: temWa ? `+55 ${11 + (n % 20)} 9${String(2000 + n).slice(0, 4)}-${String(1000 + n * 3).slice(0, 4)}` : null,
      email: temEmail ? `contato${n}@${nomeBase.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br` : null,
      site: temSite ? `https://${nomeBase.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br` : null,
      instagram: temInsta ? `@${nomeBase.toLowerCase().replace(/[^a-z0-9]/g, "")}` : null,
      facebook: null,
      linkedin: null,
      rating,
      reviews_count: reviews,
      source: "mock",
      source_ref: `mock-${n}`,
      is_demo: true,
    });
  }
  // Aplica filtros básicos
  return results.filter((r) => {
    if (filters.sem_site && r.site) return false;
    if (filters.sem_whatsapp && r.whatsapp) return false;
    if (filters.possui_whatsapp === true && !r.whatsapp) return false;
    if (filters.possui_email === true && !r.email) return false;
    if (filters.possui_site === true && !r.site) return false;
    if (filters.nota_min && (r.rating ?? 0) < filters.nota_min) return false;
    if (filters.reviews_min && (r.reviews_count ?? 0) < filters.reviews_min) return false;
    return true;
  });
}

export function isRealProviderConfigured(): boolean {
  // No client-side não sabemos as chaves; assume demo por padrão.
  return false;
}
