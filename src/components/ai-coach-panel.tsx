import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Loader2, X, Zap, AlertCircle, TrendingUp, RefreshCw, Send, MessageSquare, Lightbulb, Plus, Trash2, History, Filter, Download, FileText, ListChecks, Move, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAiCoach, type CoachAction } from "@/hooks/use-ai-coach";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConversations, useMessages, useCreateConversation, useAppendMessage, useDeleteConversation, useRenameConversation } from "@/hooks/use-kassia-conversations";
import { useTenant } from "@/contexts/tenant-context";
import { downloadRelatorioPDF, previewRelatorioPDF, type RelatorioPayload } from "@/lib/kassia-pdf";
import { executarCriarTarefa, executarMoverLead } from "@/lib/kassia-actions";

const PRIO_TONE: Record<CoachAction["prioridade"], string> = {
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  media: "bg-primary/15 text-primary border-primary/30",
  baixa: "bg-surface-3 text-muted-foreground border-border",
};
const FOCO_LABEL: Record<CoachAction["foco"], string> = {
  leads_quentes: "Leads quentes", tarefas: "Tarefas", prospeccao: "Prospecção", reativacao: "Reativação", performance: "Performance",
};

const SUGESTOES_RAPIDAS = [
  "Como está meu faturamento este mês?",
  "Gere um relatório do funil de vendas em PDF",
  "Quais leads quentes preciso atacar agora?",
  "Crie um follow-up para o lead mais quente em 2 dias",
];

const ESTAGIOS = [
  { v: "", l: "Todos os estágios" },
  { v: "novo", l: "Novo" },
  { v: "contato_inicial", l: "Contato inicial" },
  { v: "qualificacao", l: "Qualificação" },
  { v: "proposta", l: "Proposta" },
  { v: "negociacao", l: "Negociação" },
  { v: "fechado", l: "Fechado" },
  { v: "perdido", l: "Perdido" },
];

type ToolCall = { id: string; name: string; arguments: any };
type LocalMsg = { role: "user" | "assistant"; content: string; tool_calls?: ToolCall[]; relatorio?: RelatorioPayload };

export function AiCoachButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sugestoes" | "chat">("chat");
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
        Conversar com a IA
      </button>
      {open && <KassiaPanel onClose={() => setOpen(false)} tab={tab} setTab={setTab} />}
    </>
  );
}

