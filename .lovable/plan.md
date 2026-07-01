
# Auditoria do Align CRM + Plano de Evolução

Antes de propor código, mapeei o estado atual comparando com o seu checklist. O plano abaixo **preserva 100% do que já existe** e só adiciona/complementa o que falta, reutilizando componentes, hooks, Design System e tabelas atuais.

## 1) Estado atual (auditoria resumida)

### ✅ JÁ EXISTEM (preservar 100%, não tocar)

- **Financeiro** (`/financeiro`, 1050 linhas) — dashboard, receitas (`financial_entries`), despesas (`financial_expenses`), assinaturas, comissões, pagamentos parciais (`financial_payments`), status automático (`sync_entry_status`, `mark_overdue_financial`), categorias, formas de pagamento, cliente vinculado, filtros por período, gráficos.
- **Operacional › Projetos** (`/projetos`, 543 linhas) — Kanban, lista, timeline, responsáveis, prioridade, sprint, tarefas vinculadas, templates (`use-project-templates`), auditoria (`project_audit_logs`).
- **Operacional › Atividades** (`/tarefas`, 371 linhas) — dashboard, quick actions, categorias, prioridades, responsáveis, projetos vinculados, anexos, comentários, tempo, notificação por trigger (`tg_notify_task`).
- **Dashboard principal** (`/dashboards`) — KPIs, receita, insights IA, pipeline, atividade, widgets configuráveis (`use-dashboard-widgets` já suporta ocultar/reordenar), + seção Consultor.
- **Consultor / Consórcios**, **Comercial** (leads/pipeline/deals/propostas/clientes/contatos/empresas), **Clínicas**, **Escolar**, **Suporte** (tickets/knowledge_articles), **Automações**, **Insights IA**, **Chat/Kassia**, **Notificações**, **Multi-tenant**, **RLS + roles comerciais**.
- **Design System** completo (shadcn + tokens semânticos), `app-shell` com bottombar Operacional/Comercial, launch-panel.

### 🟡 EXISTEM PARCIALMENTE (só complementar)

- **Marketing › Campanhas** (`/campanhas`) — hoje é `ModuleStub` (dados fake). Tabelas `marketing_campaigns` e `marketing_emails` **já existem no banco**. Falta: CRUD real ligado às tabelas + calendário editorial.
- **Metodologia › Base de Conhecimento** (`/base-conhecimento`) — hoje é `ModuleStub`. Tabela `knowledge_articles` **já existe**. Falta: CRUD real, editor rico, busca, favoritos, versionamento.
- **Financeiro** — falta somente **cadastro de Bancos/Contas** e **upload de comprovante** por entrada (bucket `task-attachments` reutilizável ou novo `finance-receipts`).
- **Projetos** — barra de progresso: verificar se calcula automaticamente por % de tarefas concluídas; se não, completar.
- **Tarefas → Projeto** — garantir que ao concluir tarefa recalcula o progresso do projeto (trigger) e propaga para dashboards.

### ❌ NÃO EXISTEM (implementar do zero, com padrões atuais)

- **Equipe** (`/equipe`) — colaboradores, departamentos, gestores, vagas, dashboard.
- **Metas** (dentro de Atividades ou `/metas`) — CRUD de metas com departamento, prazo, status.
- **Calendário Editorial** de Marketing.
- **Bancos/Contas financeiras** (`financial_accounts`).

## 2) Regras aplicadas (do seu prompt)

- Zero refactor do que existe. Zero substituição. Zero duplicação de entidades.
- Reutilizar: `clients`, `companies`, `profiles`+`tenant_users` (para colaboradores), `tasks`, `projects`, `financial_entries`, `knowledge_articles`, `marketing_campaigns`.
- Novos componentes só quando não houver equivalente. Reutilizar `Dialog`, `Sheet`, `Card`, `Tabs`, `DataTable` patterns do app.
- Mesma tipografia, cores semânticas, ícones lucide, espaçamentos, animações do Align.
- Novas rotas entram nos dropdowns já existentes do `app-shell` (Operacional / Comercial), sem quebrar navegação.

## 3) Entregas (em sequência, uma migração cada)

### Fase A — Financeiro (gap pequeno)
1. Nova tabela `financial_accounts` (bancos/contas) + FK opcional em `financial_entries.account_id` e `financial_expenses.account_id`.
2. Bucket `finance-receipts` + campo `comprovante_url` em `financial_entries` / `financial_expenses` (se não existir).
3. UI: aba "Bancos" no `/financeiro` + upload de comprovante no modal de entrada/despesa existente.

### Fase B — Equipe (novo módulo)
1. Tabelas: `departments`, `team_members` (referencia `profiles.id` opcional para usuários do sistema; suporta colaborador externo), `job_openings`.
2. RLS por tenant + GRANTs.
3. Rota `/equipe` com abas: **Colaboradores**, **Departamentos**, **Vagas**, **Dashboard**. Reutiliza `Card`, `DataTable`, `Dialog`.
4. Entra no dropdown Operacional do `app-shell`.

### Fase C — Marketing real
1. Hooks `use-marketing-campaigns.ts` e `use-marketing-calendar.ts` sobre as tabelas existentes.
2. Nova tabela `marketing_calendar_items` (título, tema, formato, prioridade, status, data planejada).
3. `/campanhas` deixa de ser stub → passa a ter: Dashboard (ROI, orçamento, leads), CRUD campanhas, Calendário Editorial, Ideias de Conteúdo.
4. FK opcional `marketing_campaigns.owner_id` → `profiles`.

### Fase D — Metodologia real
1. `/base-conhecimento` deixa de ser stub → CRUD de `knowledge_articles` (que já existe) com: editor rico (reutilizar Textarea + markdown simples, sem nova lib), categorias, departamento, prioridade, status.
2. Novas tabelas mínimas: `knowledge_favorites` (user_id, article_id), `knowledge_versions` (article_id, conteudo, versao, created_by).
3. Busca em tempo real (client-side sobre lista), mais-acessados via `views_count` incrementado em `RPC increment_article_view`.

### Fase E — Metas + integração Operacional
1. Nova tabela `goals` (nome, descrição, status, categoria, prioridade, data_inicio, prazo, department_id, owner_id).
2. Aba **Metas** dentro de `/tarefas` (não cria rota nova para não poluir bottombar).
3. Trigger `tg_project_progress_from_tasks`: ao mudar status de `tasks`, recalcula `projects.progresso` (% concluídas). Se `projects.progresso` não existir, adiciona coluna.

### Fase F — Dashboard principal (só adição)
1. Novos widgets opcionais em `use-dashboard-widgets`: **Equipe** (headcount, aniversários, vagas abertas), **Marketing** (ROI mês, campanhas ativas), **Metodologia** (artigos mais lidos), **Metas** (progresso).
2. Nenhum widget existente removido. Todos default = `false` para não alterar visual atual até o usuário ativar.

## 4) Detalhes técnicos (referência)

- **Padrão de hook**: mesmo shape de `use-finance.ts` (react-query + `getActiveTenantId` + toast).
- **RLS**: `is_tenant_member(tenant_id, auth.uid())` para SELECT; `is_tenant_admin` ou `can_edit_commercial` para writes onde fizer sentido.
- **GRANTs**: `authenticated` (RLS restringe) + `service_role`. Sem `anon`.
- **Realtime**: novas tabelas entram no mesmo padrão do `use-realtime`.
- **Bottombar**: `/equipe` no dropdown Operacional; `/campanhas` e `/base-conhecimento` já estão nos dropdowns atuais (só deixam de ser stub).
- **Nada é removido do `.env`, `client.ts`, `types.ts`** — types serão regenerados após cada migração.

## 5) Execução

Vou executar **em ordem A → F**, cada fase é uma migração + arquivos frontend, cada uma testável de forma isolada. Ao final de cada fase, atualizo hooks/rotas e movo para a próxima.

Confirma esta ordem e escopo? Se quiser priorizar/pular alguma fase (ex.: começar por Equipe, ou pular Fase A), me diga antes de eu abrir a primeira migração.
