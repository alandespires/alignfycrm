-- Importação de prospecção executada em uma única transação.
-- A função é privada ao service_role; autenticação e ambiente demo são validados na Edge Function.

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
