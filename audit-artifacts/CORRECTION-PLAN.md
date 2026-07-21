# Plano de correção por fases — Align CRM

Baseado na auditoria de 20/07/2026. Este plano prioriza redução de risco, correção de causas estruturais e validação incremental. As durações são estimativas para uma equipe pequena com frontend, backend/Supabase e QA; devem ser recalibradas após a Fase 0.

## Objetivo

Transformar o CRM em uma base confiável para produção, garantindo que:

- dados exibidos sejam completos, consistentes e pertencentes ao tenant correto;
- erros nunca sejam apresentados como listas vazias;
- rotas respeitem tenant, segmento, papel e entitlement;
- controles visíveis executem o comportamento prometido;
- módulos incompletos não pareçam ativos;
- contatos por WhatsApp respeitem consentimento e cadência;
- os fluxos críticos tenham testes automatizados e observabilidade.

## Regras de execução

1. Não iniciar melhorias cosméticas antes do Gate 2, exceto correções que reduzam risco imediato.
2. Cada bug corrigido deve receber ao menos um teste de regressão.
3. Migrações de banco devem ser idempotentes, revisadas e validadas em ambiente separado antes da produção.
4. Toda tela baseada em query deve distinguir carregamento, sucesso vazio, erro e indisponibilidade.
5. Funcionalidades incompletas devem ficar sob feature flag, indisponíveis ou claramente marcadas como demonstração.
6. O lint deve usar redução progressiva; não misturar centenas de ajustes de formatação com correções funcionais.
7. Nenhuma fase é considerada concluída somente porque o código foi mesclado; os critérios do gate precisam passar.

## Visão geral

| Fase | Foco | Duração estimada | Gate principal |
|---|---|---:|---|
| 0 | Contenção e instrumentação | 1–2 dias | Riscos imediatos bloqueados e baseline registrado |
| 1 | Banco, RLS e estados de erro | 3–5 dias | Nenhum erro de banco aparece como estado vazio |
| 2 | Tenant, autorização e rotas | 3–5 dias | Dados consistentes e matriz de acesso aprovada |
| 3 | Verdade do produto e navegação | 3–5 dias | Nenhum controle ou módulo comunica capacidade inexistente |
| 4 | Fluxos funcionais e WhatsApp | 5–8 dias | Ações principais persistem e contato é governado |
| 5 | Mobile, acessibilidade e UX | 3–5 dias | Jornadas críticas aprovadas nos viewports-alvo |
| 6 | Qualidade, regressão e release | 3–5 dias | Release candidate passa testes e smoke de produção |

As Fases 1 e 2 devem ser majoritariamente sequenciais. Após o Gate 2, partes das Fases 3, 4 e 5 podem ocorrer em paralelo, desde que não alterem os mesmos componentes centrais.

---

## Fase 0 — Contenção e instrumentação

### Objetivo

Impedir novos danos enquanto as causas estruturais são corrigidas e criar uma linha de base mensurável.

### Ações

- Desabilitar temporariamente os atalhos de WhatsApp para leads sem consentimento verificável.
- Colocar Chat, E-mail Marketing e Landing Pages atrás de feature flags; alternativa temporária: mostrar “Em desenvolvimento” sem KPIs ou status “Ativo”.
- Remover o selo estático “Ao vivo” ou substituir por estado neutro até existir monitoramento real.
- Adicionar tratamento global para erros inesperados de autenticação e queries, com mensagem, retry e identificador de ocorrência.
- Registrar eventos mínimos: falha de login, falha de query, tenant ausente, acesso negado, falha de realtime e ação bloqueada por consentimento.
- Catalogar tabelas, policies, papéis, segmentos e rotas em uma matriz única.
- Definir ambientes de desenvolvimento, homologação e produção, incluindo processo de backup e rollback de migrações.

### Entregáveis

- Feature flags/kill switches documentados.
- Matriz inicial de acesso e RLS.
- Baseline de erros e jornadas críticas.
- Lista congelada de P0/P1 com responsáveis.

### Gate 0

- Nenhum módulo demonstrativo é apresentado como operacional.
- Lead sem consentimento não pode iniciar contato pelo CRM.
- Falhas críticas ficam visíveis e rastreáveis.
- Existe rollback definido para mudanças de banco e autenticação.

