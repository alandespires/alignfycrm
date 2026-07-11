# Fluidez global com Framer Motion

Objetivo: transições suaves, sem "recarrega tudo" ao trocar de aba, skeletons animados e microinterações consistentes em todo o app. Sem alterar lógica de negócio.

## Escopo por fases

### Fase 0 — Correções críticas (imediato)
- **Bug**: `TaskDetailDrawer` quebra com `Cannot read properties of undefined (reading 'length')` na linha 50 (`task.checklist.length`). Guardar com `task.checklist?.length ?? 0` e defaults em `subtasks`, `comments`, `atts`.
- Instalar `framer-motion` (bun add framer-motion).

### Fase 1 — Camada de motion global
- `src/lib/motion.ts`: presets exportados (`fadeUp`, `fadeIn`, `scaleIn`, `slidePanel`, `stagger`, easings Apple `[0.32, 0.72, 0, 1]`, durações 180/280/380ms) + variant `reduceMotion` respeitando `prefers-reduced-motion`.
- `<PageTransition>` em `AppShell` usando `AnimatePresence mode="wait"` chaveado pela rota → cross-fade + fade-up 8px, 220ms. Elimina o "flash branco" ao trocar de aba.
- Manter `<Outlet />` dentro do wrapper (não desmontar providers), reduzindo re-fetch percebido.

### Fase 2 — Cache/percepção de velocidade
- Ajustar `router.tsx`: `defaultPendingMs: 0`, `defaultPendingMinMs: 120`, e componente `defaultPendingComponent` que usa skeletons animados (em vez de tela em branco).
- Query defaults já bons; adicionar `keepPreviousData` implícito via `placeholderData` (já presente) — validar que rotas usam `useSuspenseQuery` corretamente para não flickar.

### Fase 3 — AlignPanel + drawers (usados em todo o app)
- Migrar `AlignPanel` (backdrop + painel + tabs) para `motion.div` com variants: backdrop `fadeIn`, painel `slidePanel` (x no desktop, y no mobile) via `AnimatePresence`. Tabs com `layoutId` no sublinhado (glow lime desliza entre abas).
- Isso propaga suavidade a todos os drawers migrados (Task, Lead, Client, Patient, LeadForm, Reconciliation, Project).

### Fase 4 — Skeletons animados
- `src/components/ui/skeleton.tsx`: substituir `ks-sweep` CSS por `motion.div` com shimmer contínuo (Framer). Variantes `shine`/`pulse`/`text`/`circle` preservadas.
- `src/components/skeletons.tsx`: adicionar `stagger` container para as células/linhas aparecerem em cascata (30ms de delay entre itens).

### Fase 5 — Listas e cards
- Wrapper `<MotionList>` (usa `LayoutGroup` + `AnimatePresence`) aplicado em:
  - Kanban (Pipeline, Tarefas, Projetos): reordenação com `layout` prop → cards deslizam ao mover de coluna.
  - Listas de Leads, Clientes, Contatos, Tickets, Cotas, Comissões: entrada com `staggerChildren: 0.03`, saída com fade.
- Cards KPI do `/dashboards`: entrada `fadeUp` sequencial (60ms stagger).

### Fase 6 — Microinterações padrão
- Botão global (`Button` shadcn): `whileTap={{ scale: 0.97 }}`, `whileHover={{ y: -1 }}` só quando não-`ghost`.
- Dock (`AppShell`): item ativo com `layoutId="dock-active"` (pílula lime desliza entre abas). Sheets do dock com slide-up motion.
- Notificações popover e Launch panel: entrada `scaleIn` a partir do trigger.

### Fase 7 — Respeito ao usuário
- Hook `useReduceMotion()` global → todas as variants trocam para duração 0 quando `prefers-reduced-motion: reduce`.
- Guardas para não animar em SSR (`typeof window`).

## Detalhes técnicos

- Pacote: `framer-motion@^11` (compatível com React 19 e TanStack Start SSR).
- Import padrão: `import { motion, AnimatePresence, LayoutGroup } from "framer-motion"`.
- Easing padrão: `[0.32, 0.72, 0, 1]` (mesmo já usado no `AlignPanel`), durações 180ms (micro), 280ms (padrão), 380ms (painéis).
- Não trocar Tailwind keyframes existentes; conviver.
- Não mexer em lógica de dados, RLS, hooks ou rotas.

## Fora do escopo (agora)
- Reescrever rotas escolares/consultor (Onda 2/3 continuam pendentes).
- Redesign visual de componentes; apenas movimento.

## Entrega
Executo Fases 0–4 nesta primeira leva (crítico + base + drawers + skeletons), depois volto para confirmar antes das Fases 5–7 (podem afetar percepção em muitos pontos).
