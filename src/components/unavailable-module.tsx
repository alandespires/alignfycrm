import type { LucideIcon } from "@/components/ui/icons";
import { Clock3, ShieldCheck } from "@/components/ui/icons";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Link } from "@tanstack/react-router";

export function UnavailableModule({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      action={<StatusPill tone="neutral"><Clock3 className="h-3 w-3" /> Em desenvolvimento</StatusPill>}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-border bg-surface-1 px-6 py-14 text-center shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">Funcionalidade ainda não disponível</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Este módulo está em desenvolvimento e não representa dados ou operações reais. Ele será liberado somente depois da integração, segurança e testes estarem concluídos.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Nenhuma informação foi criada, enviada ou armazenada nesta tela.
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Voltar ao dashboard</Link>
          <Link to="/configuracoes" className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-foreground">Ver integrações disponíveis</Link>
        </div>
      </div>
    </AppShell>
  );
}
