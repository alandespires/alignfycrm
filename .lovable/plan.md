# Módulo Prospecção — Plano de implementação

Novo módulo dentro de **Comercial** (`/comercial/prospeccao`) para encontrar, qualificar e importar leads B2B para o módulo `Leads` já existente. Reutiliza `AppShell`, `AlignPanel`, `Skeleton`, tokens do design system Launch OS, hooks React Query, RLS por `tenant_id` e o padrão de rotas TanStack Start.

Como não há APIs de dados B2B configuradas hoje, a entrega ocorre em duas frentes: (1) toda a arquitetura funcional real (banco, RLS, hooks, UI, importação, histórico, listas, perfis, permissões) e (2) um **provider adapter** com modo demo claramente marcado. Nenhuma integração paga é ativada sem que o usuário configure a chave.

## 1. Auditoria e reuso (sem duplicar)

- Bottom nav "Comercial" em `src/components/app-shell.tsx` → adicionar item **Prospecção**.
- Reusar: `AppShell`, `StatusPill`, `AlignPanel`, `Skeleton`/`TableRowsSkeleton`, `LeadFormDialog`, `useCreateLead`, `useLeads` (para dedup), `useTeam`, `useMyCommercialRole`, `getActiveTenantId`, `useRealtimeSync`, tokens de `src/styles.css`, motion de `src/lib/motion.ts`.
- Origem `"Prospecção"` já é aceita como texto livre em `leads.origem` — não requer enum novo.

## 2. Banco (migração única)

Todas as tabelas em `public`, com GRANT + RLS `tenant_id IN user_tenant_ids(auth.uid())`.

- `prospecting_profiles` — perfis salvos (nicho, localização, filtros JSONB, score_minimo, exclusoes, funil/tag padrão).
- `prospecting_searches` — execuções (profile_id nullable, filtros JSONB, provider, status, encontrados/qualificados/importados, custo_estimado).
- `prospecting_results` — leads encontrados (search_id, nome, razao_social, cnpj, segmento, cidade/uf/bairro/lat/lng, telefone/whatsapp/email/site/instagram/facebook/linkedin, rating, reviews_count, score 0-100, confiabilidade `alta|media|baixa`, motivos JSONB, oportunidade TEXT, status `novo|favorito|ignorado|invalido|importado`, imported_lead_id FK `leads.id`, raw JSONB, source TEXT, source_ref TEXT).
- `prospecting_lists` + `prospecting_list_items(list_id, result_id)`.
- `prospecting_import_logs` — quem/quando/quantos importados, ignorados, atualizados, falhos.
- `prospecting_score_rules` — pesos por tenant (default seed).
- `prospecting_sources` — status/configuração por provedor (sem armazenar chave; apenas flags `configurado`, `provider`, `limite_mensal`, `usado_mes`).
- Validação/audit: reaproveitar `activities` para logs de importação.

Índices: `(tenant_id, telefone_norm)`, `(tenant_id, email)`, `(tenant_id, cnpj)`, `(tenant_id, site_domain)`, `(tenant_id, cidade, uf)`, `(tenant_id, score DESC)`, `(search_id)`.

Unique parcial para dedup dentro do tenant: `(tenant_id, coalesce(cnpj,''), coalesce(telefone_norm,''))` como índice de suporte à detecção (não constraint hard, para permitir "possível duplicidade").

Chaves de API (`GOOGLE_PLACES_API_KEY`, `RECEITAWS_API_KEY`, etc.) via `add_secret` **somente quando o usuário pedir** para ativar um provedor. Nada exposto no client.

## 3. Camada de provedores (backend)

`src/lib/prospecting/` (client-safe types) + `src/lib/prospecting.functions.ts` (createServerFn):

- `ProspectingProvider` interface: `search(filters) → RawLead[]`, `validatePhone`, `validateEmail`, `enrich(cnpj)`.
- Adapters: `google-places.ts`, `receitaws.ts`, `mock.ts` (usado quando nenhuma chave está presente).
- Server fn `runProspectingSearch` autenticada (`requireSupabaseAuth` + `has_commercial_role`): valida filtros com zod, chama provider, normaliza, calcula score, deduplica contra `leads` + resultados anteriores, persiste `prospecting_searches` + `prospecting_results`, retorna resumo.
- Server fn `importProspectingResults` — cria/atualiza `leads` em lote com `origem='Prospecção'`, `metadata.prospecting_search_id`, e escreve `prospecting_import_logs`.
- Provider mock retorna dados marcados `is_demo=true`; server fn recusa importação em produção se `is_demo=true` **e** flag ambiente `PROSPECTING_ALLOW_DEMO_IMPORT` não estiver definida.

## 4. Score de qualificação

Função pura em `src/lib/prospecting/score.ts`, pesos vindos de `prospecting_score_rules` (default seed). Critérios: telefone válido, whatsapp presente, email válido, match nicho, match região, completude, rating/reviews, site presente, atividade recente, ausência no CRM, sinais anti-fraude. Faixas: Excelente ≥85, Bom 70–84, Médio 50–69, Baixo <50. Retorna `{score, tier, motivos_positivos[], motivos_atencao[], confiabilidade}`.

## 5. Rotas e UI

Arquivos novos (padrão dot):

