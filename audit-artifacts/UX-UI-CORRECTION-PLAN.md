# Plano de correção UX/UI — Align CRM

Base: `UX-UI-AUDIT-POST-FIX.md`, de 20/07/2026.
Premissa de estimativa: equipe pequena com frontend, backend/Supabase e QA.
Objetivo: recuperar confiança nos dados, remover obstáculos operacionais e tornar as jornadas principais rápidas, claras, responsivas e acessíveis.

## Resultado esperado

Ao final do plano:

- nenhum nome ou texto será exibido com codificação corrompida;
- a navegação não cobrirá conteúdo ou ações em nenhum viewport suportado;
- Leads e Pipeline continuarão utilizáveis com centenas ou milhares de registros;
- dados de demonstração serão inequivocamente separados de dados reais;
- notificações serão resumidas e priorizadas, não geradas como ruído;
- módulos indisponíveis serão identificados antes da navegação;
- controles terão rótulos acessíveis, foco visível e operação por teclado;
- estados vazios e bloqueios oferecerão uma próxima ação útil.

## Regras de execução

1. Fases 0 e 1 bloqueiam expansão do uso do CRM.
2. Cada item deve incluir teste de regressão proporcional ao risco.
3. Alterações de dados devem ter backup, dry run, relatório de impacto e rollback.
4. Componentes compartilhados devem ser corrigidos na origem, evitando patches por página.
5. Nenhum KPI de produção pode considerar registros Demo.
6. Uma fase só termina quando seu gate for demonstrado nos viewports definidos.
7. Mudanças visuais devem preservar o design system existente e reduzir variações desnecessárias.

## Visão geral

| Fase | Foco | Estimativa | Dependência | Gate |
|---|---|---:|---|---|
| 0 | Baseline e contenção | 1–2 dias | — | Causas e métricas conhecidas |
| 1 | Confiança e conteúdo acessível | 3–5 dias | Fase 0 | UTF-8, Demo e dock corrigidos |
| 2 | Eficiência operacional | 5–8 dias | Fase 1 | Leads, Pipeline e Notificações escaláveis |
| 3 | Navegação e clareza | 3–5 dias | Fase 1 | Destinos e estados comunicam a verdade |
| 4 | Responsividade e acessibilidade | 4–6 dias | Fases 2 e 3 | Jornadas críticas passam em mobile, zoom e teclado |
| 5 | Validação e liberação | 2–4 dias | Fase 4 | Sem P0/P1 e métricas estáveis |

As Fases 2 e 3 podem ocorrer em paralelo depois do Gate 1, desde que não alterem simultaneamente o `AppShell`, o dock ou os mesmos componentes de tabela.

---

## Fase 0 — Baseline e contenção

### Objetivo

Confirmar as causas, impedir propagação dos defeitos e criar medidas comparáveis.

### Tickets

#### UX-001 — Mapear a corrupção de caracteres

- Identificar se a corrupção ocorre na fonte, importação CSV/XLSX, banco, API ou renderização.
- Contabilizar registros afetados por tabela e campo.
- Criar amostra com caracteres portugueses e teste de ida e volta em UTF-8.
- Bloquear novas importações que falhem na validação de encoding.

**Aceite:** relatório identifica origem e volume; uma importação com `José`, `Imóveis`, `Ofício`, `São` e `João` preserva todos os caracteres.

#### UX-002 — Medir sobreposição do dock

- Catalogar páginas, alturas e viewports em que o dock cobre conteúdo.
- Definir uma única estratégia: espaço reservado no layout, navegação lateral ou rodapé não sobreposto.
- Registrar capturas de baseline em 390 × 844, 768 × 1024 e 1440 × 900.

**Aceite:** estratégia aprovada e lista de componentes afetados fechada.

#### UX-003 — Separar ambiente Demo de produção

