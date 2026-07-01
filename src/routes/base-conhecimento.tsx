import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Star, StarOff, Eye, Search, History, BookOpen } from "lucide-react";
import {
  useArticles, useSaveArticle, useDeleteArticle,
  useFavorites, useToggleFavorite, useIncrementView, useArticleVersions,
  type Article,
} from "@/hooks/use-knowledge";
import { useDepartments } from "@/hooks/use-team";

export const Route = createFileRoute("/base-conhecimento")({
  head: () => ({ meta: [{ title: "Base de Conhecimento — Align CRM" }] }),
  component: KBPage,
});

function KBPage() {
  const { data: articles = [] } = useArticles();
  const { data: favIds = [] } = useFavorites();
  const { data: deps = [] } = useDepartments();
  const del = useDeleteArticle();
  const toggleFav = useToggleFavorite();
  const incView = useIncrementView();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("todos");
  const [edit, setEdit] = useState<Article | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Article | null>(null);

  const depMap = useMemo(() => Object.fromEntries(deps.map(d => [d.id, d.nome])), [deps]);
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const filtered = useMemo(() => {
    let list = articles;
    if (tab === "favoritos") list = list.filter(a => favSet.has(a.id));
    if (tab === "mais-lidos") list = [...list].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0)).slice(0, 20);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(a => a.titulo.toLowerCase().includes(s) || (a.conteudo ?? "").toLowerCase().includes(s) || (a.categoria ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [articles, tab, q, favSet]);

  return (
    <div className="p-6 space-y-6 anim-fade-up">
      <header className="stack-tight">
        <h1 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">Documentos, processos, tutoriais — pesquisa em tempo real, favoritos e versionamento.</p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar em tempo real..." className="pl-9" />
        </div>
        <Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="size-4 mr-1" />Novo artigo</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({articles.length})</TabsTrigger>
          <TabsTrigger value="favoritos">Favoritos ({favIds.length})</TabsTrigger>
          <TabsTrigger value="mais-lidos">Mais lidos</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(a => {
              const isFav = favSet.has(a.id);
              return (
                <Card key={a.id} className="p-4 lift">
                  <div className="flex justify-between items-start gap-2">
                    <button className="text-left flex-1" onClick={() => { incView.mutate(a.id); setView(a); }}>
                      <div className="font-semibold">{a.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{(a.conteudo ?? "").slice(0, 140) || "—"}</div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate({ articleId: a.id, on: !isFav })}>
                        {isFav ? <Star className="size-4 text-primary fill-primary" /> : <StarOff className="size-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {a.categoria && <Badge variant="secondary" className="text-[10px]">{a.categoria}</Badge>}
                    {a.department_id && <Badge variant="outline" className="text-[10px]">{depMap[a.department_id]}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{a.status ?? "rascunho"}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1"><Eye className="size-3" />{a.views_count ?? 0}</Badge>
                  </div>
                  <div className="flex gap-1 mt-3 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setEdit(a); setOpen(true); }}><Pencil className="size-3 mr-1" />Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => confirm("Remover?") && del.mutate(a.id)}><Trash2 className="size-3" /></Button>
                  </div>
                </Card>
              );
            })}
            {filtered.length === 0 && <div className="col-span-3 text-center text-sm text-muted-foreground py-12"><BookOpen className="size-8 mx-auto mb-2 opacity-40" />Nada encontrado.</div>}
          </div>
        </TabsContent>
      </Tabs>

      <ArticleDialog open={open} onOpenChange={setOpen} item={edit} deps={deps} />
      <ArticleViewer article={view} onClose={() => setView(null)} />
    </div>
  );
}

function ArticleDialog({ open, onOpenChange, item, deps }: { open: boolean; onOpenChange: (v: boolean) => void; item: Article | null; deps: any[] }) {
  const save = useSaveArticle();
  const [f, setF] = useState<Partial<Article>>({});
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setF(item ?? { status: "rascunho", prioridade: "media" }); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{item ? "Editar" : "Novo"} artigo</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Título</Label><Input value={f.titulo ?? ""} onChange={e => setF({ ...f, titulo: e.target.value })} /></div>
          <div><Label>Categoria</Label><Input value={f.categoria ?? ""} onChange={e => setF({ ...f, categoria: e.target.value })} /></div>
          <div><Label>Departamento</Label>
            <Select value={f.department_id ?? "none"} onValueChange={v => setF({ ...f, department_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{deps.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Prioridade</Label>
            <Select value={f.prioridade ?? "media"} onValueChange={v => setF({ ...f, prioridade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["baixa", "media", "alta"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={f.status ?? "rascunho"} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["rascunho", "revisao", "publicado", "arquivado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Conteúdo (Markdown suportado)</Label><Textarea rows={10} value={f.conteudo ?? ""} onChange={e => setF({ ...f, conteudo: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.titulo) return; save.mutate({ ...(item ?? {}), ...f, titulo: f.titulo! }, { onSuccess: () => onOpenChange(false) }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArticleViewer({ article, onClose }: { article: Article | null; onClose: () => void }) {
  const { data: versions = [] } = useArticleVersions(article?.id ?? null);
  const [showHist, setShowHist] = useState(false);
  return (
    <Dialog open={!!article} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        {article && <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{article.titulo}
              <Badge variant="outline" className="text-[10px] flex items-center gap-1"><Eye className="size-3" />{article.views_count ?? 0}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap">
            {article.categoria && <Badge variant="secondary">{article.categoria}</Badge>}
            <Badge variant="outline">{article.status ?? "rascunho"}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setShowHist(v => !v)}><History className="size-3 mr-1" />Histórico ({versions.length})</Button>
          </div>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm max-h-[50vh] overflow-y-auto">
            {article.conteudo ?? "(sem conteúdo)"}
          </div>
          {showHist && (
            <div className="border-t pt-3 space-y-2 max-h-40 overflow-y-auto">
              {versions.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma versão anterior.</div>}
              {versions.map(v => (
                <div key={v.id} className="text-xs flex justify-between"><span>v{v.versao} — {v.titulo}</span><span className="text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span></div>
              ))}
            </div>
          )}
        </>}
      </DialogContent>
    </Dialog>
  );
}
