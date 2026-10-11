CREATE TABLE public.user_module_restrictions (
 user_id uuid NOT NULL,
 module text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, module)
);
GRANT SELECT ON public.user_module_restrictions TO authenticated;
GRANT ALL ON public.user_module_restrictions TO service_role;
ALTER TABLE public.user_module_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_own_module_restrictions ON public.user_module_restrictions FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.user_module_restrictions(user_id,module) SELECT id,'consultor' FROM auth.users WHERE lower(email)='alandespires@gmail.com';
CREATE FUNCTION public.has_module_access(_module text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_module_restrictions WHERE user_id=auth.uid() AND module=_module);
$$;
REVOKE ALL ON FUNCTION public.has_module_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_module_access(text) TO authenticated, service_role;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['consortium_administrators','consortium_groups','consortium_quotas','consortium_simulations','consortium_contemplations','consultor_commissions','consultor_audit_logs','credit_products','credit_simulations'] LOOP
 EXECUTE format('CREATE POLICY consultor_module_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_module_access(''consultor'')) WITH CHECK (public.has_module_access(''consultor''))',tbl);
 END LOOP;
END $$;