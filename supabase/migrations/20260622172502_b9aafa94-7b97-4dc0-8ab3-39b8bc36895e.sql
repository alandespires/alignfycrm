
-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.consultor_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  administrator_id uuid,
  quota_id uuid,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultor_audit_tenant ON public.consultor_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultor_audit_entity ON public.consultor_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_consultor_audit_admin ON public.consultor_audit_logs(administrator_id);
CREATE INDEX IF NOT EXISTS idx_consultor_audit_quota ON public.consultor_audit_logs(quota_id);

GRANT SELECT ON public.consultor_audit_logs TO authenticated;
GRANT ALL ON public.consultor_audit_logs TO service_role;

ALTER TABLE public.consultor_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cal_sel ON public.consultor_audit_logs;
CREATE POLICY cal_sel ON public.consultor_audit_logs FOR SELECT
  USING (public.is_tenant_member(tenant_id, auth.uid()));

-- 2) Generic audit trigger function
CREATE OR REPLACE FUNCTION public.tg_consultor_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_entity uuid;
  v_tenant uuid;
  v_action text;
  v_admin uuid;
  v_quota uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity := (OLD).id;
    v_tenant := (OLD).tenant_id;
    v_old := to_jsonb(OLD);
    v_diff := jsonb_build_object('old', v_old);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity := (NEW).id;
    v_tenant := (NEW).tenant_id;
    v_new := to_jsonb(NEW);
    v_diff := jsonb_build_object('new', v_new);
  ELSE
    v_action := 'update';
    v_entity := (NEW).id;
    v_tenant := (NEW).tenant_id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    -- Only keep changed fields
    SELECT jsonb_object_agg(key, jsonb_build_object('from', v_old->key, 'to', v_new->key))
      INTO v_diff
      FROM jsonb_each(v_new)
      WHERE v_new->key IS DISTINCT FROM v_old->key
        AND key NOT IN ('updated_at');
    IF v_diff IS NULL OR v_diff = '{}'::jsonb THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  -- Extract admin/quota refs depending on table
  IF TG_TABLE_NAME = 'consortium_quotas' THEN
    v_quota := v_entity;
    v_admin := COALESCE((NEW).administrator_id, (OLD).administrator_id);
  ELSIF TG_TABLE_NAME = 'consortium_simulations' THEN
    v_admin := COALESCE((NEW).administrator_id, (OLD).administrator_id);
  ELSIF TG_TABLE_NAME = 'consortium_contemplations' THEN
    v_quota := COALESCE((NEW).quota_id, (OLD).quota_id);
  ELSIF TG_TABLE_NAME = 'consultor_commissions' THEN
    v_quota := COALESCE((NEW).quota_id, (OLD).quota_id);
  END IF;

  INSERT INTO public.consultor_audit_logs
    (tenant_id, entity_type, entity_id, action, actor_id, administrator_id, quota_id, diff)
  VALUES
    (v_tenant, TG_TABLE_NAME, v_entity, v_action, auth.uid(), v_admin, v_quota, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Attach triggers
DROP TRIGGER IF EXISTS tg_audit_quotas ON public.consortium_quotas;
CREATE TRIGGER tg_audit_quotas
  AFTER INSERT OR UPDATE OR DELETE ON public.consortium_quotas
  FOR EACH ROW EXECUTE FUNCTION public.tg_consultor_audit();

DROP TRIGGER IF EXISTS tg_audit_simulations ON public.consortium_simulations;
CREATE TRIGGER tg_audit_simulations
  AFTER INSERT OR UPDATE OR DELETE ON public.consortium_simulations
  FOR EACH ROW EXECUTE FUNCTION public.tg_consultor_audit();

DROP TRIGGER IF EXISTS tg_audit_contemplations ON public.consortium_contemplations;
CREATE TRIGGER tg_audit_contemplations
  AFTER INSERT OR UPDATE OR DELETE ON public.consortium_contemplations
  FOR EACH ROW EXECUTE FUNCTION public.tg_consultor_audit();

DROP TRIGGER IF EXISTS tg_audit_commissions ON public.consultor_commissions;
CREATE TRIGGER tg_audit_commissions
  AFTER INSERT OR UPDATE OR DELETE ON public.consultor_commissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_consultor_audit();

-- 4) Promote alandespires@gmail.com
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'alandespires@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_commercial_roles (user_id, tenant_id, role)
  SELECT v_uid, tu.tenant_id, 'admin'::commercial_role
    FROM public.tenant_users tu
   WHERE tu.user_id = v_uid
  ON CONFLICT DO NOTHING;
END $$;
