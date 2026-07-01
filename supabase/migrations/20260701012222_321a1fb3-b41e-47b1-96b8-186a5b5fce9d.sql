
-- =========================================================
-- FASE A: FINANCEIRO — Bancos/Contas + Comprovante
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'banco', -- banco, caixa, cartao, investimento
  banco text,
  agencia text,
  conta text,
  saldo_inicial numeric NOT NULL DEFAULT 0,
  cor text DEFAULT '#A3FF12',
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acc_select" ON public.financial_accounts FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "acc_insert" ON public.financial_accounts FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "acc_update" ON public.financial_accounts FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "acc_delete" ON public.financial_accounts FOR DELETE USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_acc_updated BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS comprovante_url text;
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.financial_expenses ADD COLUMN IF NOT EXISTS comprovante_url text;

-- Storage: reuse task-attachments (bucket já existe). Não criar novo.

-- =========================================================
-- FASE B: EQUIPE — departamentos, colaboradores, vagas
-- =========================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cor text DEFAULT '#A3FF12',
  manager_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dep_select" ON public.departments FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "dep_insert" ON public.departments FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "dep_update" ON public.departments FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "dep_delete" ON public.departments FOR DELETE USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_dep_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- opcional, se for user do sistema
  nome text NOT NULL,
  cargo text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ativo', -- ativo, ferias, afastado, desligado
  email text,
  telefone text,
  salario numeric,
  data_contratacao date,
  data_desligamento date,
  avatar_url text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm_select" ON public.team_members FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "tm_insert" ON public.team_members FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "tm_update" ON public.team_members FOR UPDATE USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "tm_delete" ON public.team_members FOR DELETE USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_tm_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  descricao text,
  requisitos text,
  senioridade text DEFAULT 'pleno',
  status text NOT NULL DEFAULT 'aberta', -- aberta, em_processo, fechada, cancelada
  modalidade text DEFAULT 'clt',
  regime text DEFAULT 'presencial',
  salario_min numeric,
  salario_max numeric,
  vagas int NOT NULL DEFAULT 1,
  candidatos int NOT NULL DEFAULT 0,
  data_abertura date DEFAULT CURRENT_DATE,
  data_fechamento date,
  responsavel_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_select" ON public.job_openings FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "job_insert" ON public.job_openings FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "job_update" ON public.job_openings FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "job_delete" ON public.job_openings FOR DELETE USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_job_updated BEFORE UPDATE ON public.job_openings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- FASE C: MARKETING — calendário editorial
-- =========================================================
CREATE TABLE IF NOT EXISTS public.marketing_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tema text,
  formato text DEFAULT 'post', -- post, video, artigo, email, ads, story
  plataforma text, -- instagram, linkedin, youtube, blog, email
  prioridade text DEFAULT 'media',
  status text NOT NULL DEFAULT 'ideia', -- ideia, planejado, producao, revisao, publicado
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  data_criacao date DEFAULT CURRENT_DATE,
  data_planejada date,
  data_publicacao date,
  conteudo text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_calendar_items TO authenticated;
GRANT ALL ON public.marketing_calendar_items TO service_role;
ALTER TABLE public.marketing_calendar_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mci_select" ON public.marketing_calendar_items FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "mci_insert" ON public.marketing_calendar_items FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "mci_update" ON public.marketing_calendar_items FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "mci_delete" ON public.marketing_calendar_items FOR DELETE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_mci_updated BEFORE UPDATE ON public.marketing_calendar_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Complementa marketing_campaigns com campos que faltam (se não existirem)
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS orcamento numeric;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS resultado_esperado text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS resultado_alcancado text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS roi numeric;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS owner_id uuid;

-- RLS para marketing_campaigns / marketing_emails (só 1 policy hoje = provavelmente frouxo). Adiciona escopo por tenant se ainda não existir.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marketing_campaigns' AND policyname='mkt_select') THEN
    EXECUTE 'CREATE POLICY "mkt_select" ON public.marketing_campaigns FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "mkt_insert" ON public.marketing_campaigns FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "mkt_update" ON public.marketing_campaigns FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "mkt_delete" ON public.marketing_campaigns FOR DELETE USING (public.is_tenant_member(tenant_id, auth.uid()))';
  END IF;
END $$;

-- =========================================================
-- FASE D: METODOLOGIA — favoritos + versões + campos ricos
-- =========================================================
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'media';
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS anexos jsonb DEFAULT '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='knowledge_articles' AND policyname='ka_select') THEN
    EXECUTE 'CREATE POLICY "ka_select" ON public.knowledge_articles FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "ka_insert" ON public.knowledge_articles FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "ka_update" ON public.knowledge_articles FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()))';
    EXECUTE 'CREATE POLICY "ka_delete" ON public.knowledge_articles FOR DELETE USING (public.is_tenant_member(tenant_id, auth.uid()))';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.knowledge_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);
GRANT SELECT, INSERT, DELETE ON public.knowledge_favorites TO authenticated;
GRANT ALL ON public.knowledge_favorites TO service_role;
ALTER TABLE public.knowledge_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kf_select" ON public.knowledge_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "kf_insert" ON public.knowledge_favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "kf_delete" ON public.knowledge_favorites FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  versao int NOT NULL,
  titulo text,
  conteudo text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.knowledge_versions TO authenticated;
GRANT ALL ON public.knowledge_versions TO service_role;
ALTER TABLE public.knowledge_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kv_select" ON public.knowledge_versions FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "kv_insert" ON public.knowledge_versions FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.increment_article_view(_article_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.knowledge_articles SET views_count = COALESCE(views_count,0) + 1 WHERE id = _article_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_article_view(uuid) TO authenticated;

-- =========================================================
-- FASE E: METAS + progresso automático do projeto
-- =========================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  categoria text,
  prioridade text DEFAULT 'media',
  status text NOT NULL DEFAULT 'em_andamento', -- em_andamento, concluida, atrasada, cancelada
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  progresso int NOT NULL DEFAULT 0, -- 0..100
  meta_valor numeric,
  valor_atual numeric,
  data_inicio date DEFAULT CURRENT_DATE,
  prazo date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_select" ON public.goals FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "goal_insert" ON public.goals FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "goal_update" ON public.goals FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "goal_delete" ON public.goals FOR DELETE USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_goal_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Progresso do projeto: garante coluna e recalcula quando tarefas mudam
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS progresso int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_project_progress(_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_done int;
BEGIN
  IF _project_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'concluida')
    INTO v_total, v_done FROM public.tasks WHERE project_id = _project_id;
  UPDATE public.projects
    SET progresso = CASE WHEN v_total > 0 THEN (v_done * 100 / v_total) ELSE 0 END,
        updated_at = now()
    WHERE id = _project_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_task_recalc_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_project_progress(OLD.project_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_project_progress(NEW.project_id);
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    PERFORM public.recalc_project_progress(OLD.project_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_task_recalc_project ON public.tasks;
CREATE TRIGGER trg_task_recalc_project
  AFTER INSERT OR UPDATE OF status, project_id OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_task_recalc_project();
