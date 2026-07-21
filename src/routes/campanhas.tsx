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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Megaphone, Target, TrendingUp, Calendar } from "lucide-react";
import {
  useCampaigns, useSaveCampaign, useDeleteCampaign,
  useCalendarItems, useSaveCalendarItem, useDeleteCalendarItem,
  type Campaign, type CalendarItem,
} from "@/hooks/use-marketing";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Align CRM" }] }),
  component: CampanhasPage,
});

function brl(n: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0); }

function CampanhasPage() {
  const { data: camps = [] } = useCampaigns();
  const ativas = camps.filter(c => c.status === "ativa").length;
  const orcamento = camps.reduce((s, c) => s + (c.orcamento ?? 0), 0);
  const roiMedio = camps.length ? camps.reduce((s, c) => s + (c.roi ?? 0), 0) / camps.length : 0;

  return (
    <AppShell title="Campanhas" subtitle="Campanhas, calendário editorial e desempenho.">
      <div className="space-y-6 anim-fade-up">
      {camps.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<Megaphone className="size-4" />} label="Campanhas ativas" value={ativas} />
        <Kpi icon={<Target className="size-4" />} label="Total campanhas" value={camps.length} />
        <Kpi icon={<TrendingUp className="size-4" />} label="Orçamento total" value={brl(orcamento)} />
        <Kpi icon={<TrendingUp className="size-4" />} label="ROI médio" value={`${roiMedio.toFixed(1)}x`} />
      </div>}
      <Tabs defaultValue="campanhas">
        <TabsList>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="calendario">Calendário Editorial</TabsTrigger>
          <TabsTrigger value="ideias">Ideias</TabsTrigger>
        </TabsList>
        <TabsContent value="campanhas" className="mt-4"><CampaignsTab /></TabsContent>
        <TabsContent value="calendario" className="mt-4"><CalendarTab statusFilter={["planejado", "producao", "revisao", "publicado"]} /></TabsContent>
        <TabsContent value="ideias" className="mt-4"><CalendarTab statusFilter={["ideia"]} /></TabsContent>
      </Tabs>
      </div>
    </AppShell>
  );
}
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <Card className="p-4 lift"><div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div><div className="text-2xl font-bold mt-1">{value}</div></Card>;
}

