
-- 1) pipeline_stage_automations (cadences per pipeline stage)
CREATE TABLE IF NOT EXISTS public.pipeline_stage_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  stage text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  tarefas jsonb NOT NULL DEFAULT '[]'::jsonb,
  notificar boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stage_automations TO authenticated;
GRANT ALL ON public.pipeline_stage_automations TO service_role;
ALTER TABLE public.pipeline_stage_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psa_select" ON public.pipeline_stage_automations FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "psa_insert" ON public.pipeline_stage_automations FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "psa_update" ON public.pipeline_stage_automations FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "psa_delete" ON public.pipeline_stage_automations FOR DELETE TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_psa_tenant_stage ON public.pipeline_stage_automations(tenant_id, stage);

CREATE TRIGGER psa_set_updated_at BEFORE UPDATE ON public.pipeline_stage_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Trigger: when a lead moves to a new stage, create tasks from stage automations
CREATE OR REPLACE FUNCTION public.tg_pipeline_stage_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rule public.pipeline_stage_automations%ROWTYPE;
  tarefa jsonb;
  v_owner uuid;
  v_titulo text;
  v_prazo_dias int;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_owner := COALESCE(NEW.owner_id, NEW.created_by);
    FOR rule IN
      SELECT * FROM public.pipeline_stage_automations
      WHERE tenant_id = NEW.tenant_id AND stage = NEW.status::text AND ativo = true
    LOOP
      FOR tarefa IN SELECT * FROM jsonb_array_elements(rule.tarefas)
      LOOP
        v_titulo := COALESCE(tarefa->>'titulo', 'Follow-up: ' || NEW.nome);
        v_prazo_dias := COALESCE((tarefa->>'prazo_dias')::int, 1);
        INSERT INTO public.tasks (tenant_id, titulo, descricao, prioridade, prazo, lead_id, created_by, assignee_id, status)
        VALUES (
          NEW.tenant_id, v_titulo, tarefa->>'descricao',
          COALESCE((tarefa->>'prioridade')::task_priority, 'media'::task_priority),
          now() + (v_prazo_dias || ' days')::interval,
          NEW.id, v_owner, v_owner, 'pendente'::task_status
        );
      END LOOP;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_pipeline_stage_run ON public.leads;
CREATE TRIGGER trg_pipeline_stage_run
  AFTER UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_pipeline_stage_run();

-- 3) Add status + error to automation_runs for history/audit
ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sucesso',
  ADD COLUMN IF NOT EXISTS erro text;

-- 4) Wrap execute_automations with error capture (patch)
CREATE OR REPLACE FUNCTION public.execute_automations(_trigger automation_trigger, _lead public.leads)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rule public.automations%ROWTYPE;
  acao jsonb;
  v_user uuid;
  v_actions_done jsonb;
  v_match boolean;
  v_err text;
BEGIN
  v_user := COALESCE(auth.uid(), _lead.owner_id, _lead.created_by);
  FOR rule IN
    SELECT * FROM public.automations
    WHERE ativo = true AND trigger_tipo = _trigger AND tenant_id = _lead.tenant_id
  LOOP
    v_match := true;
    IF rule.trigger_valor IS NOT NULL AND rule.trigger_valor <> '' THEN
      IF _trigger = 'status_mudou' AND _lead.status::text <> rule.trigger_valor THEN v_match := false; END IF;
      IF _trigger = 'lead_criado' AND COALESCE(_lead.origem,'') <> rule.trigger_valor THEN v_match := false; END IF;
      IF _trigger = 'score_alto' AND COALESCE(_lead.ai_score,0) < rule.trigger_valor::int THEN v_match := false; END IF;
    END IF;
    IF NOT v_match THEN CONTINUE; END IF;

    v_actions_done := '[]'::jsonb;
    v_err := NULL;
    BEGIN
      FOR acao IN SELECT * FROM jsonb_array_elements(rule.acoes) LOOP
        IF acao->>'tipo' = 'criar_tarefa' THEN
          INSERT INTO public.tasks (tenant_id, titulo, descricao, prioridade, lead_id, created_by, assignee_id, prazo)
          VALUES (
            _lead.tenant_id,
            COALESCE(acao->>'titulo', 'Tarefa automática: ' || _lead.nome),
            acao->>'descricao',
            COALESCE((acao->>'prioridade')::task_priority, 'media'::task_priority),
            _lead.id, v_user, v_user,
            CASE WHEN acao ? 'prazo_dias' THEN now() + ((acao->>'prazo_dias')::int || ' days')::interval ELSE NULL END
          );
          v_actions_done := v_actions_done || jsonb_build_object('tipo','criar_tarefa','titulo', acao->>'titulo');
        ELSIF acao->>'tipo' = 'registrar_atividade' THEN
          INSERT INTO public.activities (tenant_id, tipo, descricao, lead_id, user_id, metadata)
          VALUES (
            _lead.tenant_id,
            COALESCE((acao->>'tipo_atividade')::activity_type, 'nota'::activity_type),
            COALESCE(acao->>'descricao', '[Automação] ' || rule.nome),
            _lead.id, v_user,
            jsonb_build_object('automation_id', rule.id)
          );
          v_actions_done := v_actions_done || jsonb_build_object('tipo','registrar_atividade');
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLERRM;
    END;

    UPDATE public.automations SET execucoes = execucoes + 1 WHERE id = rule.id;
    INSERT INTO public.automation_runs (tenant_id, automation_id, lead_id, resultado, status, erro)
    VALUES (
      _lead.tenant_id, rule.id, _lead.id,
      jsonb_build_object('acoes', v_actions_done, 'trigger', _trigger::text),
      CASE WHEN v_err IS NULL THEN 'sucesso' ELSE 'erro' END,
      v_err
    );
  END LOOP;
END; $$;
