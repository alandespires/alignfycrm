// Tipos compartilhados do módulo Prospecção.
export type Tier = "excelente" | "bom" | "medio" | "baixo";
export type Confiabilidade = "alta" | "media" | "baixa";
export type ResultStatus = "novo" | "favorito" | "ignorado" | "invalido" | "importado";

export type ProspectingFilters = {
  tipo_lead?: "empresa" | "profissional" | "ambos";
  nicho?: string;
  palavra_chave?: string;
  cidade?: string;
  uf?: string;
  bairro?: string;
  raio_km?: number;
  quantidade?: number;
  porte?: string[];
  possui_site?: boolean | null;
  possui_telefone?: boolean | null;
  possui_whatsapp?: boolean | null;
  possui_email?: boolean | null;
  possui_instagram?: boolean | null;
  possui_linkedin?: boolean | null;
  possui_avaliacoes?: boolean | null;
  nota_min?: number;
  reviews_min?: number;
  score_min?: number;
  excluir_cadastrados?: boolean;
  excluir_invalidos?: boolean;
  excluir_pesquisas_anteriores?: boolean;
  // intenção
  sem_site?: boolean;
  sem_whatsapp?: boolean;
  baixa_presenca_digital?: boolean;
  recem_abertas?: boolean;
};

export type RawLead = {
  nome: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  segmento?: string | null;
  descricao?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  horario_funcionamento?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  source?: string | null;
  source_ref?: string | null;
  raw?: Record<string, unknown>;
  is_demo?: boolean;
};

export type ProspectingResultRow = {
  id: string;
  tenant_id: string;
  search_id: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento: string | null;
  descricao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  telefone_norm: string | null;
  whatsapp: string | null;
  whatsapp_norm: string | null;
  email: string | null;
  site: string | null;
  site_domain: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  horario_funcionamento: string | null;
  rating: number | null;
  reviews_count: number | null;
  score: number;
  tier: Tier;
  confiabilidade: Confiabilidade;
  motivos_positivos: string[];
  motivos_atencao: string[];
  oportunidade: string | null;
  status: ResultStatus;
  favorito: boolean;
  observacoes: string | null;
  imported_lead_id: string | null;
  imported_at: string | null;
  imported_by?: string | null;
  dedup_level?: "confirmada" | "possivel" | "novo";
  dedup_confidence?: number;
  matched_lead_id?: string | null;
  validation_status?: "nao_validado" | "formato_valido" | "verificado" | "duvidoso" | "invalido";
  score_rule_version?: number;
  score_breakdown?: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    status: string;
    evidence?: string | number | boolean;
  }>;
  source: string | null;
  is_demo: boolean;
  created_at: string;
};

export type ProspectingSearch = {
  id: string;
  tenant_id: string;
  created_by: string;
  profile_id: string | null;
  nome: string | null;
  filtros: ProspectingFilters;
  provedor: string;
  status:
    | "pendente"
    | "buscando"
    | "validando"
    | "deduplicando"
    | "analisando"
    | "calculando"
    | "pronto"
    | "parcial"
    | "erro";
  etapa_atual: string | null;
  erro: string | null;
  encontrados: number;
  qualificados: number;
  importados: number;
  descartados: number;
  custo_estimado: number;
  is_demo: boolean;
  created_at: string;
};
