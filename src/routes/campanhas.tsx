import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Align CRM" }] }),
  component: () => (
    <ModuleStub
      title="Campanhas"
      subtitle="Aquisição, nutrição e reativação em múltiplos canais"
      icon={Megaphone}
      ctaLabel="Nova campanha"
      description="Crie campanhas multicanal (e-mail, WhatsApp, anúncios), defina público, mensagens e meça atribuição com pipeline."
      kpis={[
        { label: "Campanhas ativas", value: "8" },
        { label: "Leads gerados", value: "612", delta: "+34%" },
        { label: "CAC médio", value: "R$ 187" },
        { label: "ROI consolidado", value: "4.8x" },
      ]}
      items={[
        { id: "1", title: "Black Friday — Plano Anual", subtitle: "E-mail + Ads · público base ativa", meta: "143 leads", status: "Ativa", tone: "success" },
        { id: "2", title: "Webinar: IA em Vendas", subtitle: "Landing + Ads + nutrição 4 emails", meta: "287 inscritos", status: "Ativa", tone: "success" },
        { id: "3", title: "Reativação de churn 90d", subtitle: "WhatsApp + e-mail · 320 contatos", meta: "18% reabriram", status: "Em análise", tone: "info" },
        { id: "4", title: "Indique e Ganhe", subtitle: "Programa de indicação", meta: "47 indicações", status: "Pausada", tone: "neutral" },
      ]}
    />
  ),
});
