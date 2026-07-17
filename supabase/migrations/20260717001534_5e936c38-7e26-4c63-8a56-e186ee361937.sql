-- Prospecção B2B: hardening aditivo de integridade, rastreabilidade e RLS.
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

ALTER TABLE public.prospecting_import_logs
  ADD COLUMN IF NOT EXISTS request_key text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_import_request
  ON public.prospecting_import_logs(tenant_id, request_key)
  WHERE request_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_status_created
  ON public.prospecting_results(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_segment
  ON public.prospecting_results(tenant_id, segmento);
CREATE INDEX IF NOT EXISTS idx_prospecting_results_tenant_favorite
  ON public.prospecting_results(tenant_id, favorito, created_at DESC)
  WHERE favorito = true;
CREATE INDEX IF NOT EXISTS idx_prospecting_searches_tenant_status
  ON public.prospecting_searches(tenant_id, status, created_at DESC);

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

CREATE OR REPLACE FUNCTION public.import_prospecting_results_internal(
  _tenant_id uuid,
  _user_id uuid,
  _result_ids uuid[],
  _options jsonb DEFAULT '{}'::jsonb,
  _request_key text DEFAULT NULL,
  _allow_demo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.prospecting_results%ROWTYPE;
  v_lead_id uuid;
  v_log_id uuid;
  v_existing jsonb;
  v_response jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_created int := 0;
  v_updated int := 0;
  v_ignored int := 0;
  v_duplicate_strategy text := COALESCE(_options->>'duplicate_strategy', 'ignore');
  v_owner_id uuid := COALESCE(NULLIF(_options->>'owner_id', '')::uuid, _user_id);
  v_score_min int := COALESCE((_options->>'score_min')::int, 0);
  v_require_contact boolean := COALESCE((_options->>'require_contact')::boolean, false);
  v_initial_status public.lead_status := COALESCE(NULLIF(_options->>'initial_stage', '')::public.lead_status, 'novo'::public.lead_status);
  v_extra_tags text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_options->'tags', '[]'::jsonb)));
