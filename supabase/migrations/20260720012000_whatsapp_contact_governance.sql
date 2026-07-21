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
