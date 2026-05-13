import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "Tickets — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Tickets"
      subtitle="Helpdesk integrado: cada ticket vinculado a cliente, conta e histórico"
      icon={LifeBuoy}
      ctaLabel="Novo ticket"
      description="SLA por plano, roteamento por equipe, macros, satisfação (CSAT) e escalonamento automático para sucesso do cliente."
      kpis={[
        { label: "Tickets abertos", value: "47" },
        { label: "SLA cumprido", value: "94%", delta: "+2pp" },
        { label: "Tempo médio resp.", value: "1h 24min" },
        { label: "CSAT", value: "4.8/5" },
      ]}
      items={[
        { id: "1", title: "#TKT-4218 — Erro ao gerar relatório", subtitle: "Acme Corp · Mariana Silva", meta: "Há 12min", status: "Urgente", tone: "danger" },
        { id: "2", title: "#TKT-4217 — Solicitação de novo usuário", subtitle: "TechFlow · Rafael Mendes", meta: "Há 1h", status: "Em análise", tone: "info" },
        { id: "3", title: "#TKT-4216 — Dúvida sobre integração API", subtitle: "Vector Studios · Bianca Lopes", meta: "Há 3h", status: "Aguardando cliente", tone: "warn" },
        { id: "4", title: "#TKT-4215 — Treinamento adicional", subtitle: "Mendes Adv · Carolina Pinto", meta: "Hoje 10:42", status: "Resolvido", tone: "success" },
      ]}
    />
  ),
});
