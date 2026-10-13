import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderKanban, CheckSquare, Loader2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";
import type { ClientRow } from "@/hooks/use-clients";

type Mode = "projeto" | "tarefa" | null;

export function ClientQuickActions({ client }: { client: ClientRow }) {
  const [mode, setMode] = useState<Mode>(null);
  const [titulo, setTitulo] = useState("");
  const [done, setDone] = useState<Mode>(null);
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const pending = createProject.isPending || createTask.isPending;
  const nome = client.empresa || client.nome;

  const open = (m: Mode) => {
    setMode(m);
    setDone(null);
    setTitulo(m === "projeto" ? `Projeto · ${nome}` : `Onboarding · ${nome}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t || !mode) return;
    if (mode === "projeto") {
      await createProject.mutateAsync({ titulo: t, client_id: client.id, lead_id: client.lead_id } as any);
    } else {
      await createTask.mutateAsync({ titulo: t, client_id: client.id, lead_id: client.lead_id });
    }
    setDone(mode);
    setMode(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => open("projeto")}>
          <FolderKanban className="h-3.5 w-3.5" /> Novo projeto
        </Button>
        <Button variant="outline" size="sm" onClick={() => open("tarefa")}>
          <CheckSquare className="h-3.5 w-3.5" /> Nova tarefa
        </Button>
      </div>
      {mode && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-label={mode === "projeto" ? "Nome do projeto" : "Título da tarefa"}
            className="h-9 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/50"
          />
          <Button type="submit" size="sm" disabled={pending || !titulo.trim()}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>Cancelar</Button>
        </form>
      )}
      {done && (
        <Link to={done === "projeto" ? "/projetos" : "/tarefas"} className="inline-block text-xs text-primary hover:underline">
          {done === "projeto" ? "Ver em Projetos →" : "Ver em Tarefas →"}
        </Link>
      )}
    </div>
  );
}
