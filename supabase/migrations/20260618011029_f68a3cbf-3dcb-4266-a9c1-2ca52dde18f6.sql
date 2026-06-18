
DO $$ BEGIN CREATE TYPE public.consortium_segment AS ENUM ('imovel','veiculo','servicos','pesado','moto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.quota_status AS ENUM ('ativa','contemplada','quitada','cancelada','transferida','atrasada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contemplation_type AS ENUM ('sorteio','lance_livre','lance_fixo','lance_embutido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.credit_product_type AS ENUM ('consignado','fgts','home_equity','refin_veicular','pessoal','antecipacao_ir'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- administrators
CREATE TABLE IF NOT EXISTS public.consortium_administrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL, cnpj text,
  taxa_adm_padrao numeric(6,3) DEFAULT 18.0,
  fundo_reserva_padrao numeric(6,3) DEFAULT 2.0,
  seguro_padrao numeric(6,3) DEFAULT 0.04,
  contato text, observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consortium_administrators TO authenticated;
GRANT ALL ON public.consortium_administrators TO service_role;
ALTER TABLE public.consortium_administrators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_sel" ON public.consortium_administrators FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "ca_ins" ON public.consortium_administrators FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "ca_upd" ON public.consortium_administrators FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "ca_del" ON public.consortium_administrators FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_ca_upd BEFORE UPDATE ON public.consortium_administrators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- groups
CREATE TABLE IF NOT EXISTS public.consortium_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  administrator_id uuid REFERENCES public.consortium_administrators(id) ON DELETE SET NULL,
  codigo text NOT NULL, segmento public.consortium_segment NOT NULL,
  prazo_meses int NOT NULL, valor_credito numeric(14,2) NOT NULL,
  vagas int, assembleia_dia int,
  status text NOT NULL DEFAULT 'aberto', observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consortium_groups TO authenticated;
GRANT ALL ON public.consortium_groups TO service_role;
ALTER TABLE public.consortium_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cg_sel" ON public.consortium_groups FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "cg_ins" ON public.consortium_groups FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cg_upd" ON public.consortium_groups FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cg_del" ON public.consortium_groups FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_cg_upd BEFORE UPDATE ON public.consortium_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- quotas
CREATE TABLE IF NOT EXISTS public.consortium_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.consortium_groups(id) ON DELETE SET NULL,
  administrator_id uuid REFERENCES public.consortium_administrators(id) ON DELETE SET NULL,
  numero_cota text, segmento public.consortium_segment NOT NULL,
  valor_credito numeric(14,2) NOT NULL,
  parcela_valor numeric(14,2) NOT NULL,
  parcela_atual int DEFAULT 0, parcela_total int NOT NULL,
  status public.quota_status NOT NULL DEFAULT 'ativa',
  contemplada_em date, lance_ofertado numeric(14,2),
  lance_tipo public.contemplation_type, proximo_vencimento date,
  owner_id uuid REFERENCES auth.users(id), observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consortium_quotas TO authenticated;
GRANT ALL ON public.consortium_quotas TO service_role;
ALTER TABLE public.consortium_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cq_sel" ON public.consortium_quotas FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "cq_ins" ON public.consortium_quotas FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cq_upd" ON public.consortium_quotas FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cq_del" ON public.consortium_quotas FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_cq_upd BEFORE UPDATE ON public.consortium_quotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_cq_t ON public.consortium_quotas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cq_l ON public.consortium_quotas(lead_id);

-- simulations
CREATE TABLE IF NOT EXISTS public.consortium_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  administrator_id uuid REFERENCES public.consortium_administrators(id) ON DELETE SET NULL,
  segmento public.consortium_segment NOT NULL,
  credito numeric(14,2) NOT NULL, prazo_meses int NOT NULL,
  taxa_adm numeric(6,3) NOT NULL,
  fundo_reserva numeric(6,3) NOT NULL DEFAULT 0,
  seguro_mensal numeric(14,2) DEFAULT 0,
  lance_embutido_pct numeric(5,2) DEFAULT 0,
  parcela_estimada numeric(14,2) NOT NULL,
  parcela_com_lance numeric(14,2),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text, enviada_em timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consortium_simulations TO authenticated;
GRANT ALL ON public.consortium_simulations TO service_role;
ALTER TABLE public.consortium_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_sel" ON public.consortium_simulations FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "cs_ins" ON public.consortium_simulations FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cs_upd" ON public.consortium_simulations FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cs_del" ON public.consortium_simulations FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_cs_upd BEFORE UPDATE ON public.consortium_simulations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contemplations
CREATE TABLE IF NOT EXISTS public.consortium_contemplations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quota_id uuid NOT NULL REFERENCES public.consortium_quotas(id) ON DELETE CASCADE,
  tipo public.contemplation_type NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor_lance numeric(14,2), observacao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consortium_contemplations TO authenticated;
GRANT ALL ON public.consortium_contemplations TO service_role;
ALTER TABLE public.consortium_contemplations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_sel" ON public.consortium_contemplations FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "cc_ins" ON public.consortium_contemplations FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cc_upd" ON public.consortium_contemplations FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cc_del" ON public.consortium_contemplations FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));

-- consultor_commissions  (reusing existing commission_status: pendente|aprovada|paga|cancelada)
CREATE TABLE IF NOT EXISTS public.consultor_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consultor_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  quota_id uuid REFERENCES public.consortium_quotas(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  base numeric(14,2) NOT NULL,
  percentual numeric(6,3) NOT NULL,
  valor numeric(14,2) NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'pendente',
  pagar_em date, paga_em date,
  financial_entry_id uuid REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.consultor_commissions TO authenticated;
GRANT ALL ON public.consultor_commissions TO service_role;
ALTER TABLE public.consultor_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "com_sel" ON public.consultor_commissions FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "com_ins" ON public.consultor_commissions FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "com_upd" ON public.consultor_commissions FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "com_del" ON public.consultor_commissions FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_com_upd BEFORE UPDATE ON public.consultor_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- credit_products
CREATE TABLE IF NOT EXISTS public.credit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL, tipo public.credit_product_type NOT NULL,
  banco text, taxa_min numeric(6,3), taxa_max numeric(6,3),
  prazo_min int, prazo_max int, comissao_pct numeric(6,3),
  observacoes text, ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.credit_products TO authenticated;
GRANT ALL ON public.credit_products TO service_role;
ALTER TABLE public.credit_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_sel" ON public.credit_products FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "cp_ins" ON public.credit_products FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cp_upd" ON public.credit_products FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "cp_del" ON public.credit_products FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_cp_upd BEFORE UPDATE ON public.credit_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- credit_simulations
CREATE TABLE IF NOT EXISTS public.credit_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.credit_products(id) ON DELETE SET NULL,
  valor_solicitado numeric(14,2) NOT NULL, prazo_meses int NOT NULL,
  taxa_mensal numeric(6,3) NOT NULL, parcela numeric(14,2) NOT NULL,
  total_pago numeric(14,2) NOT NULL, cet_anual numeric(6,3),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, pdf_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.credit_simulations TO authenticated;
GRANT ALL ON public.credit_simulations TO service_role;
ALTER TABLE public.credit_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csi_sel" ON public.credit_simulations FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "csi_ins" ON public.credit_simulations FOR INSERT TO authenticated WITH CHECK (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "csi_upd" ON public.credit_simulations FOR UPDATE TO authenticated USING (public.can_edit_commercial(auth.uid(), tenant_id));
CREATE POLICY "csi_del" ON public.credit_simulations FOR DELETE TO authenticated USING (public.can_delete_commercial(auth.uid(), tenant_id));
CREATE TRIGGER trg_csi_upd BEFORE UPDATE ON public.credit_simulations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: contemplação cria tarefa + notificação
CREATE OR REPLACE FUNCTION public.tg_quota_on_contemplation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.status = 'contemplada' AND (OLD.status IS DISTINCT FROM 'contemplada') THEN
    v_owner := COALESCE(NEW.owner_id, NEW.created_by);
    PERFORM public.notify_tenant(NEW.tenant_id, 'cliente_novo'::notification_type,
      '🎉 Cota contemplada: ' || COALESCE(NEW.numero_cota,'s/nº'),
      'Iniciar documentação e uso de crédito',
      '/consultor/cotas', 'alta',
      jsonb_build_object('quota_id', NEW.id));
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.tasks (tenant_id, titulo, descricao, prioridade, prazo, lead_id, created_by, assignee_id, status)
      VALUES (NEW.tenant_id, 'Documentação da contemplação - cota ' || COALESCE(NEW.numero_cota,''),
        'Preparar documentação e orientar cliente sobre uso do crédito.',
        'alta'::task_priority, now() + interval '3 days',
        NEW.lead_id, v_owner, v_owner, 'pendente'::task_status);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_quota_contemplation ON public.consortium_quotas;
CREATE TRIGGER trg_quota_contemplation AFTER UPDATE ON public.consortium_quotas
FOR EACH ROW EXECUTE FUNCTION public.tg_quota_on_contemplation();

-- Trigger: comissão aprovada -> cria entrada financeira
CREATE OR REPLACE FUNCTION public.tg_commission_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry uuid;
BEGIN
  IF NEW.status = 'aprovada' AND (OLD.status IS DISTINCT FROM 'aprovada') AND NEW.financial_entry_id IS NULL THEN
    INSERT INTO public.financial_entries (tenant_id, descricao, valor, vencimento, status, categoria, created_by, lead_id)
    VALUES (NEW.tenant_id, 'Comissão: ' || NEW.descricao, NEW.valor,
      COALESCE(NEW.pagar_em, CURRENT_DATE + 7), 'pendente'::financial_status,
      'comissao_consorcio', NEW.created_by, NEW.lead_id)
    RETURNING id INTO v_entry;
    NEW.financial_entry_id := v_entry;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_commission_release ON public.consultor_commissions;
CREATE TRIGGER trg_commission_release BEFORE UPDATE ON public.consultor_commissions
FOR EACH ROW EXECUTE FUNCTION public.tg_commission_release();

-- Promoção do usuário
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'alandespires@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_commercial_roles (tenant_id, user_id, role)
      SELECT tu.tenant_id, v_uid, 'admin'::commercial_role
        FROM public.tenant_users tu WHERE tu.user_id = v_uid
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin'::commercial_role;
  END IF;
END $$;