- Adicionar origem/tipo explícito aos resultados de prospecção.
- Suspender KPIs mistos enquanto a separação não estiver pronta.
- Confirmar que contatos `example.com` não podem ser importados ou acionados como reais.

**Aceite:** dado Demo não entra em KPI, exportação, importação ou contato de produção.

### Gate 0

- Novos dados não agravam a corrupção de caracteres.
- Registros Demo não influenciam decisões operacionais.
- Existe baseline visual das jornadas críticas.

---

## Fase 1 — Confiança e conteúdo acessível

### Objetivo

Corrigir os dois P0 da auditoria e o risco de confiança da prospecção.

### Tickets

#### UX-101 — Corrigir UTF-8 na origem e nos dados existentes

- Corrigir o ponto de entrada que produz mojibake.
- Criar migração idempotente para registros cuja conversão seja inequívoca.
- Enviar casos ambíguos para revisão, sem converter automaticamente.
- Revisar Leads, Pipeline, Notificações, exportações e mensagens.

**Aceite:** zero ocorrências conhecidas de mojibake nas telas e exportações; migração possui backup, dry run e rollback.

#### UX-102 — Eliminar sobreposição da navegação

- Implementar a estratégia definida em UX-002 no shell compartilhado.
- Reservar área segura inferior quando o dock estiver presente.
- Garantir que tabelas, sheets, diálogos e painéis não terminem atrás da navegação.
- Tratar safe area de dispositivos móveis.

**Aceite:** nenhum conteúdo, linha ou CTA fica coberto nos três viewports e com zoom de 200%.

#### UX-103 — Tornar o modo Demo inequívoco

- Trocar a promessa “leads reais” quando a fonte ativa for simulada.
- Exibir banner persistente e diferenciação visual no modo Demo.
- Calcular KPIs separadamente ou ocultá-los quando não houver dados reais.
- Bloquear contatos, importação e exportação de identidades simuladas.

**Aceite:** cinco usuários de teste identificam o modo Demo sem abrir detalhes; nenhum dado simulado entra no CRM real.

### Gate 1

- Zero texto corrompido na amostra e nas páginas auditadas.
- Zero sobreposição visual nos viewports-alvo.
- Demo e produção são separados em dados, KPIs e ações.

---

## Fase 2 — Eficiência operacional

### Objetivo

Reduzir tempo de busca, triagem e movimentação de grandes volumes.

### Tickets

#### UX-201 — Busca de Leads sempre disponível

- Manter busca visível no cabeçalho da lista.
- Separar busca rápida de filtros avançados.
- Mostrar chips de filtros ativos, contagem e ação “Limpar”.
- Persistir busca, filtros e ordenação na URL ou no estado da sessão.

**Aceite:** localizar um lead exige no máximo uma ação antes de digitar; reload preserva o contexto.

#### UX-202 — Pipeline compacto e escalável

- Adicionar busca e filtros por responsável, etapa, score, origem e período.
- Criar modo compacto com campos essenciais.
- Aplicar virtualização ou paginação por coluna.
- Adicionar seleção e movimentação em lote.
- Remover ou simplificar o resumo duplicado superior.
- Tornar a rolagem horizontal evidente e preservar cabeçalhos das etapas.

**Aceite:** pipeline com 1.000 leads mantém interação fluida; usuário encontra e move um lead sem percorrer a coluna inteira.

#### UX-203 — Notificações agrupadas e priorizadas

- Agrupar eventos em lote: “228 leads importados”.
- Adicionar categorias, prioridade e filtro por lida/não lida.
- Usar `50+` ou limite documentado no badge.
- Permitir expandir o grupo para detalhes e falhas individuais.
- Evitar notificação individual quando o evento pai já representa a operação.

**Aceite:** uma importação produz um resumo e, quando necessário, um grupo expansível; nenhuma lista de dezenas de itens repetidos.

#### UX-204 — Reduzir densidade da Prospecção

