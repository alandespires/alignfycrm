ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS motivo_perda text,
  ADD COLUMN IF NOT EXISTS previsao_fechamento date,
  ADD COLUMN IF NOT EXISTS etapa_alterada_em timestamptz NOT NULL DEFAULT now();
UPDATE public.leads SET etapa_alterada_em = updated_at;
CREATE OR REPLACE FUNCTION public.tg_lead_stage_touch() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.etapa_alterada_em := now();
    IF NEW.status <> 'perdido' THEN NEW.motivo_perda := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lead_stage_touch ON public.leads;
CREATE TRIGGER trg_lead_stage_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_lead_stage_touch();