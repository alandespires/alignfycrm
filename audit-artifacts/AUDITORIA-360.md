# Auditoria 360 — Align CRM

Data: 05/08/2026 · Escopo: user flow, IA de navegação, UX/UI, design system, acessibilidade, animações e performance percebida.
Método: leitura estática de `src/routes/*`, `src/components/*`, `src/hooks/*`, `src/styles.css`, comparação com padrões de Salesforce / HubSpot / Pipedrive.

## Veredito

Amplitude funcional acima da média e linguagem visual própria (Launch OS) bem resolvida no núcleo. Os problemas são de **consistência e de contrato**: metade dos módulos não usa o shell/padrões criados (AppShell, AlignPanel), faltam capacidades que todo CRM grande tem (busca de registros, ações em lote, continuidade lead→oportunidade), e a camada de motion/loading é pesada em pontos onde deveria ser invisível.

---

## 1. User flow e arquitetura de informação

### P0
1. **`/follow-up` é rota órfã** (`src/routes/follow-up.tsx`) — nenhum link em `app-shell.tsx` ou em telas de lead/oportunidade. O tour ainda promete "Automatize follow-ups" (`product-tour.tsx:50`). → Linkar no drawer de lead/oportunidade e no grupo Operacional.
2. **Buraco na conversão lead→oportunidade** — `use-convert-lead.ts:15-28` cria só o registro em `clients`; nenhuma oportunidade/proposta é gerada nem vinculada. O funil "lead → pipeline → oportunidade → proposta → cliente" quebra no meio. → Ao converter, criar/oferecer oportunidade com `lead_id`.
3. **Zero ações em lote em todo o produto** — leads, tarefas, clientes, financeiro não têm multi-seleção, mudança de status em massa ou exclusão em lote. É baseline em Pipedrive/HubSpot. → Checkbox de linha + toolbar contextual em `leads.tsx`, `tarefas.tsx`, `clientes.tsx`.
4. **Rótulo "coming-soon" contradiz rota real** — `app-shell.tsx:74-75` marca `/email-marketing` e `/landing-pages` como em breve, mas as rotas existem e renderizam conteúdo. → Alinhar rótulo e comportamento (bloquear com `UnavailableModule` ou remover selo).

### P1
5. **Não existe busca de registros** — o Cmd+K abre o `LaunchPanel` (IA conversacional). Não há caminho rápido para "abrir o lead X pelo nome" sem passar por interpretação de intenção. → Adicionar modo de busca fuzzy de registros no próprio Cmd+K.
6. **Guards apenas para 3 áreas** — `access-control.ts:3-8` cobre super-admin, `/clinicas`, `/escolar`/`portal-aluno`. `/financeiro`, `/consultor/*` e `/configuracoes` carregam para qualquer papel (RLS protege o dado, mas a UI expõe o módulo sem mensagem de acesso).
7. **Erros de query aparecem como "sem dados"** — `leads.tsx`, `pipeline.tsx`, `clientes.tsx` não tratam `isError`; falha de rede/permissão vira estado vazio. → Separar loading / erro / vazio explicitamente.
8. **Menu do dock divergente das tabs internas** — `consultor.historico` e `escolar.mapa` só existem dentro das páginas, não no submenu (`app-shell.tsx:88-95`, `:118-129`).

### P2
9. Atalhos limitados (Cmd+K, Shift+O/P/T) e sem cheatsheet; falta atalho para "Novo lead".
10. Onboarding sem checklist de progresso (estágios do pipeline, integrações) após o redirect inicial.

---

## 2. UX/UI, design system e acessibilidade

### P0
1. **14 rotas reimplementam modal na mão** — `div className="fixed inset-0 z-50 ... bg-black/50"` em `tickets.tsx:168`, `tarefas.tsx:184`, `propostas.tsx:157`, `projetos.tsx:322`, `oportunidades.tsx:182`, `follow-up.tsx:226`, `financeiro.tsx:1030`, `empresas.tsx:146`, `contatos.tsx:149`, `automacao.tsx:282`, `clientes.tsx:149`, `consultor.comissoes.tsx:130`, `consultor.cotas.tsx:168`, `super-admin.tsx:431`. Sem focus trap, sem Escape, sem padrão visual. → Migrar para `AlignPanel`.
2. **Botões só com ícone sem `aria-label`** — `campanhas.tsx:88-89,153-154` e vários controles de fechar/adicionar.
3. **Landmark `<main>` só existe em 2 lugares** (`app-shell.tsx`, `super-admin.tsx`); ~34 rotas fora do AppShell renderizam sem landmark.
4. **Foco visível inconsistente** — `button.tsx:8` usa `ring-1`, botões custom de modais e o toggle de `configuracoes.tsx:237` não têm nada.

