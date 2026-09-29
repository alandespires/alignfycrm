# Navegação, fluidez, busca global e padronização de painéis

## Objetivo

Evoluir a estrutura compartilhada do Align para que a navegação ocupe toda a lateral no desktop, as trocas de página preservem a interface e os dados em cache, o `Cmd+K` encontre registros reais e toda falha seja distinguida de um resultado vazio.

## 1. Estrutura global e navegação

- Transformar a navegação desktop em uma barra lateral de altura total, respeitando a área segura, com conteúdo distribuído verticalmente e sem alterar o comportamento dos menus Comercial, Operacional e Mais.
- Manter a barra inferior atual no mobile.
- Garantir que o cabeçalho e o `<main>` permaneçam montados durante a navegação.
- Completar metadados próprios (`head`) nas rotas de conteúdo que ainda não os possuem.

## 2. Carregamento e cache consistentes

- Extrair opções de consulta reutilizáveis para leads, clientes e oportunidades e pré-carregá-las nas rotas principais com `ensureQueryData`.
- Adotar o mesmo padrão progressivamente nas páginas de maior uso (dashboard, pipeline, tarefas, projetos, relatórios e módulos dos menus principais), sem duplicar consultas.
- Exibir skeleton apenas no primeiro carregamento sem cache; em atualizações silenciosas, manter os dados atuais e indicar atualização sem substituir toda a tela.
- Preservar dados entre páginas com chaves por tenant, tempos de cache consistentes e prefetch dos destinos de navegação.
- Criar estados compartilhados de carregamento, vazio e erro para tabelas, listas e páginas.

## 3. Transições sem travamento

- Remover o `AnimatePresence mode="wait"` que desmonta todo o conteúdo da página a cada troca.
- Animar somente a entrada da área nova, mantendo AppShell, cabeçalho e navegação estáveis.
- Usar transform/opacity de curta duração, cancelar animações concorrentes e respeitar `prefers-reduced-motion`.
- Evitar shimmer baseado em `background-position`; usar animação composta e limitar o efeito aos skeletons realmente visíveis.

## 4. AlignPanel global e acessível

- Fortalecer o `AlignPanel` com foco inicial, focus trap, restauração de foco, Escape, bloqueio de rolagem, `aria-labelledby`/`aria-describedby` e estrutura semântica correta.
- Migrar os overlays de funcionalidades que ainda são feitos manualmente para o AlignPanel, preservando os menus de navegação sem alteração.
- Cobrir formulários, confirmações, detalhes e previews com variantes apropriadas do mesmo painel, mantendo drawer lateral no desktop e bottom sheet no mobile.
- Remover overlays aninhados ou concorrentes que possam deixar a tela sem foco ou com rolagem bloqueada.

## 5. Busca real no Cmd+K

- Separar o `Cmd+K` do chat Launch: abrir uma busca global dedicada e manter o Launch no botão próprio.
- Buscar e filtrar leads, clientes e oportunidades do tenant com debounce, cache e agrupamento por tipo.
- Mostrar nome/título, empresa, status e valor relevantes, com loading, erro e vazio próprios.
- Ao selecionar um resultado, navegar para a seção correspondente e abrir o registro quando a tela já oferecer detalhe; caso contrário, destacar o registro via parâmetro de busca.
- Incluir ação explícita para enviar o texto ao Launch, sem misturar resultados de registros com respostas da IA.

## 6. Erros explícitos

- Impedir o padrão `data ?? []` de mascarar consultas com falha nas páginas prioritárias.
- Exibir mensagem de erro com tentativa novamente quando a consulta falhar e estado vazio somente quando a consulta concluir com zero registros.
- Manter o último conteúdo válido durante refetch; erros de atualização aparecem de forma não destrutiva.
- Ajustar o erro global para invalidar consultas e rotas corretamente.

## 7. Validação

- Testar navegação e altura da barra em desktop e mobile.
- Testar `Cmd+K`, busca com e sem resultados, teclado, foco, Escape e restauração de foco.
- Testar AlignPanel em desktop/mobile e verificar que nenhum overlay de funcionalidade antigo permanece.
- Simular falhas de consulta para confirmar que não aparecem como “sem dados”.
- Validar build, testes relevantes, console e screenshots Playwright autenticadas.

## Ordem de entrega

1. Fundação: AppShell, barra lateral, transições, estados compartilhados e AlignPanel acessível.
2. Dados: query options, loaders/prefetch e tratamento explícito de erros nas páginas prioritárias.
3. Busca global real no `Cmd+K`.
4. Migração dos overlays restantes para AlignPanel.
5. Auditoria semântica, metadados e testes desktop/mobile.

## Decisões técnicas

- Nenhuma mudança de banco é necessária para a busca: ela usa registros já protegidos por tenant.
- O cache continua pertencendo ao TanStack Query; loaders apenas aquecem o cache antes da página aparecer.
- O AppShell não terá mais saída animada; apenas o conteúdo novo recebe uma entrada discreta.
- Menus Comercial, Operacional e Mais permanecem com o comportamento atual, conforme solicitado anteriormente.
