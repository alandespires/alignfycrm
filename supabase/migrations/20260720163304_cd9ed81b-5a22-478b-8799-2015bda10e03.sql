ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nicho text;
CREATE INDEX IF NOT EXISTS idx_leads_nicho ON public.leads (tenant_id, nicho);