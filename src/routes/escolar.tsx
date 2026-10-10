import { pageHead } from "@/lib/page-head";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { GraduationCap } from "@/components/ui/icons";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/escolar")({
  head: () => pageHead("Align Escolar"),
  component: EscolarLayout,
});

function EscolarLayout() {
  return (
    <AppShell
      title="Align Escolar"
      subtitle="Sistema pedagógico — turmas, notas, frequência e portal do aluno."
      action={
        <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary shadow-glow">
          <GraduationCap className="h-3.5 w-3.5" />
          Módulo Educacional
        </div>
      }
    >
      <div className="ks-escolar-theme relative overflow-hidden border border-primary/25 shadow-elevated">
        {/* Acento superior */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        {/* Ambient gradients */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-primary/[0.10] blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-15%] h-[380px] w-[380px] rounded-full bg-accent/[0.08] blur-3xl" />
        </div>
        <div className="relative p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