BEGIN
  IF _tenant_id IS NULL OR _user_id IS NULL THEN RAISE EXCEPTION 'tenant_and_user_required'; END IF;
  IF COALESCE(array_length(_result_ids, 1), 0) = 0 OR array_length(_result_ids, 1) > 500 THEN RAISE EXCEPTION 'invalid_result_count'; END IF;
  IF v_duplicate_strategy NOT IN ('ignore', 'update') THEN RAISE EXCEPTION 'invalid_duplicate_strategy'; END IF;
  IF v_score_min < 0 OR v_score_min > 100 THEN RAISE EXCEPTION 'invalid_score_min'; END IF;
  IF NOT public.can_edit_commercial(_user_id, _tenant_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _request_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(_tenant_id::text || ':' || _request_key, 0));
    SELECT detalhes->'result' INTO v_existing
    FROM public.prospecting_import_logs
    WHERE tenant_id = _tenant_id AND request_key = _request_key AND completed_at IS NOT NULL;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;

  INSERT INTO public.prospecting_import_logs (tenant_id, user_id, total, detalhes, request_key)
  VALUES (_tenant_id, _user_id, 0, jsonb_build_object('options', _options), _request_key)
  RETURNING id INTO v_log_id;

  FOR v_result IN
    SELECT result.* FROM public.prospecting_results result
    WHERE result.tenant_id = _tenant_id AND result.id = ANY(_result_ids)
    ORDER BY result.id FOR UPDATE
  LOOP
    v_total := v_total + 1;
    v_lead_id := NULL;

    IF v_result.status = 'importado' OR v_result.imported_lead_id IS NOT NULL THEN
      v_ignored := v_ignored + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'lead_id', v_result.imported_lead_id, 'status', 'ignorado', 'reason', 'ja_importado'));
      CONTINUE;
    END IF;
    IF v_result.is_demo AND NOT _allow_demo THEN RAISE EXCEPTION 'demo_import_blocked'; END IF;
    IF v_result.score < v_score_min THEN
      v_ignored := v_ignored + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'status', 'ignorado', 'reason', 'score_abaixo_minimo'));
      CONTINUE;
    END IF;
    IF v_require_contact AND v_result.telefone_norm IS NULL AND v_result.whatsapp_norm IS NULL THEN
      v_ignored := v_ignored + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'status', 'ignorado', 'reason', 'sem_telefone_ou_whatsapp'));
      CONTINUE;
    END IF;

    IF v_result.matched_lead_id IS NOT NULL THEN
      SELECT id INTO v_lead_id FROM public.leads
      WHERE tenant_id = _tenant_id AND id = v_result.matched_lead_id FOR UPDATE;
    END IF;

    IF v_lead_id IS NULL THEN
      SELECT lead.id INTO v_lead_id
      FROM public.leads lead
      WHERE lead.tenant_id = _tenant_id AND (
        (v_result.email IS NOT NULL AND lower(trim(lead.email)) = lower(trim(v_result.email))) OR
        (COALESCE(v_result.whatsapp_norm, v_result.telefone_norm) IS NOT NULL AND
          CASE WHEN length(regexp_replace(COALESCE(lead.whatsapp, ''), '\D', '', 'g')) <= 11
            THEN '55' || regexp_replace(COALESCE(lead.whatsapp, ''), '\D', '', 'g')
            ELSE regexp_replace(COALESCE(lead.whatsapp, ''), '\D', '', 'g') END
          = COALESCE(v_result.whatsapp_norm, v_result.telefone_norm))
      )
      ORDER BY lead.created_at LIMIT 1 FOR UPDATE;
    END IF;

    IF v_lead_id IS NULL THEN
      SELECT identifier.lead_id INTO v_lead_id
      FROM public.lead_identifiers identifier
      WHERE identifier.tenant_id = _tenant_id AND (
        (v_result.email IS NOT NULL AND identifier.kind = 'email' AND identifier.value = lower(v_result.email)) OR
        (v_result.whatsapp_norm IS NOT NULL AND identifier.kind IN ('telefone', 'whatsapp') AND identifier.value = v_result.whatsapp_norm) OR
        (v_result.telefone_norm IS NOT NULL AND identifier.kind IN ('telefone', 'whatsapp') AND identifier.value = v_result.telefone_norm) OR
        (v_result.site_domain IS NOT NULL AND identifier.kind = 'dominio' AND identifier.value = v_result.site_domain) OR
        (v_result.cnpj IS NOT NULL AND identifier.kind = 'cnpj' AND identifier.value = regexp_replace(v_result.cnpj, '\D', '', 'g'))
      ) ORDER BY identifier.created_at LIMIT 1;
    END IF;

    IF v_lead_id IS NOT NULL AND v_duplicate_strategy = 'ignore' THEN
      v_ignored := v_ignored + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'lead_id', v_lead_id, 'status', 'duplicado', 'reason', 'cadastro_existente'));
      CONTINUE;
    END IF;

    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads SET
        email = COALESCE(NULLIF(v_result.email, ''), email),
        whatsapp = COALESCE(NULLIF(v_result.whatsapp, ''), NULLIF(v_result.telefone, ''), whatsapp),
        empresa = COALESCE(NULLIF(v_result.razao_social, ''), NULLIF(v_result.nome_fantasia, ''), empresa),
        interesse = COALESCE(NULLIF(v_result.segmento, ''), interesse),
        observacoes = concat_ws(E'\n\n', NULLIF(observacoes, ''), NULLIF(_options->>'observation', ''), NULLIF(v_result.oportunidade, '')),
        owner_id = v_owner_id,
        tags = ARRAY(SELECT DISTINCT tag FROM unnest(COALESCE(tags, '{}'::text[]) || ARRAY[v_result.tier, 'prospeccao'] || v_extra_tags) tag WHERE tag IS NOT NULL AND tag <> ''),
        ai_score = v_result.score,
        ai_resumo = concat_ws(E'\n', array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_result.motivos_positivos)), '; '), array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_result.motivos_atencao)), '; ')),
        ai_sugestao = v_result.oportunidade,
        prospecting_result_id = v_result.id,
        prospecting_search_id = v_result.search_id,
        prospecting_score = v_result.score,
        prospecting_reasons = jsonb_build_object('positivos', v_result.motivos_positivos, 'atencao', v_result.motivos_atencao),
        prospecting_source = v_result.source,
        updated_at = now()
      WHERE tenant_id = _tenant_id AND id = v_lead_id;
      v_updated := v_updated + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'lead_id', v_lead_id, 'status', 'atualizado'));
    ELSE
      INSERT INTO public.leads (
        tenant_id, created_by, owner_id, nome, empresa, email, whatsapp, origem, interesse,
        observacoes, status, tags, ai_score, ai_resumo, ai_sugestao, prospecting_result_id,
        prospecting_search_id, prospecting_score, prospecting_reasons, prospecting_source
      ) VALUES (
        _tenant_id, _user_id, v_owner_id, v_result.nome, COALESCE(v_result.razao_social, v_result.nome_fantasia, v_result.nome),
        v_result.email, COALESCE(v_result.whatsapp, v_result.telefone), 'Prospecção B2B', v_result.segmento,
        concat_ws(E'\n\n', NULLIF(_options->>'observation', ''), NULLIF(v_result.oportunidade, ''), NULLIF(v_result.descricao, '')),
        v_initial_status, ARRAY(SELECT DISTINCT tag FROM unnest(ARRAY[v_result.tier, 'prospeccao'] || v_extra_tags) tag WHERE tag IS NOT NULL AND tag <> ''),
        v_result.score, concat_ws(E'\n', array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_result.motivos_positivos)), '; '), array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_result.motivos_atencao)), '; ')),
        v_result.oportunidade, v_result.id, v_result.search_id, v_result.score,
        jsonb_build_object('positivos', v_result.motivos_positivos, 'atencao', v_result.motivos_atencao), v_result.source
      ) RETURNING id INTO v_lead_id;
      v_created := v_created + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('result_id', v_result.id, 'lead_id', v_lead_id, 'status', 'criado'));
    END IF;

    INSERT INTO public.lead_identifiers (tenant_id, lead_id, kind, value, source, confidence)
    SELECT _tenant_id, v_lead_id, identity.kind, identity.value, COALESCE(v_result.source, 'prospeccao'), identity.confidence
    FROM (VALUES
      ('telefone', v_result.telefone_norm, 0.5::numeric), ('whatsapp', v_result.whatsapp_norm, 0.5::numeric),
      ('email', v_result.email, 0.5::numeric),
      ('cnpj', CASE WHEN v_result.cnpj IS NULL THEN NULL ELSE regexp_replace(v_result.cnpj, '\D', '', 'g') END, 0.7::numeric),
      ('dominio', v_result.site_domain, 0.7::numeric)
    ) AS identity(kind, value, confidence)
    WHERE identity.value IS NOT NULL AND identity.value <> ''
    ON CONFLICT (tenant_id, lead_id, kind, value) DO NOTHING;

    UPDATE public.prospecting_results
    SET status = 'importado', imported_lead_id = v_lead_id, imported_at = now(), imported_by = _user_id
    WHERE tenant_id = _tenant_id AND id = v_result.id;
  END LOOP;

  UPDATE public.prospecting_searches search SET importados = (
    SELECT count(*) FROM public.prospecting_results result
    WHERE result.tenant_id = _tenant_id AND result.search_id = search.id AND result.status = 'importado'
  ) WHERE search.tenant_id = _tenant_id AND search.id IN (
    SELECT DISTINCT result.search_id FROM public.prospecting_results result
    WHERE result.tenant_id = _tenant_id AND result.id = ANY(_result_ids)
  );

  v_response := jsonb_build_object('total', v_total, 'criados', v_created, 'atualizados', v_updated, 'ignorados', v_ignored, 'falhos', 0, 'items', v_items);
  UPDATE public.prospecting_import_logs SET
    search_id = (SELECT result.search_id FROM public.prospecting_results result WHERE result.tenant_id = _tenant_id AND result.id = ANY(_result_ids) ORDER BY result.created_at LIMIT 1),
    total = v_total, criados = v_created, atualizados = v_updated, ignorados = v_ignored, falhos = 0,
    detalhes = jsonb_build_object('options', _options, 'result', v_response), completed_at = now()
  WHERE id = v_log_id;
  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.import_prospecting_results_internal(uuid, uuid, uuid[], jsonb, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_prospecting_results_internal(uuid, uuid, uuid[], jsonb, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.import_prospecting_results_internal(uuid, uuid, uuid[], jsonb, text, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.get_prospecting_kpis(_tenant_id uuid, _days int DEFAULT 30)
RETURNS TABLE (
  encontrados bigint,
  qualificados bigint,
  importados bigint,
  descartados bigint,
  pesquisas bigint,
  taxa_qualificacao numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH searches AS (
    SELECT * FROM public.prospecting_searches
    WHERE tenant_id = _tenant_id
      AND created_at >= now() - make_interval(days => LEAST(GREATEST(_days, 1), 365))
  )
  SELECT
    COALESCE(sum(encontrados), 0)::bigint,
    COALESCE(sum(qualificados), 0)::bigint,
    COALESCE(sum(importados), 0)::bigint,
    COALESCE(sum(descartados), 0)::bigint,
    count(*)::bigint,
    CASE WHEN COALESCE(sum(encontrados), 0) = 0 THEN 0
      ELSE round((sum(qualificados)::numeric / sum(encontrados)::numeric) * 100, 1)
    END
  FROM searches
  WHERE public.is_tenant_member(_tenant_id, auth.uid()) OR public.is_super_admin(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_prospecting_kpis(uuid, int) TO authenticated;

CREATE TABLE public.prospecting_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospecting_permission_name_check CHECK (permission IN (
    'view', 'search', 'import', 'export', 'delete_search', 'manage_profiles',
    'manage_lists', 'manage_providers', 'manage_score', 'view_costs'
  )),
  UNIQUE (tenant_id, user_id, permission)
);

ALTER TABLE public.prospecting_permission_overrides ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.prospecting_permission_overrides TO authenticated;
GRANT ALL ON public.prospecting_permission_overrides TO service_role;

CREATE POLICY prospecting_permission_overrides_select
  ON public.prospecting_permission_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_prospecting_permission(
  _user_id uuid,
  _tenant_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override boolean;
  v_role public.commercial_role;
BEGIN
  IF _permission NOT IN ('view', 'search', 'import', 'export', 'delete_search', 'manage_profiles', 'manage_lists', 'manage_providers', 'manage_score', 'view_costs') THEN
    RETURN false;
  END IF;
  IF public.is_super_admin(_user_id) OR public.is_tenant_admin(_tenant_id, _user_id) THEN RETURN true; END IF;
  IF NOT public.is_tenant_member(_tenant_id, _user_id) THEN RETURN false; END IF;

  SELECT allowed INTO v_override FROM public.prospecting_permission_overrides
  WHERE tenant_id = _tenant_id AND user_id = _user_id AND permission = _permission;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  SELECT role INTO v_role FROM public.user_commercial_roles
  WHERE tenant_id = _tenant_id AND user_id = _user_id;
  IF v_role = 'admin' THEN RETURN true; END IF;
  IF v_role = 'comercial' THEN
    RETURN _permission IN ('view', 'search', 'import', 'export', 'manage_profiles', 'manage_lists');
  END IF;
  RETURN _permission = 'view';
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_prospecting_permission(uuid, uuid, text) TO authenticated, service_role;

CREATE TRIGGER trg_prospecting_permission_overrides_updated
  BEFORE UPDATE ON public.prospecting_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY prospecting_permission_overrides_manage
  ON public.prospecting_permission_overrides FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));

GRANT SELECT ON public.leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.tenant_users TO authenticated;