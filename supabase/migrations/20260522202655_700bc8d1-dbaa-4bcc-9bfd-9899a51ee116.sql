
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planejado','em_andamento','pausado','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  status public.project_status NOT NULL DEFAULT 'planejado',
  progresso integer NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  prioridade public.task_priority NOT NULL DEFAULT 'media',
  prazo date,
  inicio date,
  concluido_em timestamptz,
  valor_total numeric NOT NULL DEFAULT 0,
  client_id uuid,
  lead_id uuid,
  owner_id uuid,
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  entregas jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}',
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

CREATE POLICY projects_select ON public.projects FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND auth.uid() = created_by);
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(tenant_id, auth.uid()) OR auth.uid() = created_by);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_project ON public.financial_entries(project_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
