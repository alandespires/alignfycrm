-- O contexto de autenticação precisa ler perfil, papéis e memberships antes de
-- conhecer o tenant ativo. As policies RLS existentes continuam limitando as
-- linhas ao próprio usuário e aos tenants dos quais ele participa.
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.tenant_users TO authenticated;
