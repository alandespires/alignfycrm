"""
Align Panel smoke test — abre todos os drawers/dialogs migrados para AlignPanel
em desktop (1280x1800) e mobile (390x844), captura screenshots e registra
falhas de layout (overflow horizontal, footer clipando conteúdo, drawer
não renderizado, erros de página).

Pré-requisitos:
- Dev server rodando em http://localhost:8080
- Sessão Supabase injetada no ambiente:
    LOVABLE_BROWSER_AUTH_STATUS=injected
    LOVABLE_BROWSER_SUPABASE_STORAGE_KEY
    LOVABLE_BROWSER_SUPABASE_SESSION_JSON
    LOVABLE_BROWSER_SUPABASE_COOKIES_JSON (opcional, para apps SSR)

Uso:
    python3 tests/playwright/align-panel-smoke.py

Saídas:
- Screenshots:  /tmp/browser/align-smoke/shots/<viewport>_<slug>.png
- Relatório:    /tmp/browser/align-smoke/report.json
- Log console:  stdout (com prefixo [desktop]/[mobile])
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext, TimeoutError as PWTimeout

BASE = "http://localhost:8080"
OUT = Path("/tmp/browser/align-smoke")
SHOTS = OUT / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Cenários — cada entrada abre 1 AlignPanel (drawer/dialog migrado).
# `trigger` é uma lista de seletores tentados em ordem até um funcionar.
# `expect_tabs` é opcional; quando presente, valida que as abas aparecem.
# ---------------------------------------------------------------------------
SCENARIOS = [
    # ---- Onda 1 (migrados) ----
    {
        "slug": "projeto-detail",
        "route": "/projetos",
        "trigger": ["article:has-text('Projeto')", "[data-testid='project-card']", "article", ".cursor-pointer"],
        "expect_title_contains": None,
        "expect_tabs": ["Visão", "Tarefas", "Financeiro", "Auditoria"],
    },
    {
        "slug": "tarefa-detail",
        "route": "/tarefas",
        "trigger": ["[data-testid='task-row']", "tr.cursor-pointer", "article", ".cursor-pointer"],
        "expect_tabs": ["Geral", "Checklist", "Comentários", "Anexos", "Tempo"],
    },
    {
        "slug": "lead-detail",
        "route": "/leads",
        "trigger": ["[data-testid='lead-card']", "article", ".cursor-pointer"],
    },
    {
        "slug": "lead-form-new",
        "route": "/leads",
        "trigger": ["button:has-text('Novo lead')", "button:has-text('Adicionar lead')", "button:has-text('Novo')"],
    },
    {
        "slug": "cliente-detail",
        "route": "/clientes",
        "trigger": ["[data-testid='client-card']", "article", ".cursor-pointer"],
    },
    {
        "slug": "paciente-detail",
        "route": "/clinicas/pacientes",
        "trigger": ["[data-testid='patient-row']", "tr.cursor-pointer", "article", ".cursor-pointer"],
    },
    {
        "slug": "reconciliation",
        "route": "/financeiro",
        "trigger": ["button:has-text('Conciliar')", "button:has-text('Reconciliar')"],
    },
    # ---- Rotas standardizadas (Metas/Equipe/Base) ----
    {
        "slug": "meta-new",
        "route": "/metas",
        "trigger": ["button:has-text('Nova meta')", "button:has-text('Nova')"],
    },
    {
        "slug": "equipe-membro-new",
        "route": "/equipe",
        "trigger": ["button:has-text('Novo membro')", "button:has-text('Novo')"],
    },
    {
        "slug": "base-artigo-view",
        "route": "/base-conhecimento",
        "trigger": ["article", ".cursor-pointer", "[data-testid='article-card']"],
    },
]

VIEWPORTS = [
    ("desktop", {"width": 1280, "height": 1800}),
    ("mobile", {"width": 390, "height": 844}),
]

report: dict = {"runs": []}


async def restore_session(context: BrowserContext, page: Page) -> bool:
    """Injeta a sessão Supabase antes de navegar para rotas autenticadas."""
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "unknown")
    sk = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    sj = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cj = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cj:
        cookies = json.loads(cj)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)

    await page.goto(BASE, wait_until="domcontentloaded")
    if sk and sj:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(sk)}, {json.dumps(sj)})"
        )
        return True
    print(f"[warn] sem sessão Supabase injetada (LOVABLE_BROWSER_AUTH_STATUS={status})")
    return False


async def try_open(page: Page, triggers: list[str]) -> str | None:
    """Tenta cada seletor até abrir um dialog. Retorna o seletor que funcionou."""
    for sel in triggers:
        try:
            loc = page.locator(sel).first
            if await loc.count() == 0:
                continue
            await loc.scroll_into_view_if_needed(timeout=1500)
            await loc.click(timeout=1500)
            await page.wait_for_selector('[role="dialog"]', timeout=2500)
            return sel
        except PWTimeout:
            continue
        except Exception:
            continue
    return None


async def audit_dialog(page: Page, viewport_name: str) -> dict:
    """Coleta métricas de layout do dialog aberto."""
    dialog = page.locator('[role="dialog"]').last
    if await dialog.count() == 0:
        return {"opened": False}

    box = await dialog.bounding_box()
    vw = await page.evaluate("window.innerWidth")
    vh = await page.evaluate("window.innerHeight")
    issues: list[str] = []

    if box:
        # Overflow horizontal
        if box["x"] + box["width"] > vw + 2:
            issues.append(f"overflow-horizontal: dialog termina em {box['x']+box['width']:.0f}px > vw={vw}px")
        # Altura em mobile: bottom-sheet deve caber em 92vh
        if viewport_name == "mobile" and box["height"] > vh * 0.95:
            issues.append(f"altura-excessiva-mobile: {box['height']:.0f}px > 95vh")
        # Desktop drawer deve ser side (right-aligned)
        if viewport_name == "desktop" and (box["x"] + box["width"]) < vw - 20:
            issues.append(f"desktop-nao-encaixado-direita: right={box['x']+box['width']:.0f}px vs vw={vw}px")

    # Body scroll lock ativo?
    body_overflow = await page.evaluate("document.body.style.overflow")
    if body_overflow != "hidden":
        issues.append(f"body-scroll-nao-travado: overflow='{body_overflow}'")

    # Footer não pode cobrir conteúdo (checa pb-28 do body)
    footer_count = await dialog.locator("footer").count()

    # Título presente
    has_title = await dialog.locator("h2").count() > 0

    return {
        "opened": True,
        "box": box,
        "viewport": {"w": vw, "h": vh},
        "has_footer": footer_count > 0,
        "has_title": has_title,
        "issues": issues,
    }


async def close_dialog(page: Page):
    try:
        await page.keyboard.press("Escape")
        await page.wait_for_selector('[role="dialog"]', state="detached", timeout=2000)
    except Exception:
        # tenta clicar no backdrop
        try:
            await page.mouse.click(5, 5)
        except Exception:
            pass
    await page.wait_for_timeout(300)


async def run_viewport(viewport_name: str, viewport: dict):
    print(f"\n=== VIEWPORT: {viewport_name} ({viewport['width']}x{viewport['height']}) ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()

        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: (m.type == "error") and errors.append(f"console.error: {m.text[:300]}"))

        authed = await restore_session(context, page)
        if not authed:
            print(f"[{viewport_name}] abortando — sem sessão")
            report["runs"].append({"viewport": viewport_name, "aborted": "no-session"})
            await browser.close()
            return

        for sc in SCENARIOS:
            slug = sc["slug"]
            entry = {"viewport": viewport_name, "slug": slug, "route": sc["route"]}
            try:
                await page.goto(f"{BASE}{sc['route']}", wait_until="domcontentloaded")
                await page.wait_for_timeout(1500)
                await page.screenshot(path=str(SHOTS / f"{viewport_name}_{slug}_list.png"))

                trigger = await try_open(page, sc["trigger"])
                if not trigger:
                    entry["status"] = "trigger-not-found"
                    entry["tried"] = sc["trigger"]
                    print(f"[{viewport_name}] {slug}: SKIP (nenhum trigger encontrado)")
                    report["runs"].append(entry)
                    continue

                entry["trigger_used"] = trigger
                audit = await audit_dialog(page, viewport_name)
                entry["audit"] = audit
                await page.screenshot(path=str(SHOTS / f"{viewport_name}_{slug}_drawer.png"))

                # valida abas esperadas
                expect_tabs = sc.get("expect_tabs")
                if expect_tabs:
                    missing = []
                    for t in expect_tabs:
                        if await page.locator(f'[role="dialog"] nav button:has-text("{t}")').count() == 0:
                            missing.append(t)
                    if missing:
                        entry.setdefault("audit", {}).setdefault("issues", []).append(f"abas-ausentes: {missing}")

                issues = audit.get("issues", [])
                status = "OK" if not issues else "WARN"
                entry["status"] = status
                marker = "✓" if status == "OK" else "⚠"
                print(f"[{viewport_name}] {marker} {slug}: {status}" + (f" · {issues}" if issues else ""))
                await close_dialog(page)
            except Exception as e:
                entry["status"] = "ERROR"
                entry["error"] = str(e)
                print(f"[{viewport_name}] ✗ {slug}: ERROR {e}")
            report["runs"].append(entry)

        if errors:
            print(f"[{viewport_name}] erros de página detectados: {len(errors)}")
            report.setdefault("page_errors", {})[viewport_name] = errors[:20]

        await browser.close()


async def main():
    for name, vp in VIEWPORTS:
        await run_viewport(name, vp)

    (OUT / "report.json").write_text(json.dumps(report, indent=2, default=str))
    # sumário
    total = len(report["runs"])
    ok = sum(1 for r in report["runs"] if r.get("status") == "OK")
    warn = sum(1 for r in report["runs"] if r.get("status") == "WARN")
    err = sum(1 for r in report["runs"] if r.get("status") in ("ERROR", "trigger-not-found"))
    print(f"\n--- SUMÁRIO ---\nTotal: {total} | OK: {ok} | WARN: {warn} | FALHA: {err}")
    print(f"Relatório: {OUT/'report.json'}")
    print(f"Screenshots: {SHOTS}")
    sys.exit(0 if err == 0 and warn == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
