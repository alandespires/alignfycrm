-- RLS continua responsável pelo isolamento e pelas permissões por tenant.
-- Sem estes privilégios de tabela, usuários autenticados são bloqueados antes
-- mesmo da avaliação das policies e o CRM não consegue listar o lead importado.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