---

## Fase 1 — Banco, RLS e semântica de erros

### Objetivo

Restabelecer a confiabilidade da camada de dados antes de alterar fluxos de produto.

### Ações de backend/Supabase

- Revisar grants, RLS e policies das tabelas com `permission denied`: `activities`, `ai_insights`, `automations`, `deals`, `financial_entries`, `financial_payments`, `kassia_conversations`, `notifications`, `projects`, `tasks` e `user_commercial_roles`.
- Criar uma matriz de testes com pelo menos: usuário sem tenant, membro comum, gestor/admin do tenant e usuário de outro tenant.
- Corrigir a assinatura realtime que filtra por `user_id` inválido; definir filtros apenas em colunas existentes e indexadas.
- Garantir que todas as queries e mutações filtrem pelo tenant ou dependam de RLS comprovada.
- Validar migrações em banco limpo e em cópia compatível com o estado atual.

### Ações de frontend

- Padronizar um estado de query com `loading`, `success`, `empty`, `error` e `offline`.
- Remover fallbacks que convertam exceções em `[]` sem preservar o erro.
- Adicionar ação de tentar novamente e mensagem útil nas páginas afetadas.
- Não exibir KPI zero quando a fonte correspondente falhar; usar estado indisponível.

### Testes obrigatórios

- Integração de leitura/escrita por tabela e papel.
- Isolamento: usuário do tenant A não lê nem altera dados do tenant B.
- Erro real de permissão produz UI de erro, não empty state.
- Queda do Supabase produz estado offline recuperável.

### Gate 1

- Zero `permission denied` nas jornadas autorizadas.
- Cem por cento dos testes negativos de RLS bloqueiam o acesso esperado.
- Nenhuma página auditada converte falha de query em “nenhum registro”.
- Realtime conecta com filtro válido ou comunica claramente que está offline.

---

## Fase 2 — Tenant, autorização e proteção de rotas

### Objetivo

Eliminar divergência de dados e impedir acesso direto a módulos fora do segmento ou papel.

### Ações

- Remover a dependência de `_activeTenantId` global como fonte de verdade.
- Fazer o tenant vir do contexto/rota e expor estados explícitos: `resolving`, `ready`, `not-found` e `forbidden`.
- Somente habilitar queries depois que `tenantId` estiver resolvido.
- Incluir `tenantId` estável em todas as query keys e invalidar caches ao trocar de tenant.
- Uniformizar rotas sob o tenant ou criar uma estratégia documentada de resolução para URLs globais.
- Implementar guards reutilizáveis por autenticação, tenant, segmento, papel e entitlement.
- Proteger `/clinicas/*`, `/escolar/*`, `/consultor/*`, `/portal-aluno` e `/super-admin` no carregamento da rota, não apenas no menu.
- Separar o shell do Portal do Aluno do shell administrativo.

### Testes obrigatórios

- Acesso por navegação interna, URL direta, reload e nova aba.
- Troca de tenant sem dados residuais do tenant anterior.
- Dashboard, Leads, Pipeline e Oportunidades retornam os mesmos totais para os mesmos filtros.
- Matriz de rotas executada para cada segmento e papel.

### Gate 2

- Reload em `/leads` e `/pipeline` preserva os dados corretos.
- Divergência entre dashboard e páginas detalhadas é zero para filtros equivalentes.
- Cem por cento das combinações proibidas da matriz retornam acesso negado ou redirecionamento seguro.
- Nenhum dado de tenant anterior permanece após troca de workspace.

---

## Fase 3 — Verdade do produto, shell e navegação

### Objetivo

Alinhar o que a interface promete com o que realmente existe.

### Ações

