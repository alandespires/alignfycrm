-- Prospecção B2B: hardening aditivo de integridade, rastreabilidade e RLS.
-- Esta migração não altera nem recria as tabelas introduzidas na migração original.

-- Índices únicos compostos permitem FKs que também validam o tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_profiles_id_tenant
  ON public.prospecting_profiles(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_searches_id_tenant
  ON public.prospecting_searches(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_results_id_tenant
  ON public.prospecting_results(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_lists_id_tenant
  ON public.prospecting_lists(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_id_tenant
  ON public.leads(id, tenant_id);

-- Domínios válidos e limites de dados.
ALTER TABLE public.prospecting_results
  ADD CONSTRAINT prospecting_results_score_check
    CHECK (score BETWEEN 0 AND 100) NOT VALID,
  ADD CONSTRAINT prospecting_results_tier_check
    CHECK (tier IN ('excelente', 'bom', 'medio', 'baixo')) NOT VALID,
  ADD CONSTRAINT prospecting_results_confidence_check
    CHECK (confiabilidade IN ('alta', 'media', 'baixa')) NOT VALID,
  ADD CONSTRAINT prospecting_results_status_check
    CHECK (status IN ('novo', 'favorito', 'ignorado', 'invalido', 'importado')) NOT VALID;

ALTER TABLE public.prospecting_searches
  ADD CONSTRAINT prospecting_searches_status_check
    CHECK (status IN ('pendente', 'buscando', 'validando', 'deduplicando', 'analisando', 'calculando', 'pronto', 'parcial', 'erro')) NOT VALID,
  ADD CONSTRAINT prospecting_searches_counters_check
    CHECK (encontrados >= 0 AND qualificados >= 0 AND importados >= 0 AND descartados >= 0) NOT VALID;

ALTER TABLE public.prospecting_score_rules
  ADD CONSTRAINT prospecting_score_rules_limits_check
    CHECK (score_minimo BETWEEN 0 AND 100 AND quantidade_max BETWEEN 1 AND 1000 AND retencao_dias > 0) NOT VALID;

ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_score_check;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_tier_check;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_confidence_check;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_status_check;
ALTER TABLE public.prospecting_searches VALIDATE CONSTRAINT prospecting_searches_status_check;
ALTER TABLE public.prospecting_searches VALIDATE CONSTRAINT prospecting_searches_counters_check;
ALTER TABLE public.prospecting_score_rules VALIDATE CONSTRAINT prospecting_score_rules_limits_check;

-- Metadados estruturados usados pelas próximas fases de dedup e score.
ALTER TABLE public.prospecting_results
  ADD COLUMN IF NOT EXISTS dedup_level text NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS dedup_confidence numeric(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_lead_id uuid,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'nao_validado',
  ADD COLUMN IF NOT EXISTS score_rule_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.prospecting_results
  ADD CONSTRAINT prospecting_results_dedup_level_check
    CHECK (dedup_level IN ('confirmada', 'possivel', 'novo')) NOT VALID,
  ADD CONSTRAINT prospecting_results_dedup_confidence_check
    CHECK (dedup_confidence BETWEEN 0 AND 1) NOT VALID,
  ADD CONSTRAINT prospecting_results_validation_status_check
    CHECK (validation_status IN ('nao_validado', 'formato_valido', 'verificado', 'duvidoso', 'invalido')) NOT VALID;

ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_dedup_level_check;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_dedup_confidence_check;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_validation_status_check;

-- Rastreabilidade da origem dentro do lead.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS prospecting_result_id uuid,
  ADD COLUMN IF NOT EXISTS prospecting_search_id uuid,
  ADD COLUMN IF NOT EXISTS prospecting_score int,
  ADD COLUMN IF NOT EXISTS prospecting_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prospecting_source text;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_prospecting_score_check
    CHECK (prospecting_score IS NULL OR prospecting_score BETWEEN 0 AND 100) NOT VALID;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_prospecting_score_check;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_prospecting_result
  ON public.leads(prospecting_result_id)
  WHERE prospecting_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_prospecting_search
  ON public.leads(tenant_id, prospecting_search_id);

-- Chave de idempotência por tenant para importações repetidas.
ALTER TABLE public.prospecting_import_logs
  ADD COLUMN IF NOT EXISTS request_key text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_import_request
  ON public.prospecting_import_logs(tenant_id, request_key)
  WHERE request_key IS NOT NULL;

-- Índices de leitura usados pela página e pelos workers.
CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_status_created
  ON public.prospecting_results(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_segment
  ON public.prospecting_results(tenant_id, segmento);
CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_favorite
  ON public.prospecting_results(tenant_id, favorito, created_at DESC)
  WHERE favorito = true;
CREATE INDEX IF NOT EXISTS idx_prospecting_searches_tenant_status
  ON public.prospecting_searches(tenant_id, status, created_at DESC);

-- FKs compostas impedem relações entre tenants distintos.
ALTER TABLE public.prospecting_searches
  ADD CONSTRAINT prospecting_searches_profile_tenant_fkey
  FOREIGN KEY (profile_id, tenant_id)
  REFERENCES public.prospecting_profiles(id, tenant_id)
  NOT VALID;

ALTER TABLE public.prospecting_results
  ADD CONSTRAINT prospecting_results_matched_lead_fkey
  FOREIGN KEY (matched_lead_id)
  REFERENCES public.leads(id)
  ON DELETE SET NULL NOT VALID,
  ADD CONSTRAINT prospecting_results_search_tenant_fkey
  FOREIGN KEY (search_id, tenant_id)
  REFERENCES public.prospecting_searches(id, tenant_id)
  ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT prospecting_results_imported_lead_tenant_fkey
  FOREIGN KEY (imported_lead_id, tenant_id)
  REFERENCES public.leads(id, tenant_id)
  NOT VALID,
  ADD CONSTRAINT prospecting_results_matched_lead_tenant_fkey
  FOREIGN KEY (matched_lead_id, tenant_id)
  REFERENCES public.leads(id, tenant_id)
  NOT VALID;

ALTER TABLE public.prospecting_list_items
  ADD CONSTRAINT prospecting_list_items_list_tenant_fkey
  FOREIGN KEY (list_id, tenant_id)
  REFERENCES public.prospecting_lists(id, tenant_id)
  ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT prospecting_list_items_result_tenant_fkey
  FOREIGN KEY (result_id, tenant_id)
  REFERENCES public.prospecting_results(id, tenant_id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_prospecting_result_fkey
  FOREIGN KEY (prospecting_result_id)
  REFERENCES public.prospecting_results(id)
  ON DELETE SET NULL NOT VALID,
  ADD CONSTRAINT leads_prospecting_search_fkey
  FOREIGN KEY (prospecting_search_id)
  REFERENCES public.prospecting_searches(id)
  ON DELETE SET NULL NOT VALID,
  ADD CONSTRAINT leads_prospecting_result_tenant_fkey
  FOREIGN KEY (prospecting_result_id, tenant_id)
  REFERENCES public.prospecting_results(id, tenant_id)
  NOT VALID,
  ADD CONSTRAINT leads_prospecting_search_tenant_fkey
  FOREIGN KEY (prospecting_search_id, tenant_id)
  REFERENCES public.prospecting_searches(id, tenant_id)
  NOT VALID;

ALTER TABLE public.prospecting_searches VALIDATE CONSTRAINT prospecting_searches_profile_tenant_fkey;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_search_tenant_fkey;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_matched_lead_fkey;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_imported_lead_tenant_fkey;
ALTER TABLE public.prospecting_results VALIDATE CONSTRAINT prospecting_results_matched_lead_tenant_fkey;
ALTER TABLE public.prospecting_list_items VALIDATE CONSTRAINT prospecting_list_items_list_tenant_fkey;
ALTER TABLE public.prospecting_list_items VALIDATE CONSTRAINT prospecting_list_items_result_tenant_fkey;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_prospecting_result_fkey;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_prospecting_search_fkey;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_prospecting_result_tenant_fkey;
ALTER TABLE public.leads VALIDATE CONSTRAINT leads_prospecting_search_tenant_fkey;

-- Identificadores normalizados extensíveis, sem forçar novos campos no cadastro principal.
CREATE TABLE public.lead_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  kind text NOT NULL,
  value text NOT NULL,
  source text NOT NULL DEFAULT 'crm',
  confidence numeric(4,3) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_identifiers_kind_check CHECK (kind IN ('telefone', 'whatsapp', 'email', 'cnpj', 'dominio', 'instagram', 'linkedin', 'nome_endereco')),
  CONSTRAINT lead_identifiers_confidence_check CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT lead_identifiers_lead_tenant_fkey FOREIGN KEY (lead_id, tenant_id)
    REFERENCES public.leads(id, tenant_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, lead_id, kind, value)
);

CREATE INDEX idx_lead_identifiers_lookup
  ON public.lead_identifiers(tenant_id, kind, value);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_identifiers TO authenticated;
GRANT ALL ON public.lead_identifiers TO service_role;
ALTER TABLE public.lead_identifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_identifiers_select ON public.lead_identifiers FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY lead_identifiers_insert ON public.lead_identifiers FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY lead_identifiers_update ON public.lead_identifiers FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY lead_identifiers_delete ON public.lead_identifiers FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- Evidências de validação são append-only para usuários autenticados.
CREATE TABLE public.prospecting_validation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  result_id uuid NOT NULL,
  provider text NOT NULL,
  validation_type text NOT NULL,
  status text NOT NULL,
  confidence numeric(4,3),
  reason text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospecting_validation_logs_status_check CHECK (status IN ('nao_validado', 'formato_valido', 'verificado', 'duvidoso', 'invalido', 'erro')),
  CONSTRAINT prospecting_validation_logs_confidence_check CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CONSTRAINT prospecting_validation_logs_result_tenant_fkey FOREIGN KEY (result_id, tenant_id)
    REFERENCES public.prospecting_results(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_prospecting_validation_logs_result
  ON public.prospecting_validation_logs(tenant_id, result_id, created_at DESC);

GRANT SELECT, INSERT ON public.prospecting_validation_logs TO authenticated;
GRANT ALL ON public.prospecting_validation_logs TO service_role;
ALTER TABLE public.prospecting_validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY prospecting_validation_logs_select ON public.prospecting_validation_logs FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY prospecting_validation_logs_insert ON public.prospecting_validation_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND (validated_by IS NULL OR validated_by = auth.uid()));