- Priorizar nome, local, score, origem e ação principal.
- Mover detalhes secundários para expansão ou drawer.
- Manter seleção e importação visíveis durante rolagem.
- Explicar claramente por que “Importar” está desabilitado.

**Aceite:** seleção, revisão e importação permanecem visíveis e compreensíveis sem rolagem lateral no desktop.

### Gate 2

- Leads, Pipeline e Prospecção passam teste com volumes realistas.
- Importações não inundam a central de notificações.
- Filtros têm estado visível, removível e persistente.

---

## Fase 3 — Navegação, estados e linguagem

### Objetivo

Fazer a interface comunicar capacidade, contexto e próxima ação antes do clique.

### Tickets

#### UX-301 — Sinalizar módulos indisponíveis no menu

- Marcar itens como “Em breve”, “Beta” ou “Não contratado”.
- Desabilitar ou ocultar destinos sem ação útil, conforme papel e entitlement.
- Reduzir o menu Operacional por frequência ou permitir busca.
- Não misturar módulos indisponíveis com destinos operacionais sem diferenciação.

**Aceite:** o usuário sabe o estado do módulo antes de navegar.

#### UX-302 — Criar saídas úteis para telas indisponíveis

- Chat: oferecer retorno, alternativa disponível e informação sobre liberação.
- Módulo não contratado: manter o shell e oferecer contato com administrador/comercial quando aplicável.
- Preservar contexto e última rota segura.

**Aceite:** nenhuma tela indisponível termina sem uma próxima ação válida.

#### UX-303 — Redesenhar estados vazios

- Dashboard sem receita: substituir gráfico inútil por explicação e CTA contextual.
- Campanhas vazias: explicar benefício, passos e oferecer modelo inicial.
- Não repetir a ausência de dados em KPIs e tabela quando isso não agrega informação.

**Aceite:** cada estado vazio explica o que aconteceu e oferece uma ação possível.

#### UX-304 — Unificar salvamento em Configurações

- Definir salvamento por seção ou um único salvamento global.
- Mostrar estado alterado, salvando, sucesso e erro.
- Separar visualmente preferências pessoais e configurações do workspace.
- Avisar sobre alterações não salvas ao trocar de seção.

**Aceite:** usuários de teste identificam corretamente qual botão salva cada campo; reload confirma persistência.

#### UX-305 — Reduzir competição entre ações primárias

- Manter “Novo lead” global apenas onde for útil como atalho universal.
- Em páginas com CTA contextual, remover duplicação ou rebaixar a ação global.
- Definir uma ação primária por região visual.

**Aceite:** cada tela tem hierarquia inequívoca entre ação primária e secundárias.

### Gate 3

- Nenhum destino esconde seu estado até depois do clique.
- Estados vazios, bloqueados e indisponíveis têm próxima ação.
- Configurações possuem um modelo de salvamento compreensível.

---

## Fase 4 — Responsividade e acessibilidade

### Objetivo

Garantir que as jornadas principais funcionem em telas menores, zoom e tecnologias assistivas.

### Tickets

#### UX-401 — Nome e finalidade de controles

- Inventariar botões somente com ícone.
- Adicionar nome acessível único a ações de IA, excluir, adicionar etapa, WhatsApp e controles em tabelas.
- Complementar ícones ambíguos com texto ou tooltip persistente quando necessário.

**Aceite:** auditoria automática e inspeção do DOM não encontram botão sem nome acessível.

#### UX-402 — Teclado e foco

- Validar ordem de tabulação, foco visível, Escape e retorno de foco.
- Testar dock, menus, notificações, filtros, drawers e diálogos.
- Impedir que elementos atrás de modais recebam foco.

**Aceite:** Login → Dashboard → Leads → Filtros → Detalhe funciona apenas por teclado.

#### UX-403 — Reflow e zoom