- Definir o destino de Chat, E-mail Marketing e Landing Pages: implementar, manter indisponível ou assumir explicitamente como demonstração.
- Remover dados hardcoded, persistência local e selo “Ativo” de módulos que deveriam usar backend.
- Integrar Campanhas ao `AppShell`, breadcrumbs, permissões e navegação responsiva.
- Transformar `RealtimeBadge` em componente derivado do estado real: conectando, ao vivo, reconectando e offline.
- Revisar todos os CTAs principais e criar um inventário: rótulo, comportamento esperado, estado atual, analytics e teste.
- Corrigir o significado de “+ Novo”: abrir criação com contexto ou renomear para “Ver leads”.
- Implementar busca global de verdade ou remover o campo até ela estar pronta.
- Padronizar títulos, metadata e nomenclatura dos módulos.

### Testes obrigatórios

- Contract test para cada CTA primário visível.
- Campanhas mantém shell e navegação em desktop e mobile.
- Badge realtime acompanha conexão simulada, desconexão e reconexão.
- Busca informa carregamento, resultado, vazio e erro.

### Gate 3

- Nenhum botão primário auditado é decorativo.
- Nenhum módulo demonstrativo aparece como produção.
- Todas as páginas autenticadas usam o shell correto para seu público.
- Busca e realtime possuem estados verificáveis ou permanecem desligados.

---

## Fase 4 — Fluxos funcionais e governança do WhatsApp

### Objetivo

Concluir os contratos de uso centrais e tornar o contato comercial seguro e auditável.

### Configurações e ações principais

- Persistir configurações no backend com validação, loading, sucesso e erro.
- Recarregar a página e confirmar que toggles e permissões permanecem salvos.
- Implementar criação contextual para Lead, Oportunidade, Tarefa e demais ações principais expostas.
- Restaurar a busca/resultados selecionados na Prospecção e manter coerência entre histórico, KPIs e tabela atual.
- Definir quando exportações ficam habilitadas e explicar o motivo quando bloqueadas.

### WhatsApp

- Criar estados explícitos de consentimento: desconhecido, consentido, revogado e opt-out.
- Registrar origem, data, finalidade e responsável pelo consentimento.
- Bloquear contato para opt-out, consentimento ausente ou número inválido.
- Definir janela de contato, limites por período, cooldown e regra de recontato.
- Implementar templates aprovados quando o modelo de integração exigir.
- Exibir confirmação antes do primeiro contato e contexto do consentimento.
- Registrar tentativa, operador, template/mensagem, resultado, falha e opt-out.
- Preferir integração oficial quando houver automação; links manuais não devem ser usados como mecanismo de disparo em massa.
- Criar kill switch por tenant e limite conservador configurável.

### Testes obrigatórios

- Configurações persistem após reload e em nova sessão.
- Consentimento revogado bloqueia qualquer novo contato.
- Limite/cooldown bloqueia contatos repetidos.
- Falha de envio não é registrada como sucesso.
- KPIs de prospecção correspondem ao conjunto selecionado.

### Gate 4

- Cem por cento das configurações visíveis possuem contrato persistente ou são removidas.
- Ações principais concluem com feedback e efeito observável.
- Nenhum contato WhatsApp ocorre sem cumprir as regras definidas.
- Existe trilha de auditoria para todas as tentativas de contato.

---

## Fase 5 — Mobile, acessibilidade e refinamento de UX

### Objetivo

Corrigir atritos visuais e garantir operação das jornadas críticas por teclado e telas menores.

### Ações

- Remover `user-scalable=no` e validar zoom de 200%.
- Adicionar nomes acessíveis a botões somente com ícone.
- Corrigir foco inicial, trap de foco, Escape e retorno de foco em diálogos/sheets.
- Eliminar os dois controles indistinguíveis chamados “Fechar” no menu móvel.
- Ajustar cabeçalho mobile para impedir quebra de “Esta semana” e “Novo lead”.
- Substituir tabelas críticas por cards/listas responsivas ou fornecer rolagem com affordance claro.
- Reduzir a interrupção do onboarding; permitir adiar, retomar e não reabrir indevidamente.
- Validar contraste, estados de foco, alvos de toque e mensagens associadas aos campos.

### Viewports de aceite

- 390 × 844: celular.
- 768 × 1024: tablet.
- 1440 × 900: desktop.
- Zoom de 200% no desktop.

### Gate 5

- Jornadas Login → Dashboard → Leads → Detalhe → Ação funcionam por teclado.
- Nenhum conteúdo ou CTA crítico fica cortado nos viewports definidos.
- Todos os controles interativos possuem nome acessível único.
- Onboarding não impede o usuário recorrente de trabalhar.

