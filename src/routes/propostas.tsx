import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/propostas")({
  head: () => ({ meta: [{ title: "Propostas e Cotações — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Propostas e Cotações"
      subtitle="Crie, envie e acompanhe propostas comerciais com aceite digital"
      icon={FileText}
      ctaLabel="Nova proposta"
      description="Modelos personalizáveis, geração automática em PDF, links de aceite e histórico de visualizações pelo cliente."
      kpis={[
        { label: "Enviadas (mês)", value: "47" },
        { label: "Aceitas", value: "18", delta: "+22%" },
        { label: "Taxa de aceite", value: "38%" },
        { label: "Pendentes", value: "12" },
      ]}
      items={[
        { id: "1", title: "Proposta #2026-0148 — Acme Corp", subtitle: "Plano Premium · 12 meses", meta: "R$ 86.000", status: "Visualizada", tone: "info" },
        { id: "2", title: "Proposta #2026-0147 — TechFlow", subtitle: "Renovação anual + add-ons", meta: "R$ 124.000", status: "Aceita", tone: "success" },
        { id: "3", title: "Proposta #2026-0146 — Loma Digital", subtitle: "Setup inicial + onboarding", meta: "R$ 19.800", status: "Enviada", tone: "neutral" },
        { id: "4", title: "Proposta #2026-0145 — Mendes Adv", subtitle: "Plano Plus · 25 usuários", meta: "R$ 38.500", status: "Expirada", tone: "danger" },
      ]}
    />
  ),
});
