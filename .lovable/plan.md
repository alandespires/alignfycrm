# Módulo Consultor — Consórcios & Crédito

Um módulo dedicado a Consultor de Consórcios / Financeiro, com ferramentas específicas do dia a dia (simulações, cartas, contemplações, comissões) totalmente plugado em Leads, Clientes, Projetos, Tarefas, Financeiro e Launch IA.

## 1. Banco de dados (migração)

Novas tabelas no schema `public` (todas com tenant_id, RLS por tenant, GRANTs):

- `consortium_administrators` — administradoras (Porto, Embracon, Itaú etc.): nome, cnpj, taxa_adm_padrao, fundo_reserva_padrao, observacoes.
- `consortium_groups` — grupos: administrator_id, codigo, segmento (`imovel|veiculo|servicos|pesado`), prazo_meses, valor_credito, vagas, status.
- `consortium_quotas` — cotas/cartas dos clientes: lead_id, client_id, group_id, numero_cota, valor_credito, parcela_atual, parcela_total, parcela_valor, status (`ativa|contemplada|quitada|cancelada|transferida`), contemplada_em, lance_ofertado, lance_tipo.
- `consortium_simulations` — simulações geradas (PDF-ready): lead_id, administrator, segmento, credito, prazo, parcela_estimada, taxa_adm, fundo_reserva, seguro, payload(jsonb), pdf_url.
- `consortium_contemplations` — eventos de contemplação: quota_id, tipo (`sorteio|lance_livre|lance_fixo|lance_embutido`), data, valor_lance, observacao.
- `consultor_commissions` — comissões do consultor: lead_id/quota_id/deal_id, base, percentual, valor, status (`prevista|liberada|paga`), pagar_em, paga_em — gera entrada em `financial_entries` ao liberar.
- `credit_products` — produtos de crédito (consignado, FGTS, home equity, refin veicular): nome, tipo, taxa_min, taxa_max, prazo_min, prazo_max, banco.
- `credit_simulations` — simulações de crédito vinculadas a lead/cliente.

Todas seguem o padrão CREATE TABLE → GRANT (authenticated + service_role, sem anon) → ENABLE RLS → POLICIES via `is_tenant_member`/`can_edit_commercial`, com triggers `set_updated_at`.

Triggers de integração:
- ao criar `consortium_quota` a partir de um lead `fechado` → cria `project` automaticamente (tipo "Acompanhamento de cota") e `financial_entries` recorrentes para as parcelas.
- ao marcar `contemplada` → notificação tenant + tarefa "Preparar documentação de crédito".
- ao mudar `consultor_commissions.status = liberada` → cria `financial_entries` (receita).

## 2. Promoção do usuário

`alandespires@gmail.com` → INSERT em `user_roles` (`super_admin`) **e** em `user_commercial_roles` (`admin`) para todos os tenants em que ele participa. Idempotente via `ON CONFLICT`.

## 3. Hooks

`src/hooks/use-consortium.ts`, `use-consortium-simulations.ts`, `use-consortium-quotas.ts`, `use-consultor-commissions.ts`, `use-credit-products.ts` — todos com React Query + tenant scoping + realtime.

## 4. UI / Rotas

Rota raiz com sub-abas (TanStack layout):

- `/consultor` — Dashboard do consultor: KPIs (cotas ativas, contempladas no mês, comissão prevista vs paga, conversão simulação→venda, ticket médio) + funil simulação→proposta→cota ativa + próximas contemplações.
- `/consultor/simulador` — Simulador interativo de consórcio: form (segmento, crédito, prazo, administradora) → cálculo de parcela, taxa adm, fundo reserva, seguro, lance embutido, gera PDF via `kassia-pdf` e vincula ao lead.
- `/consultor/cotas` — Carteira de cotas: tabela rica com filtros por status/administradora/segmento, drawer de detalhes (parcelas, contemplações, anexos, timeline), ações: registrar contemplação, registrar lance, transferir cota.
- `/consultor/contemplacoes` — Calendário/lista de contemplações + assembleias.
- `/consultor/comissoes` — Comissões: previstas/liberadas/pagas, com botão "lançar no financeiro".
- `/consultor/credito` — Simulador de crédito (consignado, FGTS, refin) com catálogo `credit_products`.

## 5. Bottombar

Adicionar grupo "Consultor" no menu **Operacional** existente (junto a Projetos/Tarefas), com badge de contemplações da semana e cotas em atraso. Item só aparece para usuários com role `admin`/`comercial` E flag de feature `consultor` ligada por tenant (via setting simples no localStorage por enquanto, e habilitado por padrão para tenants do super_admin).

## 6. Integração com módulos existentes

- **Leads**: novo card "Simulações de consórcio" no `lead-detail-drawer` + ação "Gerar simulação" → abre simulador pré-preenchido.
- **Clientes**: aba "Cotas & Crédito" lista cotas ativas/contempladas.
- **Projetos**: template novo "Acompanhamento de Consórcio" (12 etapas: KYC, assinatura, 1ª parcela, assembleia, contemplação, uso do crédito etc.).
- **Financeiro**: parcelas e comissões viram entradas, marcadas com `categoria='consorcio'` para relatórios.
- **Launch IA**: 3 novas tools no `kassia-chat`:
  - `simular_consorcio({lead, segmento, credito, prazo})`
  - `registrar_contemplacao({cota, tipo, valor_lance})`
  - `liberar_comissao({lead, valor, percentual})`
  - Sugestões proativas: "Lead X simulou ontem e não recebeu follow-up", "3 cotas contempláveis nesta assembleia".

## 7. Detalhes técnicos

- Cálculo de parcela: `parcela = (credito * (1 + taxa_adm + fundo_reserva)) / prazo + seguro_mensal`. Lance embutido: até 25% do crédito reduz parcela.
- PDF de simulação reusa `src/lib/kassia-pdf.ts` com novo template `simulacao-consorcio`.
- Realtime nas tabelas `consortium_quotas` e `consultor_commissions`.
- Server function `gerar-simulacao.functions.ts` para cálculo seguro + persistência.

## 8. Entregáveis nesta thread

1. Migração do schema + GRANTs + RLS + triggers.
2. Promoção do usuário (insert).
3. Hooks + rotas + componentes principais.
4. Integração no bottombar (Operacional → Consultor).
5. Tools novas no `kassia-chat` + ações no `kassia-actions.ts`.
6. Cards integrados em Leads/Clientes.

Após aprovação rodo migração primeiro (aprovação separada), depois implemento código.
