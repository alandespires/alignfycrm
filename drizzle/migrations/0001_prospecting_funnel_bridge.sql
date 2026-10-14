ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cidade text;
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(tenant_id, campaign_id);

CREATE OR REPLACE FUNCTION public.tg_lead_prospecting_enrich()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _camp text; _cid text; _uf text;
BEGIN
  IF NEW.prospecting_search_id IS NOT NULL AND NEW.campaign_id IS NULL THEN
    SELECT filtros->>'campaign_id' INTO _camp FROM prospecting_searches WHERE id = NEW.prospecting_search_id;
    IF _camp ~* '^[0-9a-f-]{36}$' AND EXISTS (SELECT 1 FROM marketing_campaigns WHERE id = _camp::uuid AND tenant_id = NEW.tenant_id) THEN
      NEW.campaign_id := _camp::uuid;
    END IF;
  END IF;
  IF NEW.prospecting_result_id IS NOT NULL AND NEW.cidade IS NULL THEN
    SELECT cidade, uf INTO _cid, _uf FROM prospecting_results WHERE id = NEW.prospecting_result_id;
    NEW.cidade := NULLIF(concat_ws(' - ', _cid, _uf), '');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lead_prospecting_enrich ON public.leads;
CREATE TRIGGER trg_lead_prospecting_enrich BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_prospecting_enrich();

CREATE OR REPLACE FUNCTION public.tg_lead_prospecting_followup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := COALESCE(NEW.owner_id, NEW.created_by);
BEGIN
  IF NEW.prospecting_result_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO activities (tenant_id, lead_id, user_id, tipo, descricao, metadata)
  VALUES (NEW.tenant_id, NEW.id, _uid, 'nota',
    'Lead importado da Prospecção B2B' || COALESCE(' (score ' || NEW.prospecting_score || ')', ''),
    jsonb_build_object('origem','prospeccao','campaign_id',NEW.campaign_id));
  INSERT INTO tasks (tenant_id, lead_id, created_by, assignee_id, titulo, descricao, prioridade, prazo)
  VALUES (NEW.tenant_id, NEW.id, _uid, _uid, 'Primeiro contato: ' || NEW.nome,
    'Apresente a empresa e qualifique o interesse.' || COALESCE(' Tel: ' || NEW.whatsapp, ''),
    CASE WHEN COALESCE(NEW.prospecting_score,0) >= 70 THEN 'alta'::task_priority ELSE 'media'::task_priority END,
    now() + interval '1 day');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lead_prospecting_followup ON public.leads;
CREATE TRIGGER trg_lead_prospecting_followup AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_prospecting_followup();