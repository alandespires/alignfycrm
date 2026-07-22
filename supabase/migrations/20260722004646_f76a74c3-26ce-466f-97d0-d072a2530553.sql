
-- =========================================================================
-- RECONCILIAÇÃO — commit 288d559 (8 migrations)
-- Toda a lógica é idempotente e roda numa única transação.
-- =========================================================================

-- Garantir a função utilitária compartilhada (usada pelos triggers abaixo).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------------
-- 20260519210857 — proposals (tabela já existe; garante índices/trigger/grants)
-- -------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_created ON public.proposals (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON public.proposals (lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON public.proposals (client_id);
DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 20260701012220 — knowledge_articles (tabela já existe)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  slug text NOT NULL,
  categoria text,
  conteudo text,
  publico boolean DEFAULT false,
  visualizacoes integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tenant_created ON public.knowledge_articles (tenant_id, created_at DESC);
DROP TRIGGER IF EXISTS trg_knowledge_articles_updated_at ON public.knowledge_articles;
CREATE TRIGGER trg_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 20260701012221 — marketing_campaigns (tabela já existe)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'rascunho',
  inicio date,
  fim date,
  metadata jsonb DEFAULT '{}'::jsonb,
  objetivo text,
  plataforma text,
  data_inicio date,
  data_fim date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant_created ON public.marketing_campaigns (tenant_id, created_at DESC);
DROP TRIGGER IF EXISTS trg_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 20260720010000 — grants operacionais para authenticated / service_role
-- -------------------------------------------------------------------------
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
GRANT ALL ON TABLE public.activities, public.ai_insights, public.automations,
  public.automation_runs, public.deals, public.financial_entries,
  public.financial_payments, public.kassia_conversations, public.kassia_messages,
  public.notifications, public.projects, public.tasks,
  public.user_commercial_roles TO service_role;

-- -------------------------------------------------------------------------
-- 20260720011000 — tenant_settings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  sales jsonb NOT NULL DEFAULT '{}'::jsonb,
  marketing jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select ON public.tenant_settings;
CREATE POLICY tenant_settings_select ON public.tenant_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));

DROP POLICY IF EXISTS tenant_settings_insert ON public.tenant_settings;
CREATE POLICY tenant_settings_insert ON public.tenant_settings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    (public.is_tenant_admin(tenant_id, auth.uid()) AND updated_by = auth.uid())
  );

DROP POLICY IF EXISTS tenant_settings_update ON public.tenant_settings;
CREATE POLICY tenant_settings_update ON public.tenant_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    (public.is_tenant_admin(tenant_id, auth.uid()) AND updated_by = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON TABLE public.tenant_settings TO authenticated;
GRANT ALL ON TABLE public.tenant_settings TO service_role;

CREATE OR REPLACE FUNCTION public.touch_tenant_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_settings_updated_at ON public.tenant_settings;
CREATE TRIGGER trg_tenant_settings_updated_at
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_tenant_settings_updated_at();

-- -------------------------------------------------------------------------
-- 20260720012000 — WhatsApp governance
-- -------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_consent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_last_contact_at timestamptz;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_whatsapp_consent_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_whatsapp_consent_status_check
  CHECK (whatsapp_consent_status IN ('unknown', 'granted', 'revoked'));

CREATE TABLE IF NOT EXISTS public.whatsapp_contact_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('authorized', 'blocked')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_attempts_lead_created
  ON public.whatsapp_contact_attempts(lead_id, created_at DESC);

ALTER TABLE public.whatsapp_contact_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_attempts_select ON public.whatsapp_contact_attempts;
CREATE POLICY whatsapp_attempts_select ON public.whatsapp_contact_attempts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));

