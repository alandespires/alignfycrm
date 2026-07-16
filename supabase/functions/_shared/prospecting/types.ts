export type ProspectingFilters = {
  tipo_lead?: "empresa" | "profissional" | "ambos";
  nicho?: string;
  palavra_chave?: string;
  cidade?: string;
  uf?: string;
  quantidade?: number;
  nota_min?: number;
  reviews_min?: number;
  score_min?: number;
  excluir_cadastrados?: boolean;
  excluir_pesquisas_anteriores?: boolean;
  excluir_invalidos?: boolean;
  sem_site?: boolean;
  sem_whatsapp?: boolean;
  possui_site?: boolean;
  possui_whatsapp?: boolean;
  possui_email?: boolean;
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
  activity_recent?: boolean | null;
  source: string;
  source_ref?: string | null;
  is_demo: boolean;
  raw?: Record<string, unknown>;
};

export interface ProspectingProvider {
  readonly name: string;
  readonly isDemo: boolean;
  search(filters: ProspectingFilters): Promise<RawLead[]>;
}
