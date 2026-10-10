import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import {
  BookOpen, Plus, Pencil, Trash2, Star, StarOff, Eye, Search, History, FileText, Tags, Filter,
} from "@/components/ui/icons";
import {
  useArticles, useSaveArticle, useDeleteArticle,
  useFavorites, useToggleFavorite, useIncrementView, useArticleVersions,
  type Article,
} from "@/hooks/use-knowledge";
import { useDepartments, type Department } from "@/hooks/use-team";
import { toast } from "sonner";

export const Route = createFileRoute("/base-conhecimento")({
  head: () => pageHead("Base de Conhecimento"),
  component: KBPage,
});

const STATUS = ["rascunho", "revisao", "publicado", "arquivado"] as const;
const PRIORIDADE = ["baixa", "media", "alta"] as const;
const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", revisao: "Em revisão", publicado: "Publicado", arquivado: "Arquivado",
};
function statusTone(s: string | null): "success" | "warn" | "info" | "neutral" {
  if (s === "publicado") return "success";
  if (s === "revisao") return "info";
  if (s === "arquivado") return "neutral";
  return "warn";
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";
const selectCls =
  "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";

type TabId = "todos" | "favoritos" | "mais-lidos";

function KBPage() {
  const { data: articles = [], isLoading } = useArticles();
  const { data: favIds = [] } = useFavorites();
  const { data: deps = [] } = useDepartments();
  const del = useDeleteArticle();
  const toggleFav = useToggleFavorite();
  const incView = useIncrementView();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabId>("todos");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [fCat, setFCat] = useState<string>("todas");
  const [fDep, setFDep] = useState<string>("todos");

  const depMap = useMemo(() => Object.fromEntries(deps.map((d) => [d.id, d.nome])), [deps]);
  const favSet = useMemo(() => new Set(favIds), [favIds]);
  const categorias = useMemo(
    () => Array.from(new Set(articles.map((a) => a.categoria).filter(Boolean))) as string[],
    [articles],
  );

  const filtered = useMemo(() => {
    let list = articles;
    if (tab === "favoritos") list = list.filter((a) => favSet.has(a.id));
    if (tab === "mais-lidos") list = [...list].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)).slice(0, 20);
    if (fStatus !== "todos") list = list.filter((a) => a.status === fStatus);
    if (fCat !== "todas") list = list.filter((a) => a.categoria === fCat);
    if (fDep !== "todos") list = list.filter((a) => a.department_id === fDep);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (a) =>
          a.titulo.toLowerCase().includes(s) ||
          (a.conteudo ?? "").toLowerCase().includes(s) ||
          (a.categoria ?? "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [articles, tab, favSet, fStatus, fCat, fDep, q]);

  // Panels: view (reading) or edit (form). Only one at a time.
  const [panel, setPanel] = useState<
    | { mode: "view"; article: Article }
    | { mode: "edit"; article: Partial<Article> | null }
    | null
  >(null);

  const openNew = () => setPanel({ mode: "edit", article: { status: "rascunho", prioridade: "media" } });
  const openView = (a: Article) => { incView.mutate(a.id); setPanel({ mode: "view", article: a }); };
  const openEdit = (a: Article) => setPanel({ mode: "edit", article: a });

  const totalPubl = articles.filter((a) => a.status === "publicado").length;
  const totalRasc = articles.filter((a) => a.status === "rascunho").length;
  const totalViews = articles.reduce((s, a) => s + (a.views_count ?? 0), 0);

  return (
    <AppShell
      title="Base de Conhecimento"
      subtitle={`${articles.length} artigos · ${totalPubl} publicados · ${totalViews.toLocaleString("pt-BR")} visualizações`}
      action={<PrimaryButton icon={Plus} onClick={openNew}>Novo artigo</PrimaryButton>}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={FileText} label="Publicados" value={totalPubl} tone="success" />
        <Metric icon={Pencil} label="Rascunhos" value={totalRasc} tone="warn" />
        <Metric icon={Star} label="Favoritos" value={favIds.length} />
        <Metric icon={Eye} label="Visualizações" value={totalViews.toLocaleString("pt-BR")} />
      </div>

      {/* Tabs + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
          <TabBtn active={tab === "todos"} onClick={() => setTab("todos")}>Todos ({articles.length})</TabBtn>
          <TabBtn active={tab === "favoritos"} onClick={() => setTab("favoritos")}>Favoritos ({favIds.length})</TabBtn>
          <TabBtn active={tab === "mais-lidos"} onClick={() => setTab("mais-lidos")}>Mais lidos</TabBtn>
        </div>
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar em tempo real..." className={`${inputCls} pl-9`} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selectCls + " max-w-[160px]"}>
          <option value="todos">Todo status</option>
          {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selectCls + " max-w-[180px]"}>
          <option value="todas">Toda categoria</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fDep} onChange={(e) => setFDep(e.target.value)} className={selectCls + " max-w-[200px]"}>
          <option value="todos">Todo departamento</option>
          {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16 text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhum artigo encontrado</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Documente processos, tutoriais e políticas para a equipe.
          </p>
          <Button variant="unstyled" size="unstyled" onClick={openNew} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Criar primeiro artigo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const isFav = favSet.has(a.id);
            return (
              <article
                key={a.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 shadow-card transition hover:-translate-y-px hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <Button variant="unstyled" size="unstyled" onClick={() => openView(a)} className="min-w-0 flex-1 text-left">
                    <div className="line-clamp-2 font-display text-[15px] font-semibold tracking-tight">{a.titulo}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {(a.conteudo ?? "").slice(0, 140) || "Sem conteúdo ainda."}
                    </div>
                  </Button>
                  <Button variant="unstyled" size="unstyled"
                    onClick={(e) => { e.stopPropagation(); toggleFav.mutate({ articleId: a.id, on: !isFav }); }}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-3"
                    aria-label={isFav ? "Remover favorito" : "Favoritar"}
                  >
                    {isFav ? <Star className="h-4 w-4 fill-primary text-primary" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StatusPill tone={statusTone(a.status)}>{STATUS_LABEL[a.status ?? "rascunho"] ?? a.status}</StatusPill>
                  {a.categoria && (
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {a.categoria}
                    </span>
                  )}
                  {a.department_id && depMap[a.department_id] && (
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {depMap[a.department_id]}
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Eye className="h-3 w-3" /> {a.views_count ?? 0}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                  <Button variant="unstyled" size="unstyled"
                    onClick={() => openEdit(a)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                  ><Pencil className="h-3 w-3" /> Editar</Button>
                  <Button variant="unstyled" size="unstyled"
                    onClick={() => confirm("Remover artigo?") && del.mutate(a.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  ><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {panel?.mode === "view" && (
        <ArticleViewPanel article={panel.article} onClose={() => setPanel(null)} onEdit={() => setPanel({ mode: "edit", article: panel.article })} />
      )}
      {panel?.mode === "edit" && (
        <ArticleEditPanel article={panel.article} deps={deps} categorias={categorias} onClose={() => setPanel(null)} />
      )}
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="unstyled" size="unstyled"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition ${
        active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

/* ---------------- View panel ---------------- */

function ArticleViewPanel({ article, onClose, onEdit }: { article: Article; onClose: () => void; onEdit: () => void }) {
  const { data: versions = [] } = useArticleVersions(article.id);
  const toggleFav = useToggleFavorite();
  const { data: favIds = [] } = useFavorites();
  const isFav = favIds.includes(article.id);
  const [tab, setTab] = useState<"conteudo" | "historico">("conteudo");

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Artigo"
      title={article.titulo}
      subtitle={article.categoria ?? "Sem categoria"}
      status={{ label: STATUS_LABEL[article.status ?? "rascunho"] ?? article.status ?? "rascunho", tone: statusTone(article.status) }}
      expandable
      tabs={[
        { id: "conteudo", label: "Conteúdo" },
        { id: "historico", label: "Histórico", count: versions.length },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as any)}
      headerActions={
        <>
          <Button variant="unstyled" size="unstyled"
            onClick={() => toggleFav.mutate({ articleId: article.id, on: !isFav })}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            aria-label={isFav ? "Remover favorito" : "Favoritar"}
          >
            {isFav ? <Star className="h-4 w-4 fill-primary text-primary" /> : <StarOff className="h-4 w-4" />}
          </Button>
          <Button variant="unstyled" size="unstyled"
            onClick={onEdit}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            aria-label="Editar"
          ><Pencil className="h-4 w-4" /></Button>
        </>
      }
      footer={
        <AlignPanelFooter
          secondary={{ label: "Fechar", onClick: onClose }}
          primary={{ label: "Editar artigo", onClick: onEdit }}
          extra={
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Eye className="h-3 w-3" /> {article.views_count ?? 0} views
            </span>
          }
        />
      }
    >
      {tab === "conteudo" ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {article.conteudo ?? <em className="text-muted-foreground">Este artigo ainda não tem conteúdo.</em>}
        </div>
      ) : (
        <AlignPanelSection title="Versões anteriores" icon={History}>
          {versions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-1/40 p-4 text-xs text-muted-foreground">
              Nenhuma versão registrada ainda. As versões são criadas automaticamente quando o artigo é editado.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs">
                  <div>
                    <div className="font-semibold">v{v.versao} — {v.titulo}</div>
                  </div>
                  <span className="text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </AlignPanelSection>
      )}
    </AlignPanel>
  );
}

/* ---------------- Edit panel ---------------- */

function ArticleEditPanel({
  article, deps, categorias, onClose,
}: {
  article: Partial<Article> | null;
  deps: Department[];
  categorias: string[];
  onClose: () => void;
}) {
  const save = useSaveArticle();
  const del = useDeleteArticle();
  const [f, setF] = useState<Partial<Article>>(article ?? {});
  function submit() {
    if (!f.titulo?.trim()) return toast.error("Informe o título");
    save.mutate({ ...f, titulo: f.titulo! }, { onSuccess: onClose });
  }
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Artigo"
      title={f.id ? f.titulo ?? "Editar artigo" : "Novo artigo"}
      subtitle={f.id ? "Ajustar conteúdo, categoria e status" : "Documente processos, tutoriais e políticas"}
      status={f.status ? { label: STATUS_LABEL[f.status] ?? f.status, tone: statusTone(f.status) } : undefined}
      expandable
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: f.id ? "Salvar alterações" : "Publicar", onClick: submit, loading: save.isPending }}
        />
      }
    >
      <div className="space-y-5">
        <AlignPanelSection title="Identificação" icon={FileText}>
          <FormField label="Título *">
            <input autoFocus value={f.titulo ?? ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Categoria">
              <input
                list="kb-cats"
                value={f.categoria ?? ""}
                onChange={(e) => setF({ ...f, categoria: e.target.value })}
                className={inputCls}
                placeholder="Ex: Onboarding"
              />
              <datalist id="kb-cats">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </FormField>
            <FormField label="Departamento">
              <select value={f.department_id ?? ""} onChange={(e) => setF({ ...f, department_id: e.target.value || null })} className={selectCls}>
                <option value="">—</option>
                {deps.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </FormField>
          </div>
        </AlignPanelSection>

        <AlignPanelSection title="Publicação" icon={Filter}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select value={f.status ?? "rascunho"} onChange={(e) => setF({ ...f, status: e.target.value })} className={selectCls}>
                {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </FormField>
            <FormField label="Prioridade">
              <select value={f.prioridade ?? "media"} onChange={(e) => setF({ ...f, prioridade: e.target.value })} className={selectCls}>
                {PRIORIDADE.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
        </AlignPanelSection>

        <AlignPanelSection title="Conteúdo" icon={Tags}>
          <FormField label="Corpo do artigo (Markdown suportado)">
            <textarea
              rows={14}
              value={f.conteudo ?? ""}
              onChange={(e) => setF({ ...f, conteudo: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface-1 p-3 font-mono text-[13px] leading-relaxed focus:border-primary/60 focus:outline-none"
              placeholder={"# Título\n\nDescreva o processo, cole imagens (URL) e destaque pontos importantes."}
            />
          </FormField>
        </AlignPanelSection>

        {f.id && (
          <div className="pt-2">
            <Button variant="unstyled" size="unstyled"
              onClick={() => { if (confirm("Remover artigo?")) del.mutate(f.id!, { onSuccess: onClose }); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
            ><Trash2 className="h-3.5 w-3.5" /> Excluir artigo</Button>
          </div>
        )}
      </div>
    </AlignPanel>
  );
}

/* ---------------- Shared ---------------- */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Metric({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number | string; tone?: "danger" | "warn" | "success" }) {
  const colorMap = { danger: "text-destructive", warn: "text-warning", success: "text-success" } as const;
  const color = tone ? colorMap[tone] : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3 shadow-card">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
