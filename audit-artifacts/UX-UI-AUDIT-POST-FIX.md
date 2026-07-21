# Auditoria UX/UI — Align CRM pós-correções

Data: 20/07/2026
Escopo: dashboard, leads, filtros, pipeline, prospecção, campanhas, configurações, módulos indisponíveis, bloqueio de acesso, notificações e navegação operacional.
Viewport auditado: 1280 × 720, tema claro, workspace geral com perfil administrador.

## Veredito

O CRM está mais honesto e funcional depois das correções, mas ainda tem quatro problemas de alto impacto: dados com codificação corrompida, navegação flutuante cobrindo conteúdo, pipeline que não escala para centenas de leads e resultados de demonstração apresentados ao lado da promessa de leads reais. Esses pontos reduzem confiança, leitura e velocidade operacional.

## Pontos fortes confirmados

- Títulos, subtítulos e ações primárias mantêm uma hierarquia visual consistente.
- O WhatsApp indisponível não dispara uma ação arriscada; o controle possui explicação acessível no DOM.
- O pipeline comunica o estado de tempo real com texto, não apenas cor.
- Módulos incompletos deixaram de exibir números fictícios e informam claramente que estão em desenvolvimento.
- Filtros de leads têm rótulos, campos e contador de resultados compreensíveis.
- O bloqueio por módulo contratado impede acesso indevido e oferece retorno ao início.

## Falhas prioritárias

### P0 — Corrigir antes de ampliar o uso

1. **Texto e nomes corrompidos em toda a experiência.** Exemplos visíveis: `JosÃ©`, `ImÃ³veis`, `OfÃcio` e `ItaboraÃ`. O defeito aparece em Leads, Pipeline e Notificações. Impacto: leitura ruim, perda de confiança e risco de mensagens/comunicações saírem com o nome errado.
2. **A navegação flutuante cobre conteúdo operacional.** O dock se sobrepõe a linhas de leads, cartões do pipeline, preferências e ao gráfico do dashboard. Impacto: ações e dados ficam parcialmente inacessíveis exatamente na área de trabalho principal.

### P1 — Alto impacto operacional

3. **Pipeline não escala para 228 leads na mesma etapa.** A primeira coluna vira uma lista muito longa; etapas posteriores exigem rolagem horizontal e o resumo superior duplica informações das colunas. Faltam visão compacta, agrupamento, paginação/virtualização e meios rápidos de redistribuir o volume.
4. **Prospecção promete leads reais, mas mostra dados “Demo”.** A descrição diz “importe leads reais”, enquanto as linhas têm selo Demo e endereços `example.com`; os KPIs mostram 100% de qualificação. Essa combinação pode induzir o usuário a interpretar dados simulados como desempenho real.
5. **Menu Operacional mistura módulos prontos e indisponíveis.** E-mail, Landing Pages e Chat aparecem como destinos normais, sem selo “Em breve”. O usuário só descobre a indisponibilidade depois de navegar, criando becos sem saída.
6. **Central de notificações gera ruído em vez de prioridade.** Há 50 itens quase idênticos de uma mesma importação, sem agrupamento por evento, filtro ou categorias. O contador `50` também não comunica se existe limite/cap e compete visualmente com ações do cabeçalho.

### P2 — Clareza e eficiência

7. **Busca de leads fica escondida atrás de “Filtros”.** Com 228 registros, buscar é uma ação frequente, mas não está disponível no estado inicial da página.
8. **Dashboard dedica grande área a um gráfico sem dados.** O gráfico de receita mostra uma linha zerada e ocupa quase uma tela inteira; falta estado vazio com explicação e próxima ação.
9. **Configurações têm dois modelos de salvamento simultâneos.** “Salvar alterações” no topo e “Salvar perfil” aparecem juntos, sem deixar claro quais campos cada um controla. O subtítulo fala em workspace enquanto o primeiro painel é pessoal.
10. **Ações somente por ícone continuam ambíguas.** O DOM revelou botão sem nome acessível na tabela de Leads e botão sem nome no cabeçalho de etapa do Pipeline. Visualmente, ações como IA, remover e adicionar dependem fortemente do ícone.
11. **Estado vazio de Campanhas é pouco orientador.** Quatro KPIs zerados e uma tabela vazia repetem a ausência de dados; falta explicar o benefício, os passos ou oferecer um modelo inicial.
12. **Tela de Chat indisponível é honesta, mas não resolve a intenção.** Não há CTA para alternativa, documentação, lista de espera ou retorno ao módulo anterior.
13. **Bloqueio de módulo rompe o contexto do aplicativo.** A tela “Módulo não contratado” remove cabeçalho e navegação, parecendo uma página externa/erro. Também não oferece caminho para entender ou contratar o módulo.
14. **Ação “Novo lead” é repetida no cabeçalho e no conteúdo.** A duplicação aparece em várias telas e cria competição visual com ações específicas, como filtros, importação e seleção de período.

## Fluxo auditado

### 1. Dashboard — Saúde: atenção

![Dashboard](./ux-ui-post-fix/01-dashboard-desktop.png)

