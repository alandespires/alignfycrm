
-- goals: restrict policies to authenticated
DROP POLICY IF EXISTS goal_select ON public.goals;
DROP POLICY IF EXISTS goal_insert ON public.goals;
DROP POLICY IF EXISTS goal_update ON public.goals;
DROP POLICY IF EXISTS goal_delete ON public.goals;

CREATE POLICY goal_select ON public.goals FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY goal_insert ON public.goals FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY goal_update ON public.goals FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY goal_delete ON public.goals FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- knowledge_versions: restrict to authenticated
DROP POLICY IF EXISTS kv_select ON public.knowledge_versions;
DROP POLICY IF EXISTS kv_insert ON public.knowledge_versions;

CREATE POLICY kv_select ON public.knowledge_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.knowledge_articles ka
    WHERE ka.id = knowledge_versions.article_id
      AND (public.is_tenant_member(ka.tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  ));
CREATE POLICY kv_insert ON public.knowledge_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.knowledge_articles ka
    WHERE ka.id = knowledge_versions.article_id
      AND public.is_tenant_member(ka.tenant_id, auth.uid())
  ));

-- notifications: prevent inserting for other users
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_tenant_member(tenant_id, auth.uid())
  );