function KassiaPanel({ onClose, tab, setTab }: { onClose: () => void; tab: "sugestoes" | "chat"; setTab: (t: "sugestoes" | "chat") => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-surface-1 shadow-elevated">
        <div className="border-b border-border bg-surface-1/95 backdrop-blur">
          <div className="flex items-start justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] text-primary-foreground shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">KassIA</h2>
                <p className="text-[11px] text-muted-foreground">Sua copiloto inteligente do Launcher CRM</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-1 px-3 pb-2">
            <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare}>Conversar</TabBtn>
            <TabBtn active={tab === "sugestoes"} onClick={() => setTab("sugestoes")} icon={Lightbulb}>Sugestões</TabBtn>
          </div>
        </div>
        {tab === "sugestoes" ? <SugestoesView /> : <ChatView />}
      </aside>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function SugestoesView() {
  const coach = useAiCoach();
  useEffect(() => {
    if (!coach.data && !coach.isPending) coach.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-3 flex items-center justify-end">
        <button onClick={() => coach.mutate()} disabled={coach.isPending} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${coach.isPending ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>
      {coach.isPending && <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="mt-3 text-xs">Analisando sua operação...</p></div>}
      {coach.isError && !coach.isPending && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span>{(coach.error as Error)?.message ?? "Erro ao gerar sugestões."}</span></div>
      )}
      {coach.data && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4"><p className="text-sm leading-relaxed">{coach.data.resumo}</p></div>
          <div className="grid grid-cols-3 gap-2">
            <CtxStat label="Leads" value={coach.data.context.total_leads} />
            <CtxStat label="Tarefas" value={coach.data.context.tarefas_em_aberto} />
            <CtxStat label="Atrasadas" value={coach.data.context.tarefas_atrasadas} accent={coach.data.context.tarefas_atrasadas > 0} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações recomendadas</h3>
            {(coach.data.acoes ?? []).map((a, i) => (
              <div key={i} className={`rounded-xl border p-3 ${PRIO_TONE[a.prioridade] ?? PRIO_TONE.media}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"><Zap className="h-2.5 w-2.5" /> {a.prioridade}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><TrendingUp className="h-2.5 w-2.5" /> {FOCO_LABEL[a.foco] ?? a.foco}</span>
                </div>
                <h4 className="text-sm font-semibold leading-snug text-foreground">{a.titulo}</h4>
                <p className="mt-1 text-xs leading-relaxed text-foreground/80">{a.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatView() {
  const { current } = useTenant();
  const conversations = useConversations();
  const createConv = useCreateConversation();
  const appendMsg = useAppendMessage();
  const deleteConv = useDeleteConversation();
  const renameConv = useRenameConversation();

  const [convId, setConvId] = useState<string | null>(null);
  const messagesQ = useMessages(convId);
  const [draft, setDraft] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [periodoIni, setPeriodoIni] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [estagio, setEstagio] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sincroniza mensagens persistidas
  useEffect(() => {
    if (messagesQ.data) {
      setDraft(messagesQ.data.map((m) => {
        const meta = m.metadata as any;
        return {
          role: m.role as "user" | "assistant",
          content: m.content,
          tool_calls: meta?.tool_calls,
          relatorio: meta?.relatorio,
        };
      }));
    } else if (!convId) {
      setDraft([{ role: "assistant", content: "Olá! Eu sou a **KassIA** 👋\n\nPosso responder dúvidas, gerar relatórios em PDF e até executar ações como criar tarefas e mover leads no pipeline. O que você quer ver hoje?" }]);
    }
  }, [messagesQ.data, convId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [draft, sending]);

  const filtros = useMemo(() => ({
    periodo: { inicio: periodoIni || undefined, fim: periodoFim || undefined },
    estagio: estagio || null,
  }), [periodoIni, periodoFim, estagio]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    // Garante conversa
    let activeId = convId;
    if (!activeId) {
      const c = await createConv.mutateAsync(content.slice(0, 60));
      activeId = c.id;
      setConvId(activeId);
    }

    const next: LocalMsg[] = [...draft, { role: "user", content }, { role: "assistant", content: "" }];
    setDraft(next);
    setInput("");
    setSending(true);

    // Persiste user msg
    await appendMsg.mutateAsync({ conversation_id: activeId, role: "user", content }).catch(() => null);

    let assistantText = "";
    const toolCallsAcc: Record<number, { id: string; name: string; argsBuf: string }> = {};

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/kassia-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          filters: filtros,
          tenant_id: current?.tenant.id,
        }),
      });

      if (resp.status === 429) throw new Error("Muitas requisições. Aguarde alguns segundos.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
      if (!resp.ok || !resp.body) throw new Error("Falha ao conectar com a KassIA");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              assistantText += delta.content;
              setDraft((cur) => {
                const copy = [...cur];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantText };
                return copy;
              });
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { id: tc.id ?? `tc-${idx}`, name: tc.function?.name ?? "", argsBuf: "" };
                if (tc.function?.name) toolCallsAcc[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallsAcc[idx].argsBuf += tc.function.arguments;
              }
            }
          } catch { /* partial */ }
        }
      }

      // Processa tool calls finais
      const toolCalls: ToolCall[] = Object.values(toolCallsAcc).map((t) => {
        let args: any = {};
        try { args = JSON.parse(t.argsBuf); } catch { args = { _raw: t.argsBuf }; }
        return { id: t.id, name: t.name, arguments: args };
      });

      let relatorio: RelatorioPayload | undefined;
      const otherCalls: ToolCall[] = [];
      for (const tc of toolCalls) {
        if (tc.name === "gerar_relatorio") {
          relatorio = tc.arguments as RelatorioPayload;
        } else {
          otherCalls.push(tc);
        }
      }

      // Se não houve texto mas houve relatório, gera mensagem
      if (!assistantText && relatorio) {
        assistantText = `📊 Relatório **${relatorio.titulo}** pronto.\n\n${relatorio.resumo}`;
      }

      const finalMsg: LocalMsg = {
        role: "assistant",
        content: assistantText || "Pronto.",
        tool_calls: otherCalls.length ? otherCalls : undefined,
        relatorio,
      };
      setDraft((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = finalMsg;
        return copy;
      });

      await appendMsg.mutateAsync({
        conversation_id: activeId,
        role: "assistant",
        content: finalMsg.content,
        metadata: { tool_calls: finalMsg.tool_calls, relatorio: finalMsg.relatorio },
      }).catch(() => null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro na KassIA");
      setDraft((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${e.message ?? "Erro ao responder."}` };
        return copy;
      });
    } finally {
      setSending(false);
    }
  };

  const tenantInfo = { tenant: current?.tenant.nome, periodo: periodoIni && periodoFim ? `${periodoIni} → ${periodoFim}` : undefined };

  const handleAction = async (call: ToolCall) => {
    try {
      if (call.name === "criar_tarefa") {
        await executarCriarTarefa(call.arguments);
        toast.success(`Tarefa "${call.arguments.titulo}" criada`);
      } else if (call.name === "mover_lead") {
        const r = await executarMoverLead(call.arguments);
        toast.success(`Lead "${r.nome}" movido para ${r.novo_status}`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha na ação");
    }
  };

  const novaConversa = () => {
    setConvId(null);
    setDraft([{ role: "assistant", content: "Nova conversa iniciada. Como posso ajudar?" }]);
    setShowHistory(false);
  };

  const limparChat = async () => {
    if (!convId) { novaConversa(); return; }
    if (!confirm("Apagar esta conversa? Essa ação não pode ser desfeita.")) return;
    await deleteConv.mutateAsync(convId);
    novaConversa();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border bg-surface-1 px-3 py-2">
        <button onClick={novaConversa} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium hover:bg-surface-3">
          <Plus className="h-3 w-3" /> Nova
        </button>
        <button onClick={() => setShowHistory((v) => !v)} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${showHistory ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface-2 hover:bg-surface-3"}`}>
          <History className="h-3 w-3" /> Histórico
        </button>
        <button onClick={() => setShowFilters((v) => !v)} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${showFilters ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-surface-2 hover:bg-surface-3"}`}>
          <Filter className="h-3 w-3" /> Filtros{(periodoIni || periodoFim || estagio) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
        <div className="flex-1" />
        <button onClick={limparChat} disabled={!convId} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-destructive disabled:opacity-40">
          <Trash2 className="h-3 w-3" /> Limpar
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-2 border-b border-border bg-surface-2 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">De</label>
            <input type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} className="h-8 w-full rounded border border-border bg-surface-1 px-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Até</label>
            <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="h-8 w-full rounded border border-border bg-surface-1 px-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estágio</label>
            <select value={estagio} onChange={(e) => setEstagio(e.target.value)} className="h-8 w-full rounded border border-border bg-surface-1 px-2 text-xs">
              {ESTAGIOS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="max-h-48 overflow-y-auto border-b border-border bg-surface-2 p-2">
          {(conversations.data ?? []).length === 0 && <p className="p-2 text-center text-[11px] text-muted-foreground">Sem conversas anteriores.</p>}
          {(conversations.data ?? []).map((c) => (
            <div key={c.id} className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface-3 ${c.id === convId ? "bg-primary/10 text-primary" : ""}`}>
              <button onClick={() => { setConvId(c.id); setShowHistory(false); }} className="flex-1 truncate text-left">{c.titulo}</button>
              <button onClick={() => { const t = prompt("Renomear conversa", c.titulo); if (t) renameConv.mutate({ id: c.id, titulo: t }); }} className="opacity-0 transition group-hover:opacity-100 hover:text-foreground" title="Renomear">✏️</button>
              <button onClick={async () => { if (confirm("Apagar?")) { await deleteConv.mutateAsync(c.id); if (c.id === convId) novaConversa(); } }} className="opacity-0 transition group-hover:opacity-100 hover:text-destructive" title="Apagar"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {draft.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-foreground"}`}>
              {m.role === "assistant" ? (
                m.content || m.relatorio || m.tool_calls ? (
                  <>
                    {m.content && (
                      <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_table]:text-xs [&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}

                    {m.relatorio && (
                      <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">Relatório gerado: {m.relatorio.titulo}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">
                          {m.relatorio.kpis?.slice(0, 6).map((k, j) => (
                            <div key={j} className="rounded border border-border bg-surface-1 p-2">
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                              <div className="text-xs font-bold text-primary">{k.valor}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button onClick={() => setPreviewUrl(previewRelatorioPDF(m.relatorio!, tenantInfo))} className="inline-flex items-center gap-1 rounded-md bg-surface-1 px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-3">
                            <Eye className="h-3 w-3" /> Visualizar
                          </button>
                          <button onClick={() => downloadRelatorioPDF(m.relatorio!, tenantInfo)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
                            <Download className="h-3 w-3" /> Baixar PDF
                          </button>
                        </div>
                      </div>
                    )}

                    {m.tool_calls?.map((tc) => (
                      <button key={tc.id} onClick={() => handleAction(tc)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20">
                        {tc.name === "criar_tarefa" && <><ListChecks className="h-3 w-3" /> Criar tarefa: "{tc.arguments.titulo}"</>}
                        {tc.name === "mover_lead" && <><Move className="h-3 w-3" /> Mover {tc.arguments.lead_nome} → {tc.arguments.novo_status}</>}
                      </button>
                    ))}
                  </>
                ) : <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {draft.length <= 1 && !sending && (
          <div className="space-y-1.5 pt-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sugestões</p>
            {SUGESTOES_RAPIDAS.map((s) => (
              <button key={s} onClick={() => send(s)} className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-surface-3">{s}</button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border bg-surface-1 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 p-1.5 focus-within:border-primary/50">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Pergunte qualquer coisa para a KassIA..." rows={1} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none" />
          <button type="submit" disabled={!input.trim() || sending} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>

      {previewUrl && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface-1 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewUrl(null)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md bg-surface-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <iframe src={previewUrl} className="h-full w-full" title="Preview do relatório" />
          </div>
        </div>
      )}
    </div>
  );
}

function CtxStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 text-center ${accent ? "border-warning/30 bg-warning/10" : "border-border bg-surface-2"}`}>
      <div className="text-xs font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
