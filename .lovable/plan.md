# Reestruturação Financeira + Controle de Projetos

## 1. Correção dos bugs de métricas (Dashboard + Financeiro)

**Problema raiz:** as métricas atuais somam `valor` do `deals`/`financial_entries` sem considerar exclusões em tempo real, status "cancelado" ou parcelas em `financial_payments`.

**Correções:**
- `useDeals` / `useRevenueSeries` em `src/hooks/use-dashboard.ts`: filtrar `stage != 'perdido'` e excluir cancelados; invalidação por realtime já existe.
- `src/routes/financeiro.tsx`: recalcular **Receita Recebida** como `SUM(financial_payments.valor)` (não `valor_pago` da entrada) + entradas com status `pago` sem pagamentos parciais. Excluir status `cancelado` de todos os totais.
- Adicionar indicadores: **Previsão**, **Realizada**, **Pendente**, **Inadimplência** (vencimento < hoje E status != pago/cancelado).
- React Query: garantir `invalidateQueries(['fin-entries'])` + `['fin-payments-all']` + `['deals']` em todos os deletes (já existe parcialmente em `use-payments.ts`; estender para deals).

## 2. Módulo Financeiro reestruturado (`src/routes/financeiro.tsx`)

Substituir o layout atual por **abas**:
1. **Visão Geral** — 6 KPIs (Previsão, Realizada, Pendente, Inadimplência, A Pagar, Saldo), gráfico fluxo de caixa 6 meses, resumo mensal.
2. **Contas a Receber** — lista de `financial_entries` + status (pago/parcial/pendente/atrasado), botão Reconciliar.
3. **Contas a Pagar** — lista de `financial_expenses` com vencimentos e status.
4. **Fluxo de Caixa** — tabela diária/mensal entradas vs saídas vs saldo acumulado.
5. **Parcelas & Pagamentos** — todas as `financial_payments`.
6. **Histórico** — log de operações financeiras.

Filtros globais por período (mês atual, últimos 30/90 dias, ano, custom).

## 3. Controle de Projetos (nova seção)

**Migration:** criar tabela `projects` com:
- titulo, descricao, status (planejado/em_andamento/pausado/concluido/cancelado)
- progresso (0-100), prioridade, prazo, etapas (jsonb), entregas (jsonb)
- client_id, owner_id, valor_total, tenant_id
- timeline via `activities` existente

**Rota:** `src/routes/projetos.tsx` com:
- Lista/kanban de projetos
- Drawer com tabs: Detalhes, Tarefas vinculadas (`tasks.project_id`), Financeiro vinculado (`financial_entries.project_id`), Timeline
- Adicionar `project_id` em `tasks` e `financial_entries` (migration)

## 4. Sidebar (`src/components/app-shell.tsx`)

Nova ordem dos itens primários:
1. Dashboard
2. Financeiro
3. Tarefas
4. Controle de Projetos
5. ... (demais seções comerciais)
6. Configurações

Remover o grupo "Gestão" — mover seus itens para grupos apropriados (Comercial / Operações).

## Detalhes técnicos

- Novos hooks: `src/hooks/use-projects.ts` (CRUD + vinculação tarefas/financeiro).
- Helpers em `use-finance.ts`: `computeEntryStatus(entry, payments)`, `sumReceivedFromPayments(entryId, payments)`.
- `useAllPayments` já existe — usar para agregar pagamentos no dashboard financeiro.
- Manter design system existente (Dialog, Input, Tabs).

## Escopo

Mudanças em:
- `supabase/migrations/*` (projects + project_id em tasks/financial_entries)
- `src/hooks/use-dashboard.ts`, `src/hooks/use-finance.ts`, `src/hooks/use-tasks.ts`
- `src/hooks/use-projects.ts` (novo)
- `src/routes/financeiro.tsx` (reescrita)
- `src/routes/projetos.tsx` (novo)
- `src/routes/index.tsx` (métricas corretas)
- `src/components/app-shell.tsx` (sidebar)
- `src/components/reconciliation-modal.tsx` (garantir invalidações)
