Vou entregar em duas ondas. Onda 1 é fundação (migração + RBAC + módulos críticos), Onda 2 é refinamento (KB completo, métricas globais, tabelas que ainda faltam). Cada onda é um único deploy aprovado.

---

## Onda 1 — Persistência + RBAC + módulos centrais

### Banco de dados (1 migração)

Tabelas novas:
- `commercial_roles` (enum: `admin`, `comercial`, `visualizador`) + tabela `user_commercial_roles (user_id, tenant_id, role)` — segue o padrão seguro do projeto (não guardar role em `profiles`).
- `companies` — separado de `clients`: razão social, CNPJ, segmento, site, tamanho, owner, notas. (Hoje "Empresas" usa stub local.)
- `contacts` — pessoa física vinculada opcionalmente a `company_id` e/ou `lead_id`: nome, cargo, email, whatsapp, owner.
- `tickets` — suporte de verdade: assunto, descrição, status (`aberto/em_andamento/aguardando/resolvido/fechado`), prioridade, sla_vencimento, client_id, assignee_id.
- `ticket_messages` — thread de respostas (interno/cliente).

Funções/triggers:
- `has_commercial_role(_user, _tenant, _role)` — security definer, igual `has_role`.
- `can_edit_commercial(_user, _tenant)` — TRUE se `admin` OU `comercial`.
- Trigger em `leads`: ao virar `status='fechado'`, criar automaticamente `company` (se não existir pelo nome) + `contact` + `deal` `stage='fechado'` ligado (fluxo lead→oportunidade→empresa).

RLS (todas as tabelas novas + reforço nas existentes `deals`, `proposals`, `clients`):
- SELECT: `is_tenant_member` (qualquer função vê).
- INSERT/UPDATE/DELETE: exige `can_edit_commercial` (visualizador é read-only).

### Frontend — hooks reais

Substituir `module-stub` (localStorage) por hooks Supabase tipados:
- `use-companies.ts`, `use-contacts.ts`, `use-deals.ts` (já existe deals como tipo), `use-proposals.ts`, `use-tickets.ts`.
- `use-commercial-role.ts` — retorna `{ role, canEdit, canDelete }` para o tenant ativo; usado para esconder/desabilitar botões "Novo/Editar/Excluir".

### Telas reescritas (sai do stub, vira CRUD real)

- `/oportunidades` — lista de `deals` com kanban opcional, valor, stage, lead origem, owner. KPIs reais (pipeline aberto, ganhos no mês, ticket médio).
- `/propostas` — lista de `proposals` com status (rascunho/enviada/visualizada/aceita/recusada), valor, validade, link de visualização. KPIs (taxa de aceite, ticket médio).
- `/empresas` — CRUD de `companies` com contatos vinculados, deals abertos, MRR. KPIs (total, novas no mês, em negociação).
- `/contatos` — CRUD de `contacts` com filtro por empresa.
- `/tickets` — fila de suporte com colunas por status, SLA visível, drawer de detalhe com thread de mensagens. KPIs (abertos, atrasados, tempo médio resolução).
- `/interacoes` — vira leitura agregada da tabela `activities` já existente (timeline cross-módulo), não mais stub.

Cada lista ganha: busca, filtros básicos, e (mantido do escopo anterior) o botão "Nova" só aparece se `canEdit`.

### App-shell

Indicador discreto do papel atual ao lado do nome do usuário (`Admin`, `Comercial`, `Visualizador`). Tela `/configuracoes` ganha aba "Equipe" para o `admin` atribuir papéis aos membros do tenant.

---

## Onda 2 — Refinamento (depois da aprovação da Onda 1)

- `/base-conhecimento` virar editor real de `knowledge_articles` (já tem tabela): editor de markdown, busca full-text, categorias, contador de visualizações, modo público vs interno.
- KPIs do dashboard principal (`/`) e `/dashboards` puxarem números reais (deals fechados no mês, MRR via `financial_subscriptions`, tickets atrasados, leads quentes).
- `/campanhas` e `/email-marketing` conectarem em `marketing_campaigns` e `marketing_emails` (já existem).
- `/landing-pages` conectar em `landing_pages` (já existe).
- `/relatorios` consolidado com filtros por período usando dados reais.

---

## O que NÃO entra agora (para deixar claro)

- Exportação CSV/PDF e sugestões IA Launch por módulo (opções 2 e 3 que você não marcou) — fica para uma terceira onda quando esta base estiver firme.
- RBAC nos módulos Escolar/Clínicas/Financeiro — você pediu só comerciais.
- Editor visual de proposta com aceite por link (token já existe no schema, mas a UI fica para depois).

---

## Detalhes técnicos

- Migração única com todas as tabelas, enums, policies e a trigger de conversão automática `lead.fechado → company+contact+deal`.
- Realtime: assinar `deals`, `proposals`, `companies`, `tickets` via `useRealtimeSync` (padrão já usado em leads).
- TanStack Query para todas as listas com `invalidate` nos mutates; loading skeletons.
- `ModuleStub` (localStorage) será removido — qualquer rota que ainda dependia dele será reescrita.
- Sem mudanças em `src/integrations/supabase/*` (auto-gerados).
- Sem novas Edge Functions — tudo client com RLS, padrão do projeto.

Confirma a Onda 1 para eu rodar a migração e implementar?