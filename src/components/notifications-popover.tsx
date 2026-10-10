import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2, Sparkles, Users, Wallet, ListChecks, Building2, Flame, Snowflake, Zap, AlertTriangle, ArrowRightLeft } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONS: Record<string, any> = {
  lead_novo: Users,
  lead_quente: Flame,
  lead_frio: Snowflake,
  status_mudou: ArrowRightLeft,
  tarefa_criada: ListChecks,
  tarefa_atrasada: AlertTriangle,
  tarefa_concluida: Check,
  financeiro_vencendo: Wallet,
  financeiro_atrasado: AlertTriangle,
  financeiro_recebido: Wallet,
  cliente_novo: Building2,
  automacao_executada: Zap,
  insight_ia: Sparkles,
  sistema: Bell,
};

const TONE: Record<string, string> = {
  urgente: "text-destructive",
  alta: "text-warning",
  media: "text-primary",
  baixa: "text-muted-foreground",
};

type NotificationGroup = {
  key: string;
  items: Notification[];
  notification: Notification;
  title: string;
  description: string | null;
};

function groupNotifications(list: Notification[]): NotificationGroup[] {
  const groups = new Map<string, Notification[]>();
  for (const notification of list) {
    const importGroup = notification.tipo === "lead_novo" && /importa[cç][aã]o/i.test(notification.descricao ?? "");
    const day = notification.created_at.slice(0, 10);
    const key = importGroup ? `lead-import:${day}:${notification.descricao}` : notification.id;
    groups.set(key, [...(groups.get(key) ?? []), notification]);
  }
  return Array.from(groups, ([key, items]) => ({
    key,
    items,
    notification: items[0],
    title: items.length > 1 ? `${items.length} novos leads importados` : items[0].titulo,
    description: items.length > 1 ? `${items[0].descricao} · toque para abrir a lista` : items[0].descricao,
  }));
}

export function NotificationsPopover() {
  const { list, unread, markRead, markManyRead, markAllRead, remove, removeMany, clearAll } = useNotifications();
  const navigate = useNavigate();
  const grouped = groupNotifications(list);

  function handleClick(n: Notification) {
    if (!n.lida) markRead.mutate(n.id);
    if (n.link) navigate({ to: n.link as any });
  }

  function handleGroupClick(group: NotificationGroup) {
    if (group.items.length === 1) return handleClick(group.notification);
    const unreadIds = group.items.filter((item) => !item.lida).map((item) => item.id);
    if (unreadIds.length) markManyRead.mutate(unreadIds);
    navigate({ to: "/leads" });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="unstyled" size="unstyled"
          aria-label="Notificações"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-glow">
              {unread >= 50 ? "50+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notificações</div>
            <div className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
            </div>
          </div>
          <div className="flex gap-1">
            {unread > 0 && (
              <Button variant="unstyled" size="unstyled"
                onClick={() => markAllRead.mutate()}
                title="Marcar todas como lidas"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {list.length > 0 && (
              <Button variant="unstyled" size="unstyled"
                onClick={() => clearAll.mutate()}
                title="Limpar tudo"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[440px] overflow-y-auto">
          {list.length === 0 ? (
            <div className="grid place-items-center gap-2 px-4 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">Nenhuma notificação</div>
              <div className="text-xs text-muted-foreground">Você será avisado por aqui.</div>
            </div>
          ) : (
            grouped.map((group) => {
              const n = group.notification;
              const Icon = ICONS[n.tipo] ?? Bell;
              const tone = TONE[n.prioridade] ?? "text-primary";
              const isUnread = group.items.some((item) => !item.lida);
              return (
                <div
                  key={group.key}
                  className={[
                    "group flex gap-3 border-b border-border/60 px-4 py-3 transition hover:bg-surface-2/60",
                    isUnread ? "bg-primary/[0.04]" : "",
                  ].join(" ")}
                >
                  <Button variant="unstyled" size="unstyled" onClick={() => handleGroupClick(group)} className="flex flex-1 gap-3 text-left">
                    <div className={["mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2", tone].join(" ")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="line-clamp-1 flex-1 text-sm font-medium">{group.title}</div>
                        {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {group.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{group.description}</div>
                      )}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </Button>
                  <Button variant="unstyled" size="unstyled"
                    onClick={() => group.items.length > 1 ? removeMany.mutate(group.items.map((item) => item.id)) : remove.mutate(n.id)}
                    aria-label={group.items.length > 1 ? `Remover grupo ${group.title}` : `Remover notificação ${group.title}`}
                    className="self-start opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
