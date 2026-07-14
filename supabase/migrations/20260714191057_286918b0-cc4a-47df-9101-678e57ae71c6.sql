
-- =========================================================
-- PROSPECÇÃO MODULE
-- =========================================================

-- ---------- prospecting_profiles ----------
CREATE TABLE public.prospecting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  nicho text,
  cidade text,
  uf text,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantidade_padrao int NOT NULL DEFAULT 50,
  score_minimo int NOT NULL DEFAULT 0,
  exclusoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  responsavel_padrao uuid,
  tags_padrao text[],
  funil_padrao text,
  etapa_padrao text,
  ultima_execucao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_profiles TO authenticated;
GRANT ALL ON public.prospecting_profiles TO service_role;
ALTER TABLE public.prospecting_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.prospecting_profiles FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "profiles_insert" ON public.prospecting_profiles FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND created_by = auth.uid());
CREATE POLICY "profiles_update" ON public.prospecting_profiles FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "profiles_delete" ON public.prospecting_profiles FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

CREATE TRIGGER trg_prospecting_profiles_updated BEFORE UPDATE ON public.prospecting_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- prospecting_searches ----------
CREATE TABLE public.prospecting_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  profile_id uuid REFERENCES public.prospecting_profiles(id) ON DELETE SET NULL,
  nome text,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  provedor text NOT NULL DEFAULT 'mock',
  status text NOT NULL DEFAULT 'pendente', -- pendente|buscando|validando|deduplicando|analisando|calculando|pronto|erro
  etapa_atual text,
  erro text,
  encontrados int NOT NULL DEFAULT 0,
  qualificados int NOT NULL DEFAULT 0,
  importados int NOT NULL DEFAULT 0,
  descartados int NOT NULL DEFAULT 0,
  custo_estimado numeric(10,2) NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_searches TO authenticated;
GRANT ALL ON public.prospecting_searches TO service_role;
ALTER TABLE public.prospecting_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "searches_select" ON public.prospecting_searches FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "searches_insert" ON public.prospecting_searches FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND created_by = auth.uid());
CREATE POLICY "searches_update" ON public.prospecting_searches FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "searches_delete" ON public.prospecting_searches FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

CREATE INDEX idx_prospecting_searches_tenant ON public.prospecting_searches(tenant_id, created_at DESC);
CREATE TRIGGER trg_prospecting_searches_updated BEFORE UPDATE ON public.prospecting_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- prospecting_results ----------
CREATE TABLE public.prospecting_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  search_id uuid NOT NULL REFERENCES public.prospecting_searches(id) ON DELETE CASCADE,
  nome text NOT NULL,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  segmento text,
  descricao text,
  endereco text,
  bairro text,
  cidade text,
  uf text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  telefone text,
  telefone_norm text,
  whatsapp text,
  whatsapp_norm text,
  email text,
  site text,
  site_domain text,
  instagram text,
  facebook text,
  linkedin text,
  horario_funcionamento text,
  rating numeric(3,2),
  reviews_count int,
  score int NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'baixo', -- excelente|bom|medio|baixo
  confiabilidade text NOT NULL DEFAULT 'media', -- alta|media|baixa
  motivos_positivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  motivos_atencao jsonb NOT NULL DEFAULT '[]'::jsonb,
  oportunidade text,
  status text NOT NULL DEFAULT 'novo', -- novo|favorito|ignorado|invalido|importado
  favorito boolean NOT NULL DEFAULT false,
  observacoes text,
  imported_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  imported_at timestamptz,
  imported_by uuid,
  source text,
  source_ref text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_results TO authenticated;
GRANT ALL ON public.prospecting_results TO service_role;
ALTER TABLE public.prospecting_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_select" ON public.prospecting_results FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "results_insert" ON public.prospecting_results FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "results_update" ON public.prospecting_results FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "results_delete" ON public.prospecting_results FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