- `src/routes/comercial.prospeccao.tsx` — layout (`<Outlet/>`).
- `src/routes/comercial.prospeccao.index.tsx` — página principal: KPIs (6 cards), painel de filtros, botão **Gerar leads**, tabela/cards de resultados, histórico lateral.
- `src/routes/comercial.prospeccao.perfis.tsx` — CRUD de perfis.
- `src/routes/comercial.prospeccao.listas.tsx` — CRUD de listas + items.
- `src/routes/comercial.prospeccao.historico.tsx` — searches passadas.
- `src/routes/comercial.prospeccao.configuracoes.tsx` — provedores, pesos, permissões (gate `admin` comercial).

Componentes novos em `src/components/prospecting/`:
- `filters-panel.tsx`, `results-table.tsx`, `result-card.tsx`, `result-detail-panel.tsx` (via `AlignPanel`), `import-dialog.tsx` (via `AlignPanel`), `score-pill.tsx`, `confidence-badge.tsx`, `search-progress.tsx` (etapas reais), `approach-suggestion.tsx`, `empty-state.tsx`.

Todos os textos em pt-BR, tipografia/cores existentes, responsivo, motion via `src/lib/motion.ts`, skeletons via `src/components/skeletons.tsx`.

## 6. Fluxo de "Gerar leads"

1. Zod valida filtros no client.
2. `useMutation` → `runProspectingSearch`.
3. Server fn envia updates de progresso via retorno em etapas (polling curto na `prospecting_searches.status`: `buscando|validando|deduplicando|analisando|calculando|pronto`).
4. UI mostra progresso real por etapa; nada de fake loading.
5. Ao concluir, resultados aparecem ordenados por score DESC.

## 7. Detalhe do lead + importação

- `AlignPanel` (drawer direito desktop / bottom sheet mobile) com todos os campos, "Por que este lead pode converter?" gerado por regras a partir dos motivos reais, "Sugestão de abordagem" (tons: consultivo/direto/amigável/profissional/agressivo) usando `kassia-chat` já existente — **nunca envia** automaticamente.
- Botão "Adicionar aos Leads" abre `import-dialog` (responsável, funil, etapa, tags, opções de dedup, score mínimo). Após importar: badge "Adicionado" + link para `/leads`.
- Seleção em massa: toolbar com adicionar/ignorar/invalidar/etiquetar/atribuir/adicionar à lista/exportar CSV+XLSX.

## 8. Dedup

`detectDuplicate(result, leads[])` compara telefone normalizado, email lowercase, cnpj, domínio do site, similaridade de nome+cidade. Níveis: **confirmada** (match forte), **possível** (match parcial), **novo**. Modal de importação exibe os conflitos por linha e permite: ignorar, atualizar existente, criar novo.

## 9. Permissões

Reusar `useMyCommercialRole`/`has_commercial_role`:
- `visualizador`: ver módulo + resultados próprios.
- `comercial`: gerar, importar, favoritar, criar listas/perfis.
- `admin`: excluir searches, configurar provedores, editar pesos, ver custos.

RLS reforça no backend; server fns checam `can_edit_commercial` / `is_tenant_admin` conforme ação.

## 10. Exportação

`src/lib/prospecting-exports.ts` reaproveitando padrão de `consultor-exports.ts` (CSV + XLSX via `xlsx` já instalado? Se não, usar `papaparse` + JSON download; XLSX apenas se lib disponível).

## 11. Segurança / LGPD

- Todos os server fns com `requireSupabaseAuth` + verificação de role.
- Chaves só em `process.env`, nunca no client.
- Rate limit por tenant (contador em `prospecting_sources.usado_mes`).
- Motivo de descarte visível — nada removido silenciosamente.
- Ação "Excluir dados" em cada resultado/lead conforme LGPD.
- Sanitização de entrada (zod) + escape em queries por PostgREST.
- Dados demo marcados com badge "Simulado" visível; bloqueio de import em prod.

## 12. Estados de UI

Empty (primeira uso com CTA "Criar primeira pesquisa"), loading (skeletons), searching (progresso por etapa), no-results, provider-error, missing-credentials (com link para Configurações), quota-exceeded, partial-result, duplicate-warning, import-success, import-error, permission-denied, stale-data.

## 13. Ordem de execução

1. Migração DB + RLS + seed de `prospecting_score_rules`.
2. Types + `src/lib/prospecting/` (score, dedup, normalize, provider interface, mock adapter).
3. `prospecting.functions.ts` (runSearch, import, listas, perfis, sources).
4. Hooks React Query (`use-prospecting.ts`).
5. Rotas + componentes de UI.
6. Adicionar item no bottom nav Comercial.
7. Testes manuais via Playwright autenticado no smoke existente.
8. Resumo técnico ao usuário.

## Detalhes técnicos (para revisão)

- Todas as tabelas seguem o bloco `CREATE TABLE → GRANT authenticated + service_role → ENABLE RLS → CREATE POLICY` com `is_tenant_member` / `can_edit_commercial` / `can_delete_commercial`.
- Servidor: `createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(zod).handler(...)`; `supabaseAdmin` só se necessário para bypass (não previsto aqui).
- Cliente Supabase pelo `@/integrations/supabase/client` para leituras não sensíveis (RLS aplica).
- Sem `useEffect + fetch`; padrão `queryOptions` + `useQuery`.
- Sem quebrar rotas existentes; apenas adição.

## Fora deste escopo (a combinar depois)

- Ativação real de Google Places / ReceitaWS / provedores B2B pagos — requer o usuário fornecer chaves via `add_secret`.
- Automações recorrentes (executar perfil em cron) — estrutura pronta, gatilho não ativado.
- Envio automático de mensagens de abordagem.

Ao aprovar, começo pela migração de banco (uma call), depois entrego as demais camadas em ondas.
