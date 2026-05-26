CREATE TABLE IF NOT EXISTS public.project_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  affected_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  affected_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  affected_leads jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_audit_project ON public.project_audit_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_audit_tenant ON public.project_audit_logs(tenant_id, created_at DESC);

GRANT SELECT, INSERT ON public.project_audit_logs TO authenticated;
GRANT ALL ON public.project_audit_logs TO service_role;

ALTER TABLE public.project_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_tenant"
ON public.project_audit_logs FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "audit_insert_tenant"
ON public.project_audit_logs FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND auth.uid() = user_id);
