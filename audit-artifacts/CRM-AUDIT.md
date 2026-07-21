# Auditoria integral do Align CRM

Data: 20/07/2026
Escopo: rotas, fluxos principais, responsividade, acessibilidade básica, integrações locais, qualidade de código e controles de navegação.
Ambiente: aplicação local em `127.0.0.1:8081`, Supabase local e conta seed de prospecção.

## Veredito

O CRM tem boa amplitude funcional e uma linguagem visual consistente na maior parte do produto, mas ainda não está seguro para ser tratado como produção. Foram confirmados 4 problemas críticos, 8 de alta prioridade e 7 de prioridade média. Os maiores riscos são: falhas de banco mascaradas como estados vazios, dados diferentes entre dashboard e páginas internas, módulos demonstrativos apresentados como ativos e ausência de proteção de rota por segmento.

## Mapa do produto

- Autenticação: login.
- Comercial: dashboard, leads, prospecção, pipeline, oportunidades, propostas, clientes, contatos, empresas e interações.
- Execução: projetos, tarefas, metas, equipe, follow-up, tickets e base de conhecimento.
- Marketing: campanhas, e-mail marketing, landing pages e chat ao vivo.
- Gestão: financeiro, relatórios, insights, dashboards e configurações.
- Verticais: consultor de consórcio, clínicas, escolar e portal do aluno.
- Administração: super-admin e configurações de tenant.

## Achados críticos — P0

### P0-1 — Erros do banco são mascarados como “nenhum dado”

Os logs locais registraram `permission denied` para `activities`, `ai_insights`, `automations`, `deals`, `financial_entries`, `financial_payments`, `kassia_conversations`, `notifications`, `projects`, `tasks` e `user_commercial_roles`. Também ocorreu erro de filtro realtime por coluna `user_id`. A interface normalmente converte essas falhas em listas vazias, levando o usuário a acreditar que não existem registros.

Impacto: perda de confiança, decisões com dados falsamente zerados e impossibilidade de distinguir indisponibilidade de ausência de dados.

### P0-2 — Dashboard e páginas internas mostram bases diferentes

Na mesma sessão, o dashboard exibiu 228 leads e 228 oportunidades; após recarregar `/leads` e `/pipeline`, ambos passaram a mostrar zero. Há um provável problema estrutural na resolução do tenant: `src/contexts/tenant-context.tsx:41-47` mantém o tenant em uma variável global mutável, atualizada depois em `:105`, enquanto `src/hooks/use-leads.ts:39` consulta esse valor durante a renderização.

Impacto: deep links e reloads podem desabilitar queries ou consultar sem o tenant pronto.

### P0-3 — Módulos demonstrativos parecem funcionalidades reais

Chat, E-mail Marketing e Landing Pages usam `ModuleStub` (`src/routes/chat.tsx:8`, `src/routes/email-marketing.tsx:8`, `src/routes/landing-pages.tsx:8`). Eles apresentam KPIs e registros realistas, selo “Ativo” e persistem alterações apenas em `localStorage`. No Chat, “Configurar widget” abre um formulário genérico de título, descrição, meta, status e tom, sem configurar widget algum.

Impacto: o produto comunica operação e dados inexistentes, com alto risco comercial e de suporte.

### P0-4 — Rotas de segmentos não possuem proteção efetiva

Em um tenant de prospecção, URLs diretas de `/clinicas/*`, `/escolar/*` e `/portal-aluno` renderizam normalmente. O menu esconde itens por segmento, mas isso não constitui autorização. O Portal do Aluno ainda aparece dentro do shell administrativo completo do CRM.

Impacto: exposição indevida de módulos/entitlements e experiência incorreta entre perfis.

## Alta prioridade — P1

1. **WhatsApp sem salvaguardas:** links `wa.me` em `src/routes/leads.tsx:184`, `src/components/lead-detail-drawer.tsx:133` e `src/components/prospecting/prospecting-results-table.tsx:97` não validam consentimento, opt-out, janela de contato ou cadência. Isso é compatível com o banimento relatado.
2. **Configurações não salvam:** “Salvar alterações” em `src/routes/configuracoes.tsx:127` não possui ação; toggles em `:89-90` vivem apenas no estado local e permissões usam `defaultChecked`.
3. **Busca global é decorativa:** os campos em `src/components/app-shell.tsx:283` e `:336` não possuem fluxo de busca; Enter não altera a tela nem informa erro.
4. **“+ Novo” não cria nada:** os links em `src/components/app-shell.tsx:290` e `:297` apenas navegam para `/leads`, contrariando a promessa do rótulo.
5. **Campanhas perde toda a navegação:** a página não utiliza o `AppShell`, deixando o usuário sem menu, cabeçalho e dock; no celular, a tabela fica cortada horizontalmente.
6. **Selo realtime é estático:** `src/components/realtime-badge.tsx:4-7` sempre afirma “Ao vivo”, mesmo quando a conexão falha; é usado em pipeline, clientes e automação.
7. **Login falha sem feedback de rede:** com o backend indisponível, o console registrou `TypeError: Failed to fetch`, mas a tela permaneceu no login sem mensagem ou ação de recuperação.
8. **Prospecção não restaura o estado:** o histórico e os KPIs mostram 30 resultados qualificados, enquanto a área principal informa “Nenhum resultado ainda”.