- Hierarquia geral clara e KPIs legíveis.
- Gráfico vazio usa espaço excessivo; dock cobre a parte inferior do conteúdo.
- Badge com 50 notificações domina o cabeçalho sem priorização.

### 2. Lista de leads — Saúde: crítica

![Lista de leads](./ux-ui-post-fix/02-leads-desktop.png)

- Nomes corrompidos comprometem confiança e leitura.
- Busca não aparece no estado inicial.
- Dock encobre linhas e ações; telefone desabilitado parece apenas um ícone apagado.

### 3. Filtros de leads — Saúde: atenção

![Filtros de leads](./ux-ui-post-fix/03-leads-filtros.png)

- Busca, status e total de resultados são claros depois de abertos.
- O filtro aberto empurra a tabela e não há indicação resumida de filtros ativos no estado fechado.
- A navegação continua cobrindo a tabela.

### 4. Pipeline — Saúde: crítica

![Pipeline](./ux-ui-post-fix/04-pipeline-desktop.png)

- Estado “Ao vivo” é claro e não depende só da cor.
- 228 cartões em uma coluna inviabilizam varredura rápida.
- Rolagens vertical e horizontal se combinam; o dock cobre cartões.
- O resumo superior repete contagens e valores já presentes nas colunas.

### 5. Prospecção — Saúde: crítica

![Prospecção](./ux-ui-post-fix/05-prospeccao-desktop.png)

- Fluxo de busca e filtros é visualmente compreensível.
- Promessa de dados reais conflita com selos Demo e contatos `example.com`.
- KPI de 100% qualificados cria confiança artificial em dados simulados.
- Tabela densa e dock cobrem parte da seleção/importação.

### 6. Campanhas — Saúde: atenção

![Campanhas](./ux-ui-post-fix/06-campanhas-desktop.png)

- Abas e CTA “Nova campanha” são claros.
- Quatro KPIs zerados e tabela vazia formam um estado vazio redundante.
- Falta orientação ou modelo inicial para reduzir o custo da primeira campanha.

### 7. Configurações — Saúde: atenção

![Configurações](./ux-ui-post-fix/07-configuracoes-desktop.png)

- Seções e rótulos são claros.
- “Salvar alterações” e “Salvar perfil” criam escopo ambíguo.
- O dock cobre parte das preferências; subtítulo do workspace não combina com dados pessoais.

### 8. Chat indisponível — Saúde: atenção

![Chat indisponível](./ux-ui-post-fix/08-chat-indisponivel.png)

- A tela é transparente sobre o estado do produto e sobre dados não armazenados.
- É um beco sem saída: não oferece alternativa nem próxima ação.
- O menu anterior não sinaliza que o destino ainda está em desenvolvimento.

### 9. Módulo bloqueado — Saúde: atenção

![Módulo bloqueado](./ux-ui-post-fix/09-modulo-bloqueado.png)

- Mensagem e retorno são diretos.
- Perda completa do shell causa ruptura de contexto.
- Falta explicar como habilitar o módulo ou falar com um administrador.

### 10. Notificações — Saúde: crítica

![Notificações](./ux-ui-post-fix/10-notificacoes.png)

- Ações em massa existem.
- A importação gera dezenas de notificações individuais quase idênticas.
- Falta agrupamento, prioridade, filtros e resumo por evento.
- A lista também propaga os nomes com codificação corrompida.

### 11. Menu Operacional — Saúde: atenção

![Menu Operacional](./ux-ui-post-fix/11-menu-operacional.png)

- Agrupamento por Trabalho, Marketing, Consultor e Suporte ajuda a leitura.
- O modal contém 18 destinos e ocupa grande parte da tela.
- Funcionalidades prontas e “em desenvolvimento” são visualmente indistinguíveis.
- A grande quantidade de opções reduz reconhecimento rápido e aumenta navegação por tentativa.

## Recomendações em ordem

1. Sanear a codificação dos dados na origem e validar UTF-8 na importação/exportação.
2. Reservar espaço real para o dock ou convertê-lo em navegação lateral/rodapé não sobreposto.
3. Redesenhar o pipeline para volume: modo compacto, busca, filtros persistentes, virtualização e ações em lote.
4. Separar visualmente ambiente Demo de dados reais; não calcular KPIs de produção sobre registros simulados.
5. Marcar ou ocultar módulos indisponíveis no menu antes do clique.
6. Agrupar notificações por evento (“228 leads importados”), com resumo, prioridade e filtros.
7. Tornar busca de leads sempre visível e revisar nomes acessíveis de todos os botões de ícone.
8. Substituir gráficos e tabelas zerados por estados vazios orientados à primeira ação.
9. Unificar o modelo de salvamento em Configurações ou explicitar escopo e estado alterado.

## Limites da evidência

- O navegador de auditoria ficou fixo em 1280 × 720; reflow mobile e zoom precisam de rodada separada em viewport móvel real.
- A auditoria combinou capturas e estrutura acessível do DOM, mas não substitui teste completo com teclado, leitor de tela ou medidor de contraste.
- Não foram auditados outros perfis, workspaces de clínica/escola, estados com campanhas reais nem o portal do aluno.
- Não foram disparadas operações externas, importações ou mensagens durante a auditoria.
