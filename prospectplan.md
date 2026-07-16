# Plano de implementação — Prospecção B2B

Este documento acompanha a evolução do módulo de Prospecção B2B do Align CRM. As fases são executadas em ordem e somente avançam quando seus critérios mínimos de aceite estiverem verificados.

## Teste local

- A Supabase CLI está instalada como dependência de desenvolvimento.
- Execute `npm run local:setup` para subir o Supabase, aplicar migrations/seed e gerar `.env.development.local` (usado somente pelo Vite em desenvolvimento).
- Depois do setup, execute `npm run local:dev` para iniciar Functions e frontend juntos.
- Alternativamente, em terminais separados, execute `npm run local:functions` e `npm run dev`.
- Usuário local: `prospecting.local@alignfy.test`; senha: `Prospecting123!`; tenant: `/t/prospeccao-local/prospeccao`.
- No Windows, Docker Desktop + WSL 2 precisam estar instalados e em execução.

## Princípios

- Preservar isolamento por tenant e as permissões comerciais existentes.
- Manter operações críticas no backend e nunca expor segredos no frontend.
- Não importar dados simulados em produção.
- Fazer migrações aditivas e seguras; não reescrever migrações já aplicadas.
- Tornar busca e importação idempotentes, auditáveis e recuperáveis.
- Reutilizar o design system, os componentes e as estruturas do CRM.

## Fase 1 — Base segura e integridade

Status: implementada localmente; aplicação/validação no Supabase conectado pendente. Em 15/07/2026, o endpoint remoto `prospecting-search` respondeu HTTP 404, confirmando que as Edge Functions ainda não foram publicadas.

- [x] Instalar dependências e registrar o baseline de build/lint.
- [ ] Confirmar a situação das migrações localmente e no ambiente conectado.
- [x] Criar migração corretiva com constraints de score, tier, confiabilidade e status.
- [x] Garantir consistência de tenant entre pesquisas, resultados, listas e itens.
- [x] Adicionar índices de status, segmento, favoritos e datas.
- [x] Criar `prospecting_validation_logs`.
- [x] Criar vínculo estruturado entre lead, resultado e pesquisa de origem.
- [x] Adicionar chave de idempotência e impedir reimportação acidental.
- [x] Bloquear importação de dados demo fora de ambiente explicitamente permitido.

Critério de aceite: dados inválidos ou cruzados entre tenants são recusados e resultados demo não entram no CRM em produção.

## Fase 2 — Busca no backend, deduplicação e score

Status: implementada localmente.

- [x] Criar contrato de providers e mover o mock para código compartilhado do backend.
- [x] Criar função `prospecting-search` com autenticação, tenant, permissões e sanitização.
- [x] Persistir etapas reais de busca e erros seguros.
- [x] Normalizar telefone, WhatsApp, e-mail, CNPJ, domínio, redes sociais e nome/endereço.
- [x] Deduplicar dentro da resposta, entre pesquisas anteriores e contra o CRM.
- [x] Separar duplicidade confirmada, possível e novo, com confiança e motivos.
- [x] Consumir `prospecting_score_rules` e versionar a regra usada.
- [x] Registrar evidências de score e validação sem afirmar validação externa inexistente.

Critério de aceite: o navegador apenas solicita a busca; o backend entrega resultados normalizados, explicáveis e isolados por tenant.

## Fase 3 — Importação transacional e idempotente

Status: implementada localmente.

- [x] Criar RPC/função transacional de importação.
- [x] Revalidar duplicidade imediatamente antes de importar.
- [x] Suportar ignorar duplicados e atualizar cadastros existentes.
- [x] Bloquear resultados já importados e requisições repetidas.
- [x] Salvar score, resumo, sugestão, origem, tags, responsável e vínculos.
- [x] Atualizar resultado, pesquisa e log na mesma transação.
- [x] Retornar resumo por item: criado, atualizado, ignorado, duplicado ou falho.

Critério de aceite: repetir a mesma importação não cria leads extras e nenhuma falha deixa estado parcial.

