import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/email-marketing")({
  head: () => ({ meta: [{ title: "E-mail Marketing — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="E-mail Marketing"
      subtitle="Disparos transacionais, broadcasts e sequências de nutrição"
      icon={Mail}
      ctaLabel="Novo disparo"
      description="Editor drag-and-drop, segmentação dinâmica baseada em CRM, A/B testing e relatórios de entregabilidade."
      kpis={[
        { label: "Enviados (mês)", value: "12.847" },
        { label: "Taxa de abertura", value: "38.2%", delta: "+4pp" },
        { label: "Taxa de clique", value: "7.1%" },
        { label: "Bounces", value: "1.2%" },
      ]}
      items={[
        { id: "1", title: "Newsletter Semanal #142", subtitle: "Toda base ativa · 4.218 destinatários", meta: "42% abertura", status: "Enviada", tone: "success" },
        { id: "2", title: "Sequência de boas-vindas (4 emails)", subtitle: "Trigger: novo cadastro", meta: "284 ativos", status: "Automática", tone: "info" },
        { id: "3", title: "Onboarding Premium", subtitle: "Trigger: upgrade para Premium", meta: "32 ativos", status: "Automática", tone: "info" },
        { id: "4", title: "Reengajamento — 60d sem login", subtitle: "Segmento: usuários inativos", meta: "Rascunho", status: "Rascunho", tone: "neutral" },
      ]}
    />
  ),
});