## Prioridade média — P2

1. `user-scalable=no` em `src/routes/__root.tsx:31` impede zoom e prejudica acessibilidade.
2. Cards do dashboard têm botões somente com ícone, sem nome acessível e sem ação evidente (`src/routes/index.tsx:53`).
3. Existem vários botões de fechar/adicionar somente com ícone e sem `aria-label`; o menu móvel expõe dois controles chamados “Fechar”.
4. No celular, “Esta semana” e “Novo lead” quebram em duas linhas e comprimem o cabeçalho.
5. O onboarding abre automaticamente sobre o dashboard e bloqueia a primeira interação; o fechamento funciona, mas o momento é intrusivo.
6. Pipeline e outras tabelas dependem de rolagem horizontal com pouco affordance em telas estreitas.
7. Títulos/metadados são inconsistentes entre módulos; várias rotas verticais mantêm apenas o título genérico do CRM.

## Fluxos avaliados

1. **Login — atenção:** composição visual clara; falta recuperação de senha, alternância de visibilidade e feedback confiável de erro de rede.
2. **Dashboard e onboarding — degradado:** boa hierarquia visual, porém o modal bloqueia a entrada e os números entram em conflito com páginas internas.
3. **Leads e pipeline — crítico:** reload/deep link pode zerar dados; o selo realtime não representa a conexão real.
4. **Prospecção — degradado:** busca/histórico existem, mas o estado atual não é restaurado e os CTAs de exportação ficam sem contexto.
5. **Operação e gestão — crítico:** as páginas carregam, porém erros de permissão são apresentados como estados vazios.
6. **Marketing — crítico:** Campanhas perde a navegação; Chat, E-mail e Landing Pages são protótipos com aparência de produção.
7. **Configurações e navegação — quebrado:** salvar, busca global e “+ Novo” não realizam o que comunicam.
8. **Verticais — crítico:** rotas de clínica, escolar e portal são acessíveis fora do segmento correto.
9. **Mobile e acessibilidade — degradado:** base responsiva razoável, mas há clipping, ações comprimidas, zoom bloqueado e nomes acessíveis insuficientes.
10. **Qualidade de engenharia — atenção:** build de produção concluiu; 14 testes unitários passaram, porém não cobrem os fluxos de UI. O lint falha com centenas de ocorrências, incluindo dependências de hooks, `any`, componentes/exportações e formatação.

## Evidências visuais

- `01-login.png`: login desktop.
- `03-dashboard-desktop.png`: onboarding bloqueando o dashboard.
- `04-dashboard-clean.png`: dashboard com 228 leads/oportunidades.
- `05-leads-after-reload-empty.png`: leads zerados após reload.
- `06-chat-prototype-presented-active.png`: Chat demonstrativo rotulado como ativo.
- `07-campaigns-disconnected-layout.png`: Campanhas sem shell de navegação.
- `08-dashboard-mobile.png`: ações comprimidas no mobile.
- `09-mobile-commercial-menu.png`: menu comercial móvel.
- `10-campaigns-mobile-clipped.png`: tabela de campanhas cortada.
- `11-prospecting.png`: KPIs/histórico com resultados e área principal vazia.
- `12-pipeline.png`: pipeline zerado com selo “Ao vivo”.

## Validação técnica

- `npm test`: 5 arquivos e 14 testes passaram.
- `npm run build`: concluído com sucesso; 4.325 módulos transformados. Houve muitos avisos de diretivas `use client` ignoradas e override do `main` do Wrangler.
- `npm run lint`: falhou; entre os grupos identificados estão 626 ocorrências de `no-explicit-any`, 6 de dependências de hooks, 2 de regras de hooks, 14 de `react-refresh/only-export-components`, além de erros de formatação.

## Ordem recomendada de correção

1. Corrigir permissões/RLS, expor erros de query e estabilizar o tenant antes de executar hooks.
2. Colocar guards reais nas rotas por segmento, tenant e papel.
3. Remover, bloquear com feature flag ou rotular explicitamente todos os módulos `ModuleStub`.
4. Implementar salvamento, busca, criação e estado realtime reais; adicionar testes de integração para esses contratos.
5. Implementar política de consentimento, opt-out, cadência e templates aprovados para WhatsApp.
6. Unificar Campanhas ao shell e corrigir as quebras mobile/acessibilidade.

## Limites

Esta auditoria usou ambiente local e dados seed. Não houve envio real de mensagens, criação/exclusão de registros nem teste de produção. A validação de acessibilidade foi heurística e de DOM, não uma certificação WCAG completa. A proteção de banco foi avaliada por comportamento e logs locais, não como pentest.
