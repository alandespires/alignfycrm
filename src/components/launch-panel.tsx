import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";

type Msg = { role: "user" | "assistant"; content: string };

export function LaunchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { current } = useTenant();
  const tenantId = (current?.tenant as any)?.id;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!tenantId) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kassia-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: next, tenant_id: tenantId }),
      });
      if (!resp.ok || !resp.body) throw new Error("AI failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
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
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages([...next, { role: "assistant", content: acc }]);
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Não consegui responder agora. Tente novamente." }]);
    } finally {
      setLoading(false);
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
        className="absolute inset-x-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(720px,calc(100vw-32px))] flex flex-col rounded-[32px] border border-white/[0.10] bg-background/85 shadow-[0_30px_100px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 animate-in fade-in slide-in-from-bottom-6 duration-300 overflow-hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)", maxHeight: "min(70vh, 640px)" }}
      >
        {/* subtle aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/40 shadow-[0_0_24px_-4px_oklch(0.7_0.18_145_/_0.5)]">
              <Sparkles className="h-4 w-4 text-primary" />
              <div aria-hidden className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Inteligência</div>
              <div className="font-display text-lg font-semibold tracking-tight">Launch</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground transition hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4 py-6">
              <div className="text-center">
                <div className="font-display text-xl font-semibold tracking-tight">Olá. Sou o Launch.</div>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Seu copiloto operacional. Pergunte sobre leads, pipeline, financeiro ou peça relatórios.</p>
              </div>
              <div className="mx-auto grid max-w-md gap-2">
                {[
                  "Resumo do meu funil esta semana",
                  "Quais leads quentes preciso priorizar?",
                  "Como está o financeiro do mês?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-left text-[13px] text-muted-foreground transition hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
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

        <div className="relative border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Pergunte algo ao Launch…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
