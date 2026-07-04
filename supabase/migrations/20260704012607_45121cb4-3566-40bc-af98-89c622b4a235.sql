
-- 1) Recreate public-role policies as authenticated-only

-- financial_accounts
DROP POLICY IF EXISTS acc_select ON public.financial_accounts;
DROP POLICY IF EXISTS acc_insert ON public.financial_accounts;
DROP POLICY IF EXISTS acc_update ON public.financial_accounts;
DROP POLICY IF EXISTS acc_delete ON public.financial_accounts;
CREATE POLICY acc_select ON public.financial_accounts FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY acc_insert ON public.financial_accounts FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY acc_update ON public.financial_accounts FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY acc_delete ON public.financial_accounts FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id, auth.uid()) OR is_super_admin(auth.uid()));

-- departments
DROP POLICY IF EXISTS dep_select ON public.departments;
DROP POLICY IF EXISTS dep_insert ON public.departments;
DROP POLICY IF EXISTS dep_update ON public.departments;
DROP POLICY IF EXISTS dep_delete ON public.departments;
CREATE POLICY dep_select ON public.departments FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY dep_insert ON public.departments FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY dep_update ON public.departments FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY dep_delete ON public.departments FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id, auth.uid()) OR is_super_admin(auth.uid()));

-- team_members
DROP POLICY IF EXISTS tm_select ON public.team_members;
DROP POLICY IF EXISTS tm_insert ON public.team_members;
DROP POLICY IF EXISTS tm_update ON public.team_members;
DROP POLICY IF EXISTS tm_delete ON public.team_members;
CREATE POLICY tm_select ON public.team_members FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY tm_insert ON public.team_members FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY tm_update ON public.team_members FOR UPDATE TO authenticated USING (is_tenant_admin(tenant_id, auth.uid()) OR is_super_admin(auth.uid()) OR (user_id = auth.uid()));
CREATE POLICY tm_delete ON public.team_members FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id, auth.uid()) OR is_super_admin(auth.uid()));

-- job_openings
DROP POLICY IF EXISTS job_select ON public.job_openings;
DROP POLICY IF EXISTS job_insert ON public.job_openings;
DROP POLICY IF EXISTS job_update ON public.job_openings;
DROP POLICY IF EXISTS job_delete ON public.job_openings;
CREATE POLICY job_select ON public.job_openings FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY job_insert ON public.job_openings FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY job_update ON public.job_openings FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY job_delete ON public.job_openings FOR DELETE TO authenticated USING (is_tenant_admin(tenant_id, auth.uid()) OR is_super_admin(auth.uid()));

-- marketing_calendar_items
DROP POLICY IF EXISTS mci_select ON public.marketing_calendar_items;
DROP POLICY IF EXISTS mci_insert ON public.marketing_calendar_items;
DROP POLICY IF EXISTS mci_update ON public.marketing_calendar_items;
DROP POLICY IF EXISTS mci_delete ON public.marketing_calendar_items;
CREATE POLICY mci_select ON public.marketing_calendar_items FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mci_insert ON public.marketing_calendar_items FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mci_update ON public.marketing_calendar_items FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mci_delete ON public.marketing_calendar_items FOR DELETE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));

-- knowledge_articles
DROP POLICY IF EXISTS ka_select ON public.knowledge_articles;
DROP POLICY IF EXISTS ka_insert ON public.knowledge_articles;
DROP POLICY IF EXISTS ka_update ON public.knowledge_articles;
DROP POLICY IF EXISTS ka_delete ON public.knowledge_articles;
CREATE POLICY ka_select ON public.knowledge_articles FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY ka_insert ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY ka_update ON public.knowledge_articles FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY ka_delete ON public.knowledge_articles FOR DELETE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));

-- knowledge_favorites
DROP POLICY IF EXISTS kf_select ON public.knowledge_favorites;
DROP POLICY IF EXISTS kf_insert ON public.knowledge_favorites;
DROP POLICY IF EXISTS kf_delete ON public.knowledge_favorites;
CREATE POLICY kf_select ON public.knowledge_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY kf_insert ON public.knowledge_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY kf_delete ON public.knowledge_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- marketing_campaigns
DROP POLICY IF EXISTS mkt_select ON public.marketing_campaigns;
DROP POLICY IF EXISTS mkt_insert ON public.marketing_campaigns;
DROP POLICY IF EXISTS mkt_update ON public.marketing_campaigns;
DROP POLICY IF EXISTS mkt_delete ON public.marketing_campaigns;
CREATE POLICY mkt_select ON public.marketing_campaigns FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mkt_insert ON public.marketing_campaigns FOR INSERT TO authenticated WITH CHECK (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mkt_update ON public.marketing_campaigns FOR UPDATE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY mkt_delete ON public.marketing_campaigns FOR DELETE TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));

-- consultor_audit_logs
DROP POLICY IF EXISTS cal_sel ON public.consultor_audit_logs;
CREATE POLICY cal_sel ON public.consultor_audit_logs FOR SELECT TO authenticated USING (is_tenant_member(tenant_id, auth.uid()));

-- 2) school_students self-select — add tenant scoping
DROP POLICY IF EXISTS school_students_self_select ON public.school_students;
CREATE POLICY school_students_self_select ON public.school_students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND is_tenant_member(tenant_id, auth.uid()));

-- 3) storage.objects policies for task-attachments bucket
-- Path convention: {tenant_id}/{taskOrProjectId}/{uuid}.{ext}
DROP POLICY IF EXISTS "task_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;

CREATE POLICY "task_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_tenant_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "task_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.is_tenant_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "task_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_tenant_member((storage.foldername(name))[1]::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.is_tenant_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_tenant_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
