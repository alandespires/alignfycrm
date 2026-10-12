import { Link } from "@tanstack/react-router";
import { Kanban, Rows3 } from "@/components/ui/icons";

const base = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors";

export function FunnelViewSwitch({ current }: { current: "kanban" | "lista" }) {
  return (
    <div role="tablist" aria-label="Visão do funil" className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-surface-1 p-1">
      <Link to="/pipeline" role="tab" aria-selected={current === "kanban"} className={[base, current === "kanban" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
        <Kanban className="h-3.5 w-3.5" /> Kanban
      </Link>
      <Link to="/oportunidades" role="tab" aria-selected={current === "lista"} className={[base, current === "lista" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
        <Rows3 className="h-3.5 w-3.5" /> Lista
      </Link>
    </div>
  );
}
