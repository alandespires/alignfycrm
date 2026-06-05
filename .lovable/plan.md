# Plano: Tarefas + Projetos + Launch IA — versão Pro

Como o escopo é amplo, divido em **4 fases entregáveis e independentes**. Cada fase é funcional sozinha; você pode pausar entre elas.

---

## Fase 1 — Fundação de dados (schema)

Migração única adicionando o que falta no Postgres. Sem isso, o resto não funciona.

**Novas colunas em `tasks`:**
- `parent_task_id` (subtarefas)
- `project_id` (vínculo direto com projeto)
- `checklist` jsonb `[{id,texto,feito}]`
- `dependencies` uuid[] (depende de outras tarefas)
- `watchers` uuid[] (seguidores)
- `assignees` uuid[] (múltiplos responsáveis, mantém `assignee_id` como principal)
- `horas_estimadas`, `horas_realizadas` numeric
- `progresso` int (0–100, autocalculado por checklist/subtarefas)
- `ordem` int (kanban/ordenação)

**Novas tabelas:**
- `task_comments` — comentários com `@menções` (array de user_ids)
- `task_attachments` — anexos (nome, url, tamanho, mime)
- `task_time_entries` — apontamentos de tempo (start, end, duração, billable)
- `project_templates` — templates reutilizáveis (etapas + tarefas padrão como jsonb)
- `pipeline_stage_automations` — auto-criar tarefas quando lead muda de estágio

**Storage bucket:** `task-attachments` (privado, RLS por tenant).

**Triggers:**
- Recalcular `progresso` da tarefa quando checklist/subtarefas mudam
- Recalcular `progresso` do projeto pela média das tarefas
- Ao lead virar "fechado" → opcionalmente criar projeto a partir de template
- Ao mudar estágio do lead → executar `pipeline_stage_automations`

Todas com RLS por tenant + GRANTs.

---

## Fase 2 — Tarefas Pro

**Visão lista + Kanban + Calendário** (toggle no topo da página `/tarefas`).

**Drawer de detalhe da tarefa** (substitui o atual):
- Checklist inline (adicionar/marcar/reordenar)
- Subtarefas (com progresso agregado)
- Dependências ("bloqueada por X", "bloqueia Y") com aviso visual
- Múltiplos assignees + watchers (avatares)
- Comentários com `@menções` (autocomplete)
- Anexos (drag & drop, preview)
- Timer integrado (start/stop) + lista de apontamentos
- Horas estimadas vs realizadas (barra)
- Atividade/auditoria

**Métricas no topo:** atrasadas, vencendo hoje, throughput semanal, tempo médio.

---

## Fase 3 — Projetos Pro

**Drawer do projeto reformulado:**
- Aba **Visão geral**: progresso, KPIs (tarefas, horas, financeiro)
- Aba **Tarefas**: subview do módulo Tarefas filtrado
- Aba **Timeline/Gantt**: barras por etapa/tarefa com dependências, drag para mover datas
- Aba **Entregas**: marcos com data, status, vinculadas a receita
- Aba **Financeiro**: receitas (financial_entries) + custos + margem
- Aba **Equipe**: assignees agregados de todas as tarefas
- Aba **Arquivos**: anexos do projeto
- Aba **Atividade**: auditoria existente

**Templates de projeto:**
- Galeria em modal: "Onboarding cliente", "Implantação SaaS", "Campanha", "Sprint" + custom
- Aplicar template cria etapas + tarefas pré-configuradas com prazos relativos

**Conversão automática lead → projeto:**
- Quando lead vai para "fechado", abre modal "Criar projeto a partir deste lead?" com seleção de template

**Auto-tarefas por estágio do pipeline:**
- Tela `/automacao` ganha aba "Por estágio": "Quando lead entra em [Proposta] criar tarefas [X, Y, Z]"

**Receita do projeto no financeiro:**
- Botão "Adicionar receita/parcela" gera `financial_entries` linkados via `project_id`
- KPI de margem no drawer (receita - custos via horas × custo/hora)

**Dashboard:** novo widget "Projetos & Tarefas" — burndown, throughput, on-time rate, projetos por status.

---

## Fase 4 — Launch IA realista

**Edge function `kassia-chat` reformulada:**

1. **RAG real do tenant** — antes da chamada ao LLM, busca contexto:
   - Top 10 leads recentes/quentes
   - Tarefas atrasadas e vencendo
   - Projetos ativos
   - Métricas do mês (faturamento, conversão)
   - Conversas recentes (histórico)
   - Injetadas como system context com IDs reais para citação

2. **Streaming melhorado** — indicador "pensando" com fases (analisando dados → consultando CRM → gerando resposta), tokens fluindo char-a-char com cursor.

3. **Mais ferramentas (tool-calling):**
   - `criar_lead` (já existe)
   - `criar_tarefa` (já existe) — agora aceita projeto, checklist, assignees
   - `criar_projeto` (novo, com template)
   - `criar_subtarefa` (novo)
   - `agendar_followup` (novo — atividade + tarefa)
   - `mover_lead` (já existe)
   - `registrar_pagamento` (novo)
   - `gerar_relatorio` (já existe) — agora com filtros reais
   - `buscar_no_crm` (novo — RAG sob demanda)

4. **Sugestões proativas contextuais** — ao abrir o painel, IA analisa a rota atual e mostra 2–3 cards: "Você tem 3 tarefas atrasadas", "Lead X parou há 7d", "Projeto Y atinge o prazo amanhã" — cada um com ação clicável.

5. **Citações com fontes** — respostas que usam dados do CRM mostram chips clicáveis abaixo ("Lead: João Silva", "Tarefa #42") que abrem o drawer correspondente.

---

## Detalhes técnicos

- **DB:** migração única na Fase 1 (CREATE TABLE + GRANT + RLS + policies + triggers + storage bucket).
- **Hooks novos:** `use-task-comments`, `use-task-attachments`, `use-task-time`, `use-project-templates`, `use-launch-context`.
- **UI:** reusa shadcn (`Dialog`, `Drawer`, `Tabs`, `Command` para @menções). Gantt: componente custom leve com SVG (sem libs novas pesadas).
- **Storage:** bucket `task-attachments` (privado, ≤10MB/arquivo).
- **Launch IA:** edge function `kassia-chat` reescrita; novo `lib/launch-context.ts` para RAG client-side.
- **Design system:** mantém tokens existentes (`--primary`, glass, shimmer); zero cor hardcoded.
- **Tudo multi-tenant** (tenant_id + RLS) e em PT-BR.

---

## Ordem de entrega

1. Plano aprovado → **Fase 1** (migração) — 1 turno
2. **Fase 2** (Tarefas Pro) — 1–2 turnos
3. **Fase 3** (Projetos Pro) — 1–2 turnos
4. **Fase 4** (Launch IA) — 1 turno

Posso começar pela Fase 1 assim que aprovar — quer todas as 4 fases sequenciais ou prefere validar cada uma antes da próxima?