### P1
5. Overlay `bg-black/NN` hardcoded em 13 arquivos vs `align-panel.tsx:124` — falta token `--overlay`.
6. `bg-white/[0.04]` hardcoded em `equipe.tsx:150,502-509`, `base-conhecimento.tsx:174-219`, `metas.tsx:193,198` → usar `bg-surface-3`.
7. `bg-black` fixo em `onboarding.tsx:75`, `auth.tsx:76,101`, `__root.tsx:139` → quebra tema claro.
8. **34 rotas não usam AppShell** (`clinicas.*`, `escolar.*`, `consultor.*`, `portal-aluno`, `t.$tenantSlug*`) e montam header/espaçamento próprios → tipografia e padding divergentes entre módulos.
9. **~30 rotas sem `head()`** → títulos genéricos no navegador.
10. Tabelas sem `overflow-x-auto` em parte das rotas (ex.: `dashboards.tsx`, `email-marketing.tsx`, `interacoes.tsx`) → clipping no mobile.

### P2
11. `h-screen`/`min-h-screen` em vez de `dvh` (`__root.tsx:17,103,137`, `auth.tsx:70`, `app-shell.tsx:241,258`, `t.$tenantSlug.tsx`, `super-admin.tsx`).
12. `styles.css:200-204` força `font-family` com `!important`, anulando `font-display`.
13. `.focus-ring` (`styles.css:430-434`) não é aplicado aos primitivos shadcn.

---

## 3. Animações e performance percebida

### P0
1. **Nenhuma rota tem loader** (`router.tsx:59-64`) — todo `useQuery` só dispara após o mount, criando waterfall navegação→fetch e skeleton garantido em cada entrada. → `loader: ({context}) => context.queryClient.ensureQueryData(...)`.
2. **`AnimatePresence mode="wait"` com `key={pathname}` envolvendo a página inteira** (`app-shell.tsx:335-345`) — desmonta/remonta tudo, sequencia exit→enter (+~220ms), perde scroll/estado de formulário e reproduz o skeleton a cada troca de aba. É a causa direta da "leve travada" ao alternar abas. → Remover `mode="wait"` e reduzir o escopo do wrapper com key.
3. **Shimmer animando `background-position`** (`styles.css:343-344,404-410`) — não é composited, força paint por frame, e é usado em dezenas de nós via `ListSkeleton`. → Trocar por gradiente com `translateX` (padrão `ks-sweep`).

### P1
4. Sem `placeholderData: keepPreviousData` em `use-leads.ts:47`, `use-clients.ts:24`, `use-deals.ts:27`, `use-dashboard.ts:28/45/63` → flash de skeleton ao trocar filtro/tenant.
5. Skeletons com `staggerChildren` (`skeletons.tsx:31,68,116,145,183,207`) — Kanban 15 itens, tabela até 30 células; atrasa o próprio placeholder. → Fade único de grupo.
6. `useOperacionalBadges()` roda em todo render do shell (`app-shell.tsx:151-152`, `staleTime` 60s) e, com o remount do item 2, pisca/desloca o header.
7. `prefers-reduced-motion` (`styles.css:465-470`) zera só CSS; Framer Motion continua animando. → `<MotionConfig reducedMotion="user">` no shell.

### P2
8. `slidePanelX/Y` com percentuais sem `will-change` (`motion.ts:36-46`) → possível primeiro frame torto.
9. `ChartSkeleton h-72` pode não bater com a altura real dos gráficos (`relatorios.tsx`, `dashboards.tsx`) → CLS.
10. Transição global em `button,[role=button],a` (`styles.css:452`) duplica o `whileTap` do Framer nos mesmos elementos.

---

## Ordem recomendada de correção

1. **Fluidez (1 sprint curto):** loaders com `ensureQueryData`, remover `mode="wait"`, shimmer via transform, skeleton sem stagger, `MotionConfig reducedMotion`. É o que o usuário sente imediatamente.
2. **Padronização de modais:** migrar as 14 rotas para `AlignPanel` (fecha acessibilidade + consistência de uma vez).
3. **Consistência de shell:** AppShell + `<main>` + `head()` nas 34 rotas verticais.
4. **Capacidades de CRM grande:** busca de registros no Cmd+K, ações em lote, continuidade lead→oportunidade, `/follow-up` na navegação.
5. **Guards por papel** em financeiro/consultor/configurações e estados de erro explícitos nas listas.
6. **Polimento:** tokens de overlay/superfície, `dvh`, focus-ring, tabelas responsivas.

## Limites

Auditoria estática de código + heurística de UX; não houve execução de fluxos end-to-end nesta rodada nem certificação WCAG formal. Números de linha refletem o estado atual do repositório.