- Testar 390 × 844, 768 × 1024, 1440 × 900 e zoom de 200%.
- Adaptar tabelas para cards ou rolagem com affordance e colunas prioritárias.
- Garantir alvos de toque adequados e safe areas.
- Validar textos longos, nomes de leads e localização em português.

**Aceite:** nenhum CTA crítico é cortado, coberto ou exige rolagem bidimensional não sinalizada.

#### UX-404 — Contraste e comunicação de estado

- Medir contraste de textos cinza, bordas, placeholders, badges e estados desabilitados.
- Não depender exclusivamente de cor para status, erro, seleção ou sucesso.
- Revisar foco, hover, pressed e disabled em tema claro e escuro.

**Aceite:** componentes críticos atendem WCAG 2.2 AA nos critérios verificáveis do escopo.

### Gate 4

- Zero controles sem nome acessível.
- Jornadas críticas funcionam por teclado e nos viewports definidos.
- Contraste e estados de foco passam a verificação acordada.

---

## Fase 5 — Validação e liberação controlada

### Objetivo

Comprovar que as correções melhoram eficácia sem introduzir regressões.

### Testes finais

- Repetir as 11 capturas da auditoria no mesmo estado e viewport.
- Executar regressão visual em tema claro e escuro.
- Smoke: Dashboard, busca de Leads, filtros, Pipeline, Prospecção, Campanhas, Configurações, Notificações e bloqueios.
- Validar perfis administrador e membro comum.
- Validar workspace geral e, quando disponíveis, clínica e escola.
- Rodar testes com 1.000 leads, importação em lote e 100 notificações históricas.

### Métricas de eficácia

| Métrica | Meta |
|---|---:|
| Registros exibidos com mojibake | 0 |
| Conteúdo ou CTA coberto pelo dock | 0 |
| Botões sem nome acessível | 0 |
| Dados Demo em KPI/ação de produção | 0 |
| Notificações visíveis por importação bem-sucedida | 1 resumo |
| Tempo para localizar um lead conhecido | ≤ 10 s |
| Tempo para mover um lead no pipeline | ≤ 15 s |
| Tarefas críticas concluídas por teclado | 100% |
| P0/P1 abertos no release | 0 |

### Estratégia de release

1. Homologação com dados anonimizados e volume realista.
2. Liberação interna para equipe operacional.
3. Canary em um workspace controlado.
4. Monitoramento de erros, tempo de tarefa, abandono e feedback por 48–72 horas.
5. Expansão gradual após aprovação das métricas.

### Gate 5

- Todos os critérios das fases anteriores passam novamente.
- Nenhum P0 ou P1 permanece aberto.
- Não há regressão visual ou funcional nas jornadas críticas.
- Canary permanece estável durante a janela definida.

---

## Sequência recomendada dos primeiros PRs

1. `UX-001/101` — diagnóstico, proteção de importação e correção UTF-8.
2. `UX-002/102` — layout do shell e remoção da sobreposição do dock.
3. `UX-003/103` — separação completa de Demo e produção.
4. `UX-201` — busca permanente e filtros persistentes em Leads.
5. `UX-203` — agrupamento de notificações.
6. `UX-202` — pipeline compacto, filtrável e virtualizado.
7. `UX-301/302` — estados de módulos no menu e saídas úteis.
8. `UX-303/304/305` — estados vazios, salvamento e hierarquia de CTAs.
9. `UX-401/402` — nomes acessíveis, teclado e foco.
10. `UX-403/404` — responsividade, zoom e contraste.

## Definição de pronto

Um ticket só está concluído quando:

- causa e impacto estão documentados;
- critérios de aceite foram demonstrados;
- teste de regressão foi incluído;
- loading, vazio, erro, sucesso e indisponibilidade foram considerados;
- desktop, mobile, zoom e teclado foram verificados quando aplicável;
- analytics ou observabilidade foram incluídos para falhas relevantes;
- documentação e capturas foram atualizadas;
- QA aprovou em homologação.
