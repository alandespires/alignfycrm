
-- 1. AI insights: allow tenant admins and super admins to delete
CREATE POLICY "insights_admin_delete" ON public.ai_insights
  FOR DELETE TO authenticated
  USING (
    public.is_tenant_admin(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 2. Clinical attachments: allow creator or tenant admin to update
CREATE POLICY "ca_update" ON public.clinical_attachments
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_tenant_admin(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_tenant_admin(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- 3. Realtime authorization: restrict channel subscriptions to authenticated
--    users whose channel topic matches a tenant they belong to.
--    Topic convention: "tenant:<tenant_uuid>" (clients must use this naming).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_tenant_realtime_read" ON realtime.messages;
CREATE POLICY "authenticated_tenant_realtime_read"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'tenant:%'
    AND public.is_tenant_member(
      substring(realtime.topic() from 8)::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "authenticated_tenant_realtime_write" ON realtime.messages;
CREATE POLICY "authenticated_tenant_realtime_write"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'tenant:%'
    AND public.is_tenant_member(
      substring(realtime.topic() from 8)::uuid,
      auth.uid()
    )
  );
