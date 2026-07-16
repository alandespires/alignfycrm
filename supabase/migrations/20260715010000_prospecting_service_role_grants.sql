-- A Edge Function consulta leads existentes para deduplicação. RLS é ignorado
-- pelo service_role, mas privilégios SQL explícitos ainda são necessários.
GRANT SELECT ON public.leads TO service_role;
