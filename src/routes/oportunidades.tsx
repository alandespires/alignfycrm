import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { Target } from "lucide-react";

export const Route = createFileRoute("/oportunidades")({
  head: () => ({ meta: [{ title: "Oportunidades — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Oportunidades"
      subtitle="Negócios em estágio avançado, com valor previsto e previsão de fechamento"
      icon={Target}
      ctaLabel="Nova oportunidade"
      description="Centralize negócios qualificados que avançaram além do pipeline inicial. Acompanhe valor, probabilidade e datas críticas."
      kpis={[
        { label: "Em aberto", value: "23" },
        { label: "Valor total", value: "R$ 487k", delta: "+12%" },
        { label: "Ticket médio", value: "R$ 21.1k" },
        { label: "Conversão prevista", value: "38%" },
      ]}
      items={[
        { id: "1", title: "Implementação Kassoft - Acme Corp", subtitle: "Fechamento previsto: 15/05", meta: "R$ 86.000", status: "Negociação", tone: "warn" },
        { id: "2", title: "Renovação anual - TechFlow", subtitle: "Renovação contrato premium", meta: "R$ 124.000", status: "Proposta", tone: "info" },
        { id: "3", title: "Expansão Plus - Mendes Advogados", subtitle: "Add-on de 25 usuários", meta: "R$ 38.500", status: "Qualificação", tone: "neutral" },
        { id: "4", title: "Setup Enterprise - Vector Studios", subtitle: "Onboarding + treinamentos", meta: "R$ 52.300", status: "Negociação", tone: "warn" },
      ]}
    />
  ),
});