## Fase 4 — Experiência completa da página

Status: parcialmente implementada.

- [ ] Completar todos os filtros principais, avançados, intenção e exclusões; o conjunto inicial de nicho, localização, contato, score, nota e reviews está disponível.
- [ ] Validar filtros compartilhando o mesmo schema do backend.
- [x] Exibir progresso real por polling ou Realtime.
- [x] Implementar estados principais de vazio, carregando, erro e limite.
- [x] Criar modal de importação com responsável, funil, etapa, tags e regras.
- [ ] Completar tabela, ordenação, paginação, cards e ações em massa.
- [ ] Completar drawer com evidências, histórico, duplicidades e link para o CRM.
- [x] Calcular KPIs agregados por tenant e período no backend.

Critério de aceite: todo o fluxo de pesquisa até abertura do lead no CRM funciona em desktop e mobile.

## Fase 5 — Histórico, perfis, listas e exportação

Status: parcialmente implementada.

- [x] Histórico básico com reabrir, repetir e excluir.
- [x] Criação, execução e exclusão de perfis de prospecção.
- [x] Criação de listas e inclusão em lote.
- [ ] Exportação CSV e XLSX protegida contra formula injection está implementada no cliente; falta auditoria backend por permissão.

Critério de aceite: pesquisas podem ser reutilizadas e seus resultados organizados ou exportados conforme permissão.

## Fase 6 — Providers reais, administração e conformidade

Status: parcialmente implementada.

- [x] Integrar um primeiro provider autorizado via backend.
- [x] Manter chaves exclusivamente em secrets.
- [ ] Implementar timeout, retry, rate limit, paginação, custo e health check.
- [x] Criar tela administrativa de provider, limites, score e retenção.
- [x] Adicionar permissões granulares de visualizar, buscar, importar, exportar e administrar.
- [ ] Implementar auditoria, retenção, minimização de `raw` e rotinas LGPD.

Critério de aceite: provider real opera sem segredo no cliente, com custo, limite, origem e auditoria rastreáveis.

## Fase 7 — Testes e rollout

Status: parcialmente implementada.

- [x] Testes unitários de normalização, dedup e score.
- [ ] Testes de banco/RLS com múltiplos tenants e papéis.
- [ ] Testes de idempotência e falhas transacionais.
- [ ] E2E de pesquisa, favoritos, duplicidade, importação, histórico e exportação.
- [ ] Verificação de acessibilidade e responsividade.
- [x] Build, TypeScript e testes unitários finais; lint global permanece com baseline legado.
- [ ] Rollout por feature flag, tenant piloto e monitoramento.

Critério de aceite: todos os gates automatizados passam e a liberação pode ser interrompida por feature flag sem perda de dados.

## Registro de execução

- 15/07/2026: Docker Desktop + WSL 2 configurados; dados do Docker movidos para `E:\DockerData` para preservar espaço no disco do sistema.
- 15/07/2026: reconstrução completa do banco local aprovada, incluindo todas as migrations e `supabase/seed.sql`.
- 15/07/2026: restauradas migrations-base ausentes para `proposals`, `knowledge_articles` e `marketing_campaigns`.
- 15/07/2026: busca mock validada pela Edge Function — 5 encontrados, 5 qualificados e `is_demo=true`.
- 15/07/2026: importação local validada — lead criado, tags aplicadas, resultado vinculado, log persistido e repetição idempotente sem lead adicional.
- 15/07/2026: frontend local respondeu HTTP 200 em `http://localhost:8080`; inspeção visual automatizada ficou indisponível por falha no controlador do navegador integrado.
- 15/07/2026: corrigidos grants de leitura de `profiles`, `user_roles`, `tenants` e `tenant_users`; o contexto passou a localizar o membership local e deixou de redirecionar continuamente ao onboarding.
- 15/07/2026: corrigida invalidação de cache de `prospecting-results` ao concluir uma busca; a tabela agora refaz a consulta e exibe um estado de erro acionável em vez de falso vazio.
