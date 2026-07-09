# AlignPanel smoke tests

Testes Playwright que abrem cada drawer/dialog migrado para `AlignPanel` em desktop e mobile, capturam screenshots e auditam layout.

## Pré-requisitos

- Dev server ativo em `http://localhost:8080` (Vite roda automaticamente no sandbox).
- Sessão Supabase injetada. No sandbox do Lovable, isso acontece quando o usuário está autenticado no preview e `LOVABLE_BROWSER_AUTH_STATUS=injected`.

Se `LOVABLE_BROWSER_AUTH_STATUS=signed_out`, o teste aborta com aviso — faça login no preview e rode novamente.

## Executar

```bash
python3 tests/playwright/align-panel-smoke.py
```

## Cenários cobertos

| Slug | Rota | O que abre |
|---|---|---|
| `projeto-detail` | `/projetos` | `ProjectDetailDrawer` (AlignPanel) |
| `tarefa-detail` | `/tarefas` | `TaskDetailDrawer` — 5 abas |
| `lead-detail` | `/leads` | `LeadDetailDrawer` |
| `lead-form-new` | `/leads` | `LeadFormDialog` — criação |
| `cliente-detail` | `/clientes` | `ClientDetailDrawer` |
| `paciente-detail` | `/clinicas/pacientes` | `PatientDrawer` |
| `reconciliation` | `/financeiro` | `ReconciliationModal` |
| `meta-new` | `/metas` | AlignPanel de criação/edição |
| `equipe-membro-new` | `/equipe` | AlignPanel membro/depto/vaga |
| `base-artigo-view` | `/base-conhecimento` | AlignPanel visualização de artigo |

## Auditoria automática

Cada abertura verifica:
- **Overflow horizontal** — drawer não pode ultrapassar `innerWidth`.
- **Altura mobile** — bottom-sheet ≤ 95vh.
- **Ancoragem desktop** — drawer encostado na borda direita (`right >= vw - 20`).
- **Body scroll lock** — `document.body.style.overflow === 'hidden'`.
- **Estrutura** — `<h2>` (título) presente; abas esperadas quando definidas.
- **Erros runtime** — `pageerror` e `console.error` capturados por viewport.

## Saídas

- `/tmp/browser/align-smoke/shots/<viewport>_<slug>_list.png` — página antes de abrir
- `/tmp/browser/align-smoke/shots/<viewport>_<slug>_drawer.png` — drawer aberto
- `/tmp/browser/align-smoke/report.json` — relatório completo (bounding box, viewport, issues por cenário)
- stdout — log com prefixo `[desktop]` / `[mobile]` e sumário final

Exit code = `0` só se todos os cenários = OK. `WARN`/`ERROR`/`trigger-not-found` retornam `1`.