CREATE INDEX idx_prospecting_results_search ON public.prospecting_results(search_id);
CREATE INDEX idx_prospecting_results_tenant_score ON public.prospecting_results(tenant_id, score DESC);
CREATE INDEX idx_prospecting_results_phone ON public.prospecting_results(tenant_id, telefone_norm);
CREATE INDEX idx_prospecting_results_email ON public.prospecting_results(tenant_id, email);
CREATE INDEX idx_prospecting_results_cnpj ON public.prospecting_results(tenant_id, cnpj);
CREATE INDEX idx_prospecting_results_domain ON public.prospecting_results(tenant_id, site_domain);
CREATE INDEX idx_prospecting_results_city ON public.prospecting_results(tenant_id, cidade, uf);

CREATE TRIGGER trg_prospecting_results_updated BEFORE UPDATE ON public.prospecting_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- prospecting_lists ----------
CREATE TABLE public.prospecting_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  responsavel uuid,
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_lists TO authenticated;
GRANT ALL ON public.prospecting_lists TO service_role;
ALTER TABLE public.prospecting_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lists_select" ON public.prospecting_lists FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "lists_insert" ON public.prospecting_lists FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND created_by = auth.uid());
CREATE POLICY "lists_update" ON public.prospecting_lists FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "lists_delete" ON public.prospecting_lists FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

CREATE TRIGGER trg_prospecting_lists_updated BEFORE UPDATE ON public.prospecting_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- prospecting_list_items ----------
CREATE TABLE public.prospecting_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.prospecting_lists(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.prospecting_results(id) ON DELETE CASCADE,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, result_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_list_items TO authenticated;
GRANT ALL ON public.prospecting_list_items TO service_role;
ALTER TABLE public.prospecting_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_items_select" ON public.prospecting_list_items FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "list_items_insert" ON public.prospecting_list_items FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "list_items_delete" ON public.prospecting_list_items FOR DELETE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id));

-- ---------- prospecting_import_logs ----------
CREATE TABLE public.prospecting_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  search_id uuid REFERENCES public.prospecting_searches(id) ON DELETE SET NULL,
  total int NOT NULL DEFAULT 0,
  criados int NOT NULL DEFAULT 0,
  atualizados int NOT NULL DEFAULT 0,
  ignorados int NOT NULL DEFAULT 0,
  falhos int NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prospecting_import_logs TO authenticated;
GRANT ALL ON public.prospecting_import_logs TO service_role;
ALTER TABLE public.prospecting_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_logs_select" ON public.prospecting_import_logs FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) AND (user_id = auth.uid() OR public.is_tenant_admin(tenant_id, auth.uid())));
CREATE POLICY "import_logs_insert" ON public.prospecting_import_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND user_id = auth.uid());

-- ---------- prospecting_score_rules ----------
CREATE TABLE public.prospecting_score_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  pesos jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_minimo int NOT NULL DEFAULT 50,
  quantidade_max int NOT NULL DEFAULT 100,
  retencao_dias int NOT NULL DEFAULT 180,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.prospecting_score_rules TO authenticated;
GRANT ALL ON public.prospecting_score_rules TO service_role;
ALTER TABLE public.prospecting_score_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_rules_select" ON public.prospecting_score_rules FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "score_rules_upsert" ON public.prospecting_score_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
CREATE POLICY "score_rules_update" ON public.prospecting_score_rules FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER trg_prospecting_score_rules_updated BEFORE UPDATE ON public.prospecting_score_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- prospecting_sources ----------
CREATE TABLE public.prospecting_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL, -- google_places, receitaws, mock, etc.
  configurado boolean NOT NULL DEFAULT false,
  limite_mensal int NOT NULL DEFAULT 0,
  usado_mes int NOT NULL DEFAULT 0,
  ultimo_reset date NOT NULL DEFAULT date_trunc('month', now())::date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospecting_sources TO authenticated;
GRANT ALL ON public.prospecting_sources TO service_role;
ALTER TABLE public.prospecting_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_select" ON public.prospecting_sources FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "sources_manage" ON public.prospecting_sources FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER trg_prospecting_sources_updated BEFORE UPDATE ON public.prospecting_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
