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
