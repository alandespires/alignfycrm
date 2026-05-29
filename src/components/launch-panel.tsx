import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Loader2, Plus, MessageSquare, Trash2, ListTodo, ArrowRightLeft, FileBarChart, ChevronLeft, Keyboard, UserPlus } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import { LaunchIcon } from "@/components/launch-icon";
import {
  useConversations,
  useMessages,
  useCreateConversation,
  useAppendMessage,
  useDeleteConversation,
} from "@/hooks/use-kassia-conversations";
import { executarCriarTarefa, executarMoverLead, executarCriarLead } from "@/lib/kassia-actions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant" | "system"; content: string };
type PendingAction =
  | { kind: "criar_lead"; nome: string; empresa?: string; valor_estimado?: number; email?: string; whatsapp?: string; status: "novo" | "contato_inicial" | "qualificacao" | "proposta" | "negociacao" }
  | { kind: "criar_tarefa"; titulo: string; prioridade: "baixa" | "media" | "alta" | "urgente"; prazo_dias: number; lead_nome?: string; descricao?: string }
  | { kind: "mover_lead"; lead_nome: string; novo_status: string }
  | { kind: "gerar_relatorio"; tipo: string };

export function LaunchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { current } = useTenant();
  const tenantId = (current?.tenant as any)?.id;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useConversations();
  const { data: persisted = [] } = useMessages(conversationId);
  const createConv = useCreateConversation();
  const appendMsg = useAppendMessage();
  const deleteConv = useDeleteConversation();

  // When user opens a past conversation, hydrate messages
  useEffect(() => {
    if (!conversationId) return;
    setMessages(persisted.map((m) => ({ role: m.role as any, content: m.content })));
  }, [conversationId, persisted]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Keyboard shortcuts inside panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      // ArrowUp/Down navigate messages when not typing in textarea
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (!isTyping && (e.key === "ArrowUp" || e.key === "ArrowDown") && messages.length) {
        e.preventDefault();
        setFocusedIdx((idx) => {
          const cur = idx ?? messages.length;
          const next = e.key === "ArrowUp" ? Math.max(0, cur - 1) : Math.min(messages.length - 1, cur + 1);
          const el = document.querySelector<HTMLElement>(`[data-msg-idx="${next}"]`);
          el?.scrollIntoView({ block: "center", behavior: "smooth" });
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, messages.length]);

  // Build contextual hint based on current route + recent prompts
  const crmContext = useMemo(() => {
    const recent = messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content);
    return {
      rota_atual: pathname,
      perguntas_recentes: recent,
    };
  }, [pathname, messages]);

  async function ensureConversation(firstUserMsg: string): Promise<string | null> {
    if (conversationId) return conversationId;
    try {
      const c = await createConv.mutateAsync(firstUserMsg.slice(0, 60) || "Nova conversa");
      setConversationId(c.id);
      return c.id;
    } catch {
      return null;
    }
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    if (!tenantId) { toast.error("Selecione um workspace primeiro."); return; }
    setInput("");

    const convId = await ensureConversation(text);

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    // persist user msg (best-effort)
    if (convId) try { appendMsg.mutate({ conversation_id: convId, role: "user", content: text }); } catch {}

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kassia-chat`;
      // Prepend a system context message with current CRM context
      const contextMsg: Msg = {
        role: "system",
        content: `[Contexto do CRM]\nRota atual: ${crmContext.rota_atual}\nÚltimas perguntas: ${JSON.stringify(crmContext.perguntas_recentes)}`,
      };
      const payloadMessages = [contextMsg, ...next];

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: payloadMessages, tenant_id: tenantId }),
      });
      if (!resp.ok || !resp.body) throw new Error("AI failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let acc = "";
      // Accumulate tool_calls coming in streaming deltas
      const toolCalls: Record<number, { name?: string; args: string }> = {};
      setMessages([...next, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            const delta = p.choices?.[0]?.delta;
            const c = delta?.content;
            if (c) {
              acc += c;
              setMessages([...next, { role: "assistant", content: acc }]);
            }
            // Capture streamed tool_calls
            const tcs = delta?.tool_calls;
            if (Array.isArray(tcs)) {
              for (const tc of tcs) {
                const i = tc.index ?? 0;
                if (!toolCalls[i]) toolCalls[i] = { args: "" };
                if (tc.function?.name) toolCalls[i].name = tc.function.name;
                if (tc.function?.arguments) toolCalls[i].args += tc.function.arguments;
              }
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      // persist assistant msg
      if (convId && acc) try { appendMsg.mutate({ conversation_id: convId, role: "assistant", content: acc }); } catch {}

      // If the AI called a tool, open the confirmation dialog pre-populated
      const firstTool = Object.values(toolCalls)[0];
      if (firstTool?.name) {
        try {
          const args = firstTool.args ? JSON.parse(firstTool.args) : {};
          openPendingFromTool(firstTool.name, args);
        } catch (err) {
          console.warn("Falha ao parsear tool_call args:", err);
        }
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Não consegui responder agora. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  /** Translate an AI tool_call into a PendingAction and open the confirm dialog. */
  function openPendingFromTool(name: string, args: any) {
    if (name === "criar_lead") {
      setPending({
        kind: "criar_lead",
        nome: String(args.nome ?? ""),
        empresa: args.empresa ?? "",
        valor_estimado: typeof args.valor_estimado === "number" ? args.valor_estimado : undefined,
        email: args.email ?? "",
        whatsapp: args.whatsapp ?? "",
        status: (args.status as any) ?? "novo",
      });
    } else if (name === "criar_tarefa") {
      setPending({
        kind: "criar_tarefa",
        titulo: String(args.titulo ?? ""),
        descricao: args.descricao ?? "",
        prioridade: (args.prioridade as any) ?? "media",
        prazo_dias: typeof args.prazo_dias === "number" ? args.prazo_dias : 1,
        lead_nome: args.lead_nome ?? "",
      });
    } else if (name === "mover_lead") {
      setPending({
        kind: "mover_lead",
        lead_nome: String(args.lead_nome ?? ""),
        novo_status: String(args.novo_status ?? "qualificacao"),
      });
    } else if (name === "gerar_relatorio") {
      setPending({ kind: "gerar_relatorio", tipo: String(args.tipo ?? "geral") });
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setFocusedIdx(null);
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function confirmAction() {
    if (!pending) return;
    try {
      if (pending.kind === "criar_lead") {
        await executarCriarLead({
          nome: pending.nome,
          empresa: pending.empresa,
          valor_estimado: pending.valor_estimado,
          email: pending.email,
          whatsapp: pending.whatsapp,
          status: pending.status,
        });
        toast.success(`Lead criado: ${pending.nome}`);
      } else if (pending.kind === "criar_tarefa") {
        await executarCriarTarefa(pending);
        toast.success(`Tarefa criada: ${pending.titulo}`);
      } else if (pending.kind === "mover_lead") {
        await executarMoverLead({ lead_nome: pending.lead_nome, novo_status: pending.novo_status });
        toast.success(`Lead "${pending.lead_nome}" movido para ${pending.novo_status}`);
      } else if (pending.kind === "gerar_relatorio") {
        await send(`Gere um relatório do tipo "${pending.tipo}" usando os dados reais do CRM, com KPIs, tabela e insights.`);
      }
      setPending(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao executar ação");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Launch IA">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[8px] animate-in fade-in duration-200"
      />
      <div
        className="absolute inset-x-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(820px,calc(100vw-32px))] flex flex-col rounded-[32px] border border-white/[0.10] bg-background/85 shadow-[0_30px_100px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 animate-in fade-in slide-in-from-bottom-6 duration-300 overflow-hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)", maxHeight: "min(75vh, 700px)" }}
      >
        {/* aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              aria-label="Histórico"
              className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground"
            >
              {historyOpen ? <ChevronLeft className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-transparent ring-1 ring-primary/30">
              <LaunchIcon className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Inteligência</div>
              <div className="font-display text-lg font-semibold tracking-tight">Launch</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewConversation}
              aria-label="Nova conversa"
              className="hidden sm:flex h-9 items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Nova
            </button>
            <span className="hidden md:flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] text-muted-foreground">
              <Keyboard className="h-3 w-3" /> ⌘K
            </span>
            <button onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          {/* History sidebar */}
          {historyOpen && (
            <aside className="w-60 shrink-0 border-r border-white/[0.06] bg-white/[0.01] overflow-y-auto">
              <div className="p-3">
                <button
                  onClick={startNewConversation}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm transition hover:bg-white/[0.06]"
                >
                  <Plus className="h-4 w-4" /> Nova conversa
                </button>
              </div>
              <ul className="px-2 pb-3 space-y-1">
                {conversations.length === 0 && (
                  <li className="px-3 py-4 text-center text-xs text-muted-foreground">Sem conversas anteriores.</li>
                )}
                {conversations.map((c) => (
                  <li key={c.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => { setConversationId(c.id); setHistoryOpen(false); }}
                      className={[
                        "flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition",
                        conversationId === c.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                      ].join(" ")}
                      title={c.titulo}
                    >
                      {c.titulo}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta conversa?")) {
                          deleteConv.mutate(c.id);
                          if (conversationId === c.id) startNewConversation();
                        }
                      }}
                      aria-label="Remover"
                      className="opacity-0 group-hover:opacity-100 grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4 py-6">
                <div className="text-center">
                  <div className="font-display text-xl font-semibold tracking-tight">Olá. Sou o Launch.</div>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Seu copiloto operacional. Pergunte sobre leads, pipeline, financeiro ou peça ações.</p>
                </div>
                <div className="mx-auto grid max-w-md gap-2">
                  {[
                    "Resumo do meu funil esta semana",
                    "Quais leads quentes preciso priorizar?",
                    "Como está o financeiro do mês?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-left text-[13px] text-muted-foreground transition hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.filter((m) => m.role !== "system").map((m, i) => (
              <div
                key={i}
                data-msg-idx={i}
                className={[
                  m.role === "user" ? "flex justify-end" : "flex justify-start",
                  focusedIdx === i ? "ring-1 ring-primary/40 rounded-2xl" : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "border border-white/[0.06] bg-white/[0.03] text-foreground",
                  ].join(" ")}
                >
                  {m.content || <span className="opacity-60">…</span>}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] px-3 pt-2.5 pb-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-1">Ações</span>
          <QuickActionChip
            icon={ListTodo}
            label="Criar tarefa"
            onClick={() => setPending({ kind: "criar_tarefa", titulo: "", prioridade: "media", prazo_dias: 1 })}
          />
          <QuickActionChip
            icon={ArrowRightLeft}
            label="Mover lead"
            onClick={() => setPending({ kind: "mover_lead", lead_nome: "", novo_status: "qualificacao" })}
          />
          <QuickActionChip
            icon={FileBarChart}
            label="Gerar relatório"
            onClick={() => setPending({ kind: "gerar_relatorio", tipo: "geral" })}
          />
        </div>

        {/* Composer */}
        <div className="relative border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Pergunte algo ao Launch…  (⌘K para abrir/fechar)"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action confirmation modal */}
      {pending && (
        <ActionConfirmDialog
          pending={pending}
          onChange={setPending}
          onCancel={() => setPending(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

function QuickActionChip({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-foreground/90 transition hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </button>
  );
}

function ActionConfirmDialog({
  pending, onChange, onCancel, onConfirm,
}: {
  pending: PendingAction;
  onChange: (p: PendingAction) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Cancelar" onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/[0.10] bg-background/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <LaunchIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Confirmar ação</div>
            <div className="font-display text-lg font-semibold tracking-tight">
              {pending.kind === "criar_tarefa" && "Criar tarefa"}
              {pending.kind === "mover_lead" && "Mover lead"}
              {pending.kind === "gerar_relatorio" && "Gerar relatório"}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {pending.kind === "criar_tarefa" && (
            <>
              <Field label="Título">
                <input
                  autoFocus
                  value={pending.titulo}
                  onChange={(e) => onChange({ ...pending, titulo: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                  placeholder="Follow-up com cliente X"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridade">
                  <select
                    value={pending.prioridade}
                    onChange={(e) => onChange({ ...pending, prioridade: e.target.value as any })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </Field>
                <Field label="Prazo (dias)">
                  <input
                    type="number" min={0}
                    value={pending.prazo_dias}
                    onChange={(e) => onChange({ ...pending, prazo_dias: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                  />
                </Field>
              </div>
              <Field label="Lead (opcional)">
                <input
                  value={pending.lead_nome ?? ""}
                  onChange={(e) => onChange({ ...pending, lead_nome: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                  placeholder="Nome do lead"
                />
              </Field>
            </>
          )}
          {pending.kind === "mover_lead" && (
            <>
              <Field label="Nome do lead">
                <input
                  autoFocus
                  value={pending.lead_nome}
                  onChange={(e) => onChange({ ...pending, lead_nome: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                />
              </Field>
              <Field label="Novo status">
                <select
                  value={pending.novo_status}
                  onChange={(e) => onChange({ ...pending, novo_status: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                >
                  {["novo","contato_inicial","qualificacao","proposta","negociacao","fechado","perdido"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {pending.kind === "gerar_relatorio" && (
            <Field label="Tipo de relatório">
              <select
                autoFocus
                value={pending.tipo}
                onChange={(e) => onChange({ ...pending, tipo: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
              >
                {["geral","faturamento","funil","inadimplencia","pipeline"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={
              (pending.kind === "criar_tarefa" && !pending.titulo.trim()) ||
              (pending.kind === "mover_lead" && !pending.lead_nome.trim())
            }
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
