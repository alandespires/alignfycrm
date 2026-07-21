-- Repair double-decoded UTF-8 conservatively and keep Demo data out of production KPIs.
CREATE OR REPLACE FUNCTION public.repair_utf8_mojibake(_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  repaired text;
BEGIN
  IF _value !~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;

  BEGIN
    repaired := convert_from(convert_to(_value, 'WIN1252'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN _value;
  END;

  IF repaired ~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;
  RETURN repaired;
END;
$$;

UPDATE public.leads
SET
  nome = public.repair_utf8_mojibake(nome),
  empresa = public.repair_utf8_mojibake(empresa),
  origem = public.repair_utf8_mojibake(origem),
  interesse = public.repair_utf8_mojibake(interesse),
  observacoes = public.repair_utf8_mojibake(observacoes)
WHERE concat_ws(' ', nome, empresa, origem, interesse, observacoes) ~ '(Ã.|Â.|â.)';

UPDATE public.notifications
SET
  titulo = public.repair_utf8_mojibake(titulo),
  descricao = public.repair_utf8_mojibake(descricao)
WHERE concat_ws(' ', titulo, descricao) ~ '(Ã.|Â.|â.)';

UPDATE public.prospecting_results
SET
  nome = public.repair_utf8_mojibake(nome),
  razao_social = public.repair_utf8_mojibake(razao_social),
  nome_fantasia = public.repair_utf8_mojibake(nome_fantasia),
  segmento = public.repair_utf8_mojibake(segmento),
  descricao = public.repair_utf8_mojibake(descricao),
  endereco = public.repair_utf8_mojibake(endereco),
  bairro = public.repair_utf8_mojibake(bairro),
  cidade = public.repair_utf8_mojibake(cidade),
  oportunidade = public.repair_utf8_mojibake(oportunidade)
WHERE concat_ws(' ', nome, razao_social, nome_fantasia, segmento, descricao, endereco, bairro, cidade, oportunidade) ~ '(Ã.|Â.|â.)';

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
      AND is_demo = false
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
