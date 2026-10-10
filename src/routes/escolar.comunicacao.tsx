import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAnnouncements, useCreateAnnouncement, useClasses } from "@/hooks/use-school";
import { Bell, Send } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/escolar/comunicacao")({
  head: () => pageHead("Escolar · Comunicacao"), component: Page });

function Page() {
  const { data: announcements = [] } = useAnnouncements();
  const { data: classes = [] } = useClasses();
  const create = useCreateAnnouncement();
  const [form, setForm] = useState({ titulo: "", mensagem: "", class_id: "", tipo: "aviso" });

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card h-fit">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4 text-primary" />Novo comunicado</h3>
        <div className="space-y-3">
          <div><Label>Para</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Toda escola</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Turma: {c.nome}</option>)}
            </select>
          </div>
          <div><Label>Tipo</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="aviso">Aviso</option><option value="urgente">Urgente</option><option value="evento">Evento</option><option value="lembrete">Lembrete</option>
            </select>
          </div>
          <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div><Label>Mensagem</Label><Textarea rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} /></div>
          <Button className="w-full" onClick={async () => {
            if (!form.titulo || !form.mensagem) return;
            await create.mutateAsync({ titulo: form.titulo, mensagem: form.mensagem, tipo: form.tipo, class_id: form.class_id || null });
            setForm({ titulo: "", mensagem: "", class_id: "", tipo: "aviso" });
          }}><Send className="mr-1.5 h-4 w-4" />Enviar</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 shadow-card">
        <div className="border-b border-border px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" />Histórico</h3></div>
        <ul className="divide-y divide-border">
          {announcements.map((a: any) => (
            <li key={a.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold">{a.titulo}</h4>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{a.tipo}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.mensagem}</p>
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                {a.klass?.nome && <span>· Turma {a.klass.nome}</span>}
              </div>
            </li>
          ))}
          {announcements.length === 0 && <li className="px-5 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum comunicado.</p></li>}
        </ul>
      </div>
    </div>
  );
}
