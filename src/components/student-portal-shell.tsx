import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { LogOut } from "@/components/ui/icons";
import alignIcon from "@/assets/align-icon.png";
import { useAuth } from "@/contexts/auth-context";

export function StudentPortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface-1/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <img src={alignIcon} alt="Align" className="h-9 w-9 rounded-xl bg-black object-contain" />
          <div><div className="text-sm font-semibold">Portal do Aluno</div><div className="text-[11px] text-muted-foreground">Align Escolar</div></div>
          <div className="ml-auto hidden text-xs text-muted-foreground sm:block">{user?.email}</div>
          <Button variant="unstyled" size="unstyled" type="button" onClick={() => signOut()} aria-label="Sair do Portal do Aluno" className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6"><h1 className="text-3xl font-semibold tracking-tight">Portal do Aluno</h1><p className="mt-1 text-sm text-muted-foreground">Suas aulas, notas, frequência e comunicados.</p></div>
        {children}
      </main>
    </div>
  );
}