GRANT SELECT ON TABLE public.whatsapp_contact_attempts TO authenticated;
GRANT ALL ON TABLE public.whatsapp_contact_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.authorize_whatsapp_contact(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _recent_count integer;
  _reason text;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND OR NOT public.is_tenant_member(_lead.tenant_id, auth.uid()) THEN
    RAISE EXCEPTION 'Lead não encontrado ou acesso negado';
  END IF;

  IF coalesce(regexp_replace(_lead.whatsapp, '\D', '', 'g'), '') = '' THEN
    _reason := 'Número de WhatsApp ausente';
  ELSIF _lead.whatsapp_consent_status <> 'granted' THEN
    _reason := CASE WHEN _lead.whatsapp_consent_status = 'revoked'
      THEN 'O contato revogou o consentimento'
      ELSE 'Consentimento de WhatsApp não registrado' END;
  ELSIF _lead.whatsapp_consent_at IS NULL OR _lead.whatsapp_consent_source IS NULL THEN
    _reason := 'Origem e data do consentimento são obrigatórias';
  END IF;

  IF _reason IS NOT NULL THEN
    INSERT INTO public.whatsapp_contact_attempts(tenant_id, lead_id, user_id, decision, reason)
    VALUES (_lead.tenant_id, _lead.id, auth.uid(), 'blocked', _reason);
    RETURN jsonb_build_object('allowed', false, 'reason', _reason);
  END IF;

  SELECT count(*) INTO _recent_count
  FROM public.whatsapp_contact_attempts
  WHERE lead_id = _lead.id AND decision = 'authorized' AND created_at >= now() - interval '24 hours';

  IF _recent_count >= 3 THEN
    _reason := 'Limite de 3 tentativas em 24 horas atingido';
  ELSIF _lead.whatsapp_last_contact_at IS NOT NULL
    AND _lead.whatsapp_last_contact_at > now() - interval '4 hours' THEN
    _reason := 'Aguarde 4 horas antes de um novo contato';
  END IF;

  IF _reason IS NOT NULL THEN
    INSERT INTO public.whatsapp_contact_attempts(tenant_id, lead_id, user_id, decision, reason)
    VALUES (_lead.tenant_id, _lead.id, auth.uid(), 'blocked', _reason);
    RETURN jsonb_build_object('allowed', false, 'reason', _reason);
  END IF;

  INSERT INTO public.whatsapp_contact_attempts(tenant_id, lead_id, user_id, decision, reason)
  VALUES (_lead.tenant_id, _lead.id, auth.uid(), 'authorized', 'Consentimento e cadência validados');

  UPDATE public.leads SET whatsapp_last_contact_at = now() WHERE id = _lead.id;

  RETURN jsonb_build_object(
    'allowed', true,
    'phone', regexp_replace(_lead.whatsapp, '\D', '', 'g')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_whatsapp_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_whatsapp_contact(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 20260720233000 — UTF-8 repair + real prospecting KPIs
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_utf8_mojibake(_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  repaired text;
BEGIN
  IF _value !~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;
  BEGIN
    repaired := convert_from(convert_to(_value, 'WIN1252'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN _value;
  END;
  IF repaired ~ '(Ã.|Â.|â.)' THEN
    RETURN _value;
  END IF;
  RETURN repaired;
END;
$$;

UPDATE public.leads
SET
  nome = public.repair_utf8_mojibake(nome),
  empresa = public.repair_utf8_mojibake(empresa),
  origem = public.repair_utf8_mojibake(origem),
  interesse = public.repair_utf8_mojibake(interesse),
  observacoes = public.repair_utf8_mojibake(observacoes)
WHERE concat_ws(' ', nome, empresa, origem, interesse, observacoes) ~ '(Ã.|Â.|â.)';

UPDATE public.notifications
SET
  titulo = public.repair_utf8_mojibake(titulo),
  descricao = public.repair_utf8_mojibake(descricao)
WHERE concat_ws(' ', titulo, descricao) ~ '(Ã.|Â.|â.)';

UPDATE public.prospecting_results
SET
  nome = public.repair_utf8_mojibake(nome),
  razao_social = public.repair_utf8_mojibake(razao_social),
  nome_fantasia = public.repair_utf8_mojibake(nome_fantasia),
  segmento = public.repair_utf8_mojibake(segmento),
  descricao = public.repair_utf8_mojibake(descricao),
  endereco = public.repair_utf8_mojibake(endereco),
  bairro = public.repair_utf8_mojibake(bairro),
  cidade = public.repair_utf8_mojibake(cidade),
  oportunidade = public.repair_utf8_mojibake(oportunidade)
WHERE concat_ws(' ', nome, razao_social, nome_fantasia, segmento, descricao, endereco, bairro, cidade, oportunidade) ~ '(Ã.|Â.|â.)';

CREATE OR REPLACE FUNCTION public.get_prospecting_kpis(_tenant_id uuid, _days int DEFAULT 30)
RETURNS TABLE (
  encontrados bigint,
  qualificados bigint,
  importados bigint,
  descartados bigint,
  pesquisas bigint,
  taxa_qualificacao numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH searches AS (
    SELECT * FROM public.prospecting_searches
    WHERE tenant_id = _tenant_id
      AND is_demo = false
      AND created_at >= now() - make_interval(days => LEAST(GREATEST(_days, 1), 365))
  )
  SELECT
    COALESCE(sum(encontrados), 0)::bigint,
    COALESCE(sum(qualificados), 0)::bigint,
    COALESCE(sum(importados), 0)::bigint,
    COALESCE(sum(descartados), 0)::bigint,
    count(*)::bigint,
    CASE WHEN COALESCE(sum(encontrados), 0) = 0 THEN 0
      ELSE round((sum(qualificados)::numeric / sum(encontrados)::numeric) * 100, 1)
    END
  FROM searches
  WHERE public.is_tenant_member(_tenant_id, auth.uid()) OR public.is_super_admin(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_prospecting_kpis(uuid, int) TO authenticated;

-- -------------------------------------------------------------------------
-- 20260721010000 — grants remanescentes + validador
-- -------------------------------------------------------------------------
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

GRANT UPDATE ON TABLE public.profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.prospecting_permission_overrides,
  public.tenant_users,
  public.tenants,
  public.user_roles
TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.ticket_messages TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.tickets_numero_seq TO authenticated;

-- Validação final: nenhuma policy autenticada/publica pode ficar sem seus grants.
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
        WHEN policy.cmd = 'ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE']
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
    format('%I.%I:%s', p.schemaname, p.tablename, p.required_privilege),
    ', '
    ORDER BY p.tablename, p.required_privilege
  )
  INTO missing_privileges
  FROM policy_privileges AS p
  LEFT JOIN information_schema.role_table_grants AS g
    ON g.grantee = 'authenticated'
    AND g.table_schema = p.schemaname
    AND g.table_name = p.tablename
    AND g.privilege_type = p.required_privilege
  WHERE g.privilege_type IS NULL;

  IF missing_privileges IS NOT NULL THEN
    RAISE EXCEPTION 'Authenticated RLS policies without table grants: %', missing_privileges;
  END IF;
END;
$$;
