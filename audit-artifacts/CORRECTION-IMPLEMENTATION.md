# Relatório de execução do plano de correção

Data: 20/07/2026
Ambiente validado: aplicação e Supabase locais.

## Resultado por fase

### Fase 0 — concluída

- Kill switch de WhatsApp, desativado por padrão.
- Todos os links diretos `wa.me` foram substituídos por um controle seguro.
- Chat, E-mail Marketing e Landing Pages deixaram de exibir dados fictícios e status “Ativo”.
- Realtime agora possui estados conectando, ao vivo, reconectando e offline; o padrão é conservador.
- Falhas de autenticação por rede agora geram mensagem acionável.

### Fase 1 — concluída no ambiente local

- Grants operacionais restaurados para 13 tabelas protegidas por RLS.
- Migração: `20260720010000_restore_operational_authenticated_grants.sql`.
- Validação local confirmou privilégio `SELECT` para todas as tabelas auditadas.
- Queries com falha passam ao error boundary em vez de parecer uma lista vazia.

### Fase 2 — concluída

- Tenant ativo é sincronizado antes da renderização dos hooks legados.
- Troca de slug aguarda o tenant correto antes de montar o conteúdo.
- Guards no nível raiz bloqueiam Clínica, Escolar, Portal do Aluno e Super Admin fora da combinação autorizada.
- Portal do Aluno recebeu shell próprio, sem navegação administrativa.
- Testes automatizados cobrem a matriz básica de segmentos.

### Fase 3 — concluída para os achados auditados

- Campanhas foi integrada ao `AppShell` e a tabela recebeu rolagem acessível.
- O botão global “Novo lead” abre o formulário real de criação.
- A busca global decorativa foi removida até existir uma implementação completa.
- Filtros de Leads e Pipeline agora funcionam.
- Botões decorativos dos KPIs foram removidos.
- Módulos incompletos comunicam explicitamente indisponibilidade.

### Fase 4 — concluída no escopo local

- Configurações foram reescritas sobre `tenant_settings`, com RLS e persistência real.
- Perfil usa `auth.updateUser`; preferências, vendas e marketing persistem por tenant.
- Integrações inexistentes não aparecem mais como conectadas.
- Prospecção restaura automaticamente a pesquisa mais recente com resultados.
- Governança de WhatsApp adicionada:
  - consentimento `unknown/granted/revoked`;
  - data e origem do consentimento;
  - opt-out;
  - cooldown de quatro horas;
  - limite de três tentativas em 24 horas;
  - trilha de auditoria;
  - autorização atômica via função no banco.
- Migrações: `20260720011000_tenant_settings.sql` e `20260720012000_whatsapp_contact_governance.sql`.

### Fase 5 — concluída para os problemas observados

- Zoom do navegador reabilitado.
- Menu móvel ganhou Escape, ciclo de foco e retorno ao acionador.
- Nomes acessíveis do menu foram diferenciados.
- Dashboard e ações críticas não quebram palavras no mobile.
- Campanhas possui largura mínima e affordance de rolagem.
- Onboarding deixou de abrir automaticamente e bloquear a primeira tarefa.
- Login ganhou mostrar/ocultar senha e fluxo de recuperação.

### Fase 6 — gate funcional concluído; dívida tipada permanece

- Build de produção passou com 4.331 módulos.
- 7 arquivos de teste e 20 testes passaram.
- `npm run lint` agora separa lint de formatação e termina sem erros bloqueantes.
- Erros reais de lint (`rules-of-hooks`, `no-empty`, `no-unused-expressions` e escape inválido) foram corrigidos.
- `npm run lint:core` aplica `no-explicit-any` como erro nos componentes estruturais novos/alterados.
- Permanecem 638 warnings no repositório, principalmente `no-explicit-any` legado e avisos de Fast Refresh/hooks. Eles não foram ocultados e devem ser reduzidos por domínio.

## Validação no navegador

- Dashboard: 228 leads e 228 oportunidades.
- Reload direto de `/leads`: 228 leads.
- Reload direto de `/pipeline`: 228 leads e realtime confirmado como “Ao vivo”.
- `/clinicas` e `/escolar/alunos` em tenant geral: bloqueados como módulo não contratado.
- Chat: tela “Em desenvolvimento”, sem KPIs ou registros fictícios.
- Campanhas: shell e navegação presentes.
- Configurações: alteração persistiu após reload e foi restaurada ao valor original no fim do teste.
- Prospecção: 30 resultados restaurados automaticamente.
- Botão global Novo lead: abriu o formulário real sem criar registro durante o teste.

## Pendências externas e residuais

1. As três migrações novas precisam ser aplicadas em homologação e produção pelo processo oficial de deploy; somente o banco local foi alterado.
2. `VITE_WHATSAPP_CONTACT_ENABLED` permanece `false`. A ativação deve ocorrer apenas depois de validar integração oficial, templates e política operacional com o negócio.
3. O banco local contém nomes seed com mojibake (`ImÃ³veis`, por exemplo). A conversão foi confirmada em leitura, mas não foi aplicada automaticamente para evitar alterar dados reais sem uma revisão de escopo.
4. A integração oficial do WhatsApp e a confirmação de entrega/opt-out pelo provedor não existem neste repositório; o CRM agora bloqueia o contato até essa liberação.
5. Os warnings de tipagem legados devem ser tratados incrementalmente, começando por auth, tenant, leads, mensageria e módulos financeiros.
