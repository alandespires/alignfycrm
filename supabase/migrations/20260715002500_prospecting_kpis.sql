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
