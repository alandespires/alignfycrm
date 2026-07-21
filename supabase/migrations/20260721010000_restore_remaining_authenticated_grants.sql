-- RLS policies decide which rows an authenticated user may access, but the
-- PostgreSQL role still needs the matching table privileges before RLS runs.
-- Several feature migrations created policies without granting those base
-- privileges, causing entire modules to fail with `permission denied`.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.appointments,
  public.clients,
  public.clinical_attachments,
  public.clinical_records,
  public.companies,
  public.contacts,
  public.dental_professionals,
  public.financial_commissions,
  public.financial_expenses,
  public.financial_subscriptions,
  public.patients,
  public.plans,
  public.proposals,
  public.school_announcements,
  public.school_assessments,
  public.school_attendance,
  public.school_classes,
  public.school_courses,
  public.school_enrollments,
  public.school_grades,
  public.school_lessons,
  public.school_students,
  public.school_teachers,
  public.subscriptions,
  public.tickets
TO authenticated;

-- These tables intentionally expose only the operations represented by their
-- existing authenticated RLS policies.
GRANT UPDATE ON TABLE public.profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.prospecting_permission_overrides,
  public.tenant_users,
  public.tenants,
  public.user_roles
TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.ticket_messages TO authenticated;

-- `tickets.numero` is generated from this sequence during INSERT.
GRANT USAGE, SELECT ON SEQUENCE public.tickets_numero_seq TO authenticated;

-- Fail the migration if an authenticated/public RLS policy still lacks its
-- corresponding base privilege. This prevents a partial repair from passing.
DO $$
DECLARE
  missing_privileges text;
BEGIN
  WITH policy_privileges AS (
    SELECT
      policy.schemaname,
      policy.tablename,
      required.required_privilege
    FROM pg_policies AS policy
    CROSS JOIN LATERAL unnest(
      CASE
        WHEN policy.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        ELSE ARRAY[policy.cmd]
      END
    ) AS required(required_privilege)
    WHERE policy.schemaname = 'public'
      AND (
        policy.roles @> ARRAY['authenticated']::name[]
        OR policy.roles @> ARRAY['public']::name[]
      )
  )
  SELECT string_agg(
    format('%I.%I:%s', policy.schemaname, policy.tablename, policy.required_privilege),
    ', '
    ORDER BY policy.tablename, policy.required_privilege
  )
  INTO missing_privileges
  FROM policy_privileges AS policy
  LEFT JOIN information_schema.role_table_grants AS grant_info
    ON grant_info.grantee = 'authenticated'
    AND grant_info.table_schema = policy.schemaname
    AND grant_info.table_name = policy.tablename
    AND grant_info.privilege_type = policy.required_privilege
  WHERE grant_info.privilege_type IS NULL;

  IF missing_privileges IS NOT NULL THEN
    RAISE EXCEPTION 'Authenticated RLS policies without table grants: %', missing_privileges;
  END IF;
END;
$$;
