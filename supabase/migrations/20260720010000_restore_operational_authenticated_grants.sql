-- RLS policies define which rows are visible, but PostgreSQL privileges still
-- need to allow the authenticated role to reach the tables. Some operational
-- tables were created without those grants, producing `permission denied`
-- before RLS could be evaluated.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.automation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kassia_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kassia_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_commercial_roles TO authenticated;

-- Explicitly keep service operations available without weakening RLS for users.
GRANT ALL ON TABLE public.activities, public.ai_insights, public.automations,
  public.automation_runs, public.deals, public.financial_entries,
  public.financial_payments, public.kassia_conversations, public.kassia_messages,
  public.notifications, public.projects, public.tasks,
  public.user_commercial_roles TO service_role;
