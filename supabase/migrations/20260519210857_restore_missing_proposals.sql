-- A tabela existe no schema remoto/tipos gerados, mas sua migration de criação
-- não veio no histórico original. Esta restauração aditiva permite reconstruir
-- o banco do zero sem alterar ambientes nos quais a tabela já existe.
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  valor numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'enviada', 'visualizada', 'aceita', 'recusada', 'expirada')
  ),
  validade date,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  url_pdf text,
  token_aceite uuid UNIQUE DEFAULT gen_random_uuid(),
  visualizada_em timestamptz,
  aceita_em timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proposals_tenant_created
  ON public.proposals (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.proposals (lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON public.proposals (client_id);

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