---

## Fase 6 — Qualidade, regressão e liberação controlada

### Objetivo

Impedir reincidência e liberar as correções com risco controlado.

### Estratégia de testes

- Unitários: guards, regras de consentimento, normalização de erros e resolução de tenant.
- Integração: hooks Supabase, RLS, persistência de configurações e query states.
- E2E/smoke: login, deep link, troca de tenant, leads, pipeline, configurações, busca, campanhas e bloqueios de WhatsApp.
- Visual: screenshots dos viewports da Fase 5 para páginas críticas.

### Lint e manutenção

- Corrigir primeiro erros de hooks e expressões inválidas.
- Separar formatação mecânica em PR próprio para reduzir conflito e ruído.
- Criar baseline temporário para dívida existente e impedir novas violações.
- Reduzir `no-explicit-any` por domínio, começando por tenant, auth, leads e integrações.
- Tratar warnings de build e revisar tamanho de chunks/ativos.

### Estratégia de release

1. Homologação com migração ensaiada e smoke completo.
2. Liberação para equipe interna.
3. Canary para um tenant controlado.
4. Monitoramento de erros, divergência de KPIs, acessos negados e ações WhatsApp.
5. Ampliação gradual somente se os indicadores permanecerem estáveis.

### Gate 6

- Build, testes unitários, integração e smoke passam no pipeline.
- Nenhum P0 ou P1 aberto.
- Não existem novas violações de lint em arquivos alterados.
- Migração e rollback foram ensaiados.
- Canary permanece estável durante a janela definida pela equipe.

---

## Métricas de eficácia

Medir antes da Fase 1 e após cada release:

- taxa de queries que terminam em erro;
- quantidade de erros silenciosos convertidos em empty state — meta: zero;
- divergência de totais entre dashboard e páginas detalhadas — meta: zero;
- aprovação da matriz de acesso — meta: 100%;
- CTAs primários sem comportamento — meta: zero;
- configurações salvas com sucesso e confirmadas após reload;
- reconexões/falhas de realtime e tempo em estado offline;
- tentativas WhatsApp bloqueadas por ausência de consentimento, opt-out ou cadência;
- reclamações, bloqueios e banimentos relacionados a mensageria;
- taxa de sucesso das jornadas E2E críticas;
- erros de frontend por sessão e tempo médio de recuperação.

## Organização recomendada do trabalho

### Frentes

- **Dados e segurança:** RLS, policies, tenant, guards, realtime e migrações.
- **Produto e frontend:** query states, shell, CTAs, configurações, busca e módulos.
- **Mensageria:** consentimento, cadência, integração e auditoria de WhatsApp.
- **Qualidade:** matriz de testes, automação, acessibilidade, observabilidade e release.

### Tamanho dos PRs

- Um objetivo funcional por PR.
- Migrações e mudanças de UI relacionadas podem estar no mesmo PR somente quando o teste de integração comprovar o contrato completo.
- Evitar PR único para toda a dívida de lint ou toda a refatoração de tenant.

### Sequência sugerida dos primeiros tickets

1. Kill switch do WhatsApp e feature flags dos módulos stub.
2. Componente padrão de erro/empty/loading para queries.
3. Correção das policies das tabelas P0 com testes de isolamento.
4. Refatoração do tenant e testes de reload/deep link.
5. Guards por segmento/papel e separação do Portal do Aluno.
6. Realtime com estado verdadeiro.
7. Campanhas dentro do AppShell.
8. Persistência das Configurações.
9. Busca global e criação contextual.
10. Consentimento/cadência/auditoria completos para WhatsApp.

## Definição de pronto por item

Um item só está pronto quando:

- causa raiz e impacto estão documentados;
- código e migração, se houver, foram revisados;
- teste de regressão foi adicionado;
- estados loading, empty, error e sucesso foram considerados;
- acesso entre tenants e papéis foi validado quando aplicável;
- desktop, mobile e teclado foram verificados quando houver UI;
- observabilidade foi incluída para falhas relevantes;
- critério de aceite foi demonstrado em homologação.
