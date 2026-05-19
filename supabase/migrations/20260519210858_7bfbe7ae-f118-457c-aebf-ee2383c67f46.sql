
-- =============== ENUMS ===============
DO $$ BEGIN
  CREATE TYPE public.commercial_role AS ENUM ('admin','comercial','visualizador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('aberto','em_andamento','aguardando','resolvido','fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('baixa','media','alta','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============== USER COMMERCIAL ROLES ===============
CREATE TABLE IF NOT EXISTS public.user_commercial_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.commercial_role NOT NULL DEFAULT 'visualizador',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
ALTER TABLE public.user_commercial_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_commercial_role(_user_id uuid, _tenant_id uuid, _role public.commercial_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_commercial_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role
  ) OR public.is_tenant_admin(_tenant_id, _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_edit_commercial(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_tenant_admin(_tenant_id, _user_id)
      OR public.is_super_admin(_user_id)
      OR EXISTS(
        SELECT 1 FROM public.user_commercial_roles
        WHERE user_id = _user_id AND tenant_id = _tenant_id AND role IN ('admin','comercial')
      );
$$;

CREATE OR REPLACE FUNCTION public.can_delete_commercial(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_tenant_admin(_tenant_id, _user_id)
      OR public.is_super_admin(_user_id)
      OR EXISTS(
        SELECT 1 FROM public.user_commercial_roles
        WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = 'admin'
      );
$$;

CREATE POLICY ucr_select ON public.user_commercial_roles FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY ucr_insert ON public.user_commercial_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY ucr_update ON public.user_commercial_roles FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY ucr_delete ON public.user_commercial_roles FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- =============== COMPANIES ===============
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nome text NOT NULL,
  razao_social text,
  cnpj text,
  segmento text,
  site text,
  tamanho text,
  cidade text,
  estado text,
  observacoes text,
  owner_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_nome ON public.companies(lower(nome));

CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND auth.uid() = created_by);
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- =============== CONTACTS ===============
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_id uuid,
  nome text NOT NULL,
  cargo text,
  email text,
  whatsapp text,
  telefone text,
  observacoes text,
  owner_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);

CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY contacts_insert ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND auth.uid() = created_by);
CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- =============== TICKETS ===============
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  numero serial,
  assunto text NOT NULL,
  descricao text,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  prioridade public.ticket_priority NOT NULL DEFAULT 'media',
  client_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  assignee_id uuid,
  sla_vencimento timestamptz,
  resolvido_em timestamptz,
  fechado_em timestamptz,
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON public.tickets(tenant_id, status);

CREATE POLICY tickets_select ON public.tickets FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY tickets_insert ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND auth.uid() = created_by);
CREATE POLICY tickets_update ON public.tickets FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY tickets_delete ON public.tickets FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  autor_tipo text NOT NULL DEFAULT 'agente', -- agente | cliente | sistema
  interno boolean NOT NULL DEFAULT false,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ticket_msg_ticket ON public.ticket_messages(ticket_id);

CREATE POLICY tmsg_select ON public.ticket_messages FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY tmsg_insert ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND auth.uid() = autor_id);
CREATE POLICY tmsg_delete ON public.ticket_messages FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- =============== UPDATED_AT TRIGGERS ===============
CREATE TRIGGER tg_user_commercial_roles_updated BEFORE UPDATE ON public.user_commercial_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_tickets_updated BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== LEAD -> COMPANY/CONTACT/DEAL AUTO-CONVERT ===============
CREATE OR REPLACE FUNCTION public.tg_lead_auto_convert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id uuid;
  v_contact_id uuid;
  v_owner uuid;
  v_company_name text;
BEGIN
  IF NEW.status = 'fechado' AND (OLD.status IS DISTINCT FROM 'fechado') THEN
    v_owner := COALESCE(NEW.owner_id, NEW.created_by);
    v_company_name := COALESCE(NULLIF(trim(NEW.empresa), ''), NEW.nome);

    SELECT id INTO v_company_id FROM public.companies
      WHERE tenant_id = NEW.tenant_id AND lower(nome) = lower(v_company_name)
      LIMIT 1;

    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (tenant_id, nome, owner_id, created_by, observacoes)
      VALUES (NEW.tenant_id, v_company_name, v_owner, v_owner,
              'Criada automaticamente a partir do lead ' || NEW.nome)
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.contacts (tenant_id, company_id, lead_id, nome, email, whatsapp, owner_id, created_by)
    VALUES (NEW.tenant_id, v_company_id, NEW.id, NEW.nome, NEW.email, NEW.whatsapp, v_owner, v_owner)
    RETURNING id INTO v_contact_id;

    IF NOT EXISTS (SELECT 1 FROM public.deals WHERE lead_id = NEW.id AND stage = 'fechado') THEN
      INSERT INTO public.deals (tenant_id, lead_id, titulo, valor, stage, probabilidade, fechado_em, owner_id)
      VALUES (NEW.tenant_id, NEW.id, v_company_name,
              COALESCE(NEW.valor_estimado, 0), 'fechado', 100, now(), v_owner);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_leads_auto_convert ON public.leads;
CREATE TRIGGER tg_leads_auto_convert AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_auto_convert();

-- =============== REFORÇO RLS NOS MÓDULOS COMERCIAIS EXISTENTES ===============
-- deals: substitui write policies por versões com can_edit_commercial
DROP POLICY IF EXISTS deals_tenant_insert ON public.deals;
DROP POLICY IF EXISTS deals_tenant_update ON public.deals;
DROP POLICY IF EXISTS deals_tenant_delete ON public.deals;
CREATE POLICY deals_tenant_insert ON public.deals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY deals_tenant_update ON public.deals FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY deals_tenant_delete ON public.deals FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- proposals: separar ALL em policies granulares
DROP POLICY IF EXISTS proposals_tenant_all ON public.proposals;
CREATE POLICY proposals_select ON public.proposals FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY proposals_insert ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id) AND auth.uid() = created_by);
CREATE POLICY proposals_update ON public.proposals FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY proposals_delete ON public.proposals FOR DELETE TO authenticated
  USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- clients: write requer comercial; admin do tenant continua podendo deletar
DROP POLICY IF EXISTS clients_tenant_insert ON public.clients;
DROP POLICY IF EXISTS clients_tenant_update ON public.clients;
CREATE POLICY clients_tenant_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY clients_tenant_update ON public.clients FOR UPDATE TO authenticated
  USING (public.can_edit_commercial(auth.uid(), tenant_id))
  WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_commercial_roles;