function CampaignsTab() {
  const { data: camps = [] } = useCampaigns();
  const del = useDeleteCampaign();
  const [f, setF] = useState<Partial<Campaign>>({});
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{camps.length} campanhas</div>
        <Button onClick={() => { setF({ status: "planejada" }); setOpen(true); }}><Plus className="size-4 mr-1" />Nova campanha</Button>
      </div>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Tabela de campanhas; deslize horizontalmente para ver todas as colunas">
      <Table className="min-w-[860px]">
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead><TableHead>Status</TableHead><TableHead>Plataforma</TableHead>
          <TableHead>Período</TableHead><TableHead>Orçamento</TableHead><TableHead>ROI</TableHead><TableHead className="w-24"></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {camps.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome}<div className="text-xs text-muted-foreground">{c.objetivo}</div></TableCell>
              <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
              <TableCell>{c.plataforma ?? "—"}</TableCell>
              <TableCell className="text-xs">{c.data_inicio ?? "—"} → {c.data_fim ?? "—"}</TableCell>
              <TableCell>{c.orcamento ? brl(c.orcamento) : "—"}</TableCell>
              <TableCell>{c.roi ? `${c.roi.toFixed(1)}x` : "—"}</TableCell>
              <TableCell>
                <Button aria-label={`Editar campanha ${c.nome}`} variant="ghost" size="icon" onClick={() => { setF(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                <Button aria-label={`Remover campanha ${c.nome}`} variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(c.id)}><Trash2 className="size-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {camps.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center"><Megaphone className="mx-auto h-9 w-9 text-primary" /><div className="mt-3 text-base font-semibold text-foreground">Crie sua primeira campanha</div><div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Defina objetivo, plataforma, período e orçamento. O desempenho aparecerá aqui assim que houver dados.</div></TableCell></TableRow>}
        </TableBody>
      </Table>
      </div>
      <CampaignDialog open={open} onOpenChange={setOpen} f={f} setF={setF} />
    </Card>
  );
}
function CampaignDialog({ open, onOpenChange, f, setF }: { open: boolean; onOpenChange: (v: boolean) => void; f: Partial<Campaign>; setF: (v: Partial<Campaign>) => void }) {
  const save = useSaveCampaign();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Editar" : "Nova"} campanha</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={f.nome ?? ""} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={f.status ?? "planejada"} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["planejada", "ativa", "pausada", "concluida", "cancelada"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Objetivo</Label><Input value={f.objetivo ?? ""} onChange={e => setF({ ...f, objetivo: e.target.value })} /></div>
          <div><Label>Plataforma</Label><Input value={f.plataforma ?? ""} onChange={e => setF({ ...f, plataforma: e.target.value })} /></div>
          <div><Label>Orçamento</Label><Input type="number" step="0.01" value={f.orcamento ?? ""} onChange={e => setF({ ...f, orcamento: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Data início</Label><Input type="date" value={f.data_inicio ?? ""} onChange={e => setF({ ...f, data_inicio: e.target.value || null })} /></div>
          <div><Label>Data fim</Label><Input type="date" value={f.data_fim ?? ""} onChange={e => setF({ ...f, data_fim: e.target.value || null })} /></div>
          <div className="col-span-2"><Label>Resultado esperado</Label><Input value={f.resultado_esperado ?? ""} onChange={e => setF({ ...f, resultado_esperado: e.target.value })} /></div>
          <div className="col-span-2"><Label>Resultado alcançado</Label><Input value={f.resultado_alcancado ?? ""} onChange={e => setF({ ...f, resultado_alcancado: e.target.value })} /></div>
          <div><Label>ROI (x)</Label><Input type="number" step="0.1" value={f.roi ?? ""} onChange={e => setF({ ...f, roi: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={f.observacoes ?? ""} onChange={e => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome) return; save.mutate({ ...f, nome: f.nome! }, { onSuccess: () => onOpenChange(false) }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarTab({ statusFilter }: { statusFilter: string[] }) {
  const { data: items = [] } = useCalendarItems();
  const del = useDeleteCalendarItem();
  const save = useSaveCalendarItem();
  const filtered = items.filter(i => statusFilter.includes(i.status));
  const [f, setF] = useState<Partial<CalendarItem>>({});
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="size-4" />{filtered.length} itens</div>
        <Button onClick={() => { setF({ status: statusFilter[0], formato: "post", prioridade: "media" }); setOpen(true); }}><Plus className="size-4 mr-1" />Novo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filtered.map(i => (
          <Card key={i.id} className="p-3 lift">
            <div className="flex justify-between items-start">
              <div className="font-semibold text-sm">{i.titulo}</div>
              <div className="flex gap-1">
                <Button aria-label={`Editar item ${i.titulo}`} variant="ghost" size="icon" onClick={() => { setF(i); setOpen(true); }}><Pencil className="size-3" /></Button>
                <Button aria-label={`Remover item ${i.titulo}`} variant="ghost" size="icon" onClick={() => confirm("Remover?") && del.mutate(i.id)}><Trash2 className="size-3" /></Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{i.tema ?? "—"}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{i.formato}</Badge>
              <Badge variant="outline" className="text-[10px]">{i.prioridade}</Badge>
              {i.data_planejada && <Badge variant="outline" className="text-[10px]">{i.data_planejada}</Badge>}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-3 text-center text-sm text-muted-foreground py-8">Nenhum item.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{f.id ? "Editar" : "Novo"} item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Título</Label><Input value={f.titulo ?? ""} onChange={e => setF({ ...f, titulo: e.target.value })} /></div>
            <div><Label>Tema</Label><Input value={f.tema ?? ""} onChange={e => setF({ ...f, tema: e.target.value })} /></div>
            <div><Label>Formato</Label>
              <Select value={f.formato ?? "post"} onValueChange={v => setF({ ...f, formato: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["post", "video", "artigo", "email", "ads", "story"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={f.prioridade ?? "media"} onValueChange={v => setF({ ...f, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["baixa", "media", "alta", "urgente"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status ?? "ideia"} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ideia", "planejado", "producao", "revisao", "publicado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data planejada</Label><Input type="date" value={f.data_planejada ?? ""} onChange={e => setF({ ...f, data_planejada: e.target.value || null })} /></div>
            <div className="col-span-2"><Label>Conteúdo / Rascunho</Label><Textarea rows={4} value={f.conteudo ?? ""} onChange={e => setF({ ...f, conteudo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (!f.titulo) return; save.mutate({ ...f, titulo: f.titulo! }, { onSuccess: () => setOpen(false) }); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
