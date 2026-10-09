import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, Sparkles, UserRound, Users, AlertCircle } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { getActiveTenantId } from "@/contexts/tenant-context";
import { leadsQueryOptions } from "@/hooks/use-leads";
import { clientsQueryOptions } from "@/hooks/use-clients";
import { dealsQueryOptions } from "@/hooks/use-deals";

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function GlobalSearch({ open, onOpenChange, onAskLaunch }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAskLaunch: () => void;
}) {
  const navigate = useNavigate();
  const tenantId = getActiveTenantId();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 150); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (!open) { setQ(""); setDebounced(""); } }, [open]);

  // Shared cache with the list pages — no extra fetch when already loaded.
  const leads = useQuery({ ...leadsQueryOptions(tenantId), enabled: open && !!tenantId });
  const clients = useQuery({ ...clientsQueryOptions(tenantId), enabled: open && !!tenantId });
  const deals = useQuery({ ...dealsQueryOptions(tenantId), enabled: open && !!tenantId });

  const term = norm(debounced.trim());
  const match = (...f: (string | null | undefined)[]) => !term || f.some((x) => norm(x).includes(term));

  const results = useMemo(() => ({
    leads: (leads.data ?? []).filter((l) => match(l.nome, l.empresa, l.email, l.whatsapp, l.nicho)).slice(0, 6),
    clients: (clients.data ?? []).filter((c) => match(c.nome, c.empresa, c.email, c.whatsapp)).slice(0, 6),
    deals: (deals.data ?? []).filter((d) => match(d.titulo)).slice(0, 6),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [leads.data, clients.data, deals.data, term]);

  const loading = leads.isLoading || clients.isLoading || deals.isLoading;
  const failed = leads.isError || clients.isError || deals.isError;

  const go = (to: string) => { onOpenChange(false); navigate({ to }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar leads, clientes, oportunidades…" value={q} onValueChange={setQ} />
      <CommandList>
        {failed && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> Não foi possível carregar parte dos registros. Tente novamente.
          </div>
        )}
        <CommandEmpty>{loading ? "Carregando…" : "Nenhum registro encontrado."}</CommandEmpty>
        {results.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {results.leads.map((l) => (
              <CommandItem key={l.id} value={`lead-${l.id}-${l.nome}`} onSelect={() => go("/leads")}>
                <UserRound className="h-4 w-4" />
                <span className="truncate">{l.nome}</span>
                {l.empresa && <span className="ml-auto truncate text-xs text-muted-foreground">{l.empresa}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.clients.length > 0 && (
          <CommandGroup heading="Clientes">
            {results.clients.map((c) => (
              <CommandItem key={c.id} value={`client-${c.id}-${c.nome}`} onSelect={() => go("/clientes")}>
                <Users className="h-4 w-4" />
                <span className="truncate">{c.nome}</span>
                {c.empresa && <span className="ml-auto truncate text-xs text-muted-foreground">{c.empresa}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.deals.length > 0 && (
          <CommandGroup heading="Oportunidades">
            {results.deals.map((d) => (
              <CommandItem key={d.id} value={`deal-${d.id}-${d.titulo}`} onSelect={() => go("/oportunidades")}>
                <Briefcase className="h-4 w-4" />
                <span className="truncate">{d.titulo}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {Number(d.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Launch IA">
          <CommandItem value={`launch-ask-${q}`} onSelect={() => { onOpenChange(false); onAskLaunch(); }}>
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="truncate">{q ? `Perguntar ao Launch: “${q}”` : "Abrir Launch IA"}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
