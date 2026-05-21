import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/dashboards")({
  head: () => ({ meta: [{ title: "Dashboards Customizáveis — Align CRM" }] }),
  component: () => (
    <ModuleStub
      title="Dashboards Customizáveis"
      subtitle="Construa painéis sob medida por equipe, papel ou objetivo"
      icon={LineChart}
      ctaLabel="Novo dashboard"
      description="Biblioteca de widgets, filtros compartilhados, agendamento de envio por e-mail e export para PDF/PNG. Permissionamento por dashboard."
      kpis={[
        { label: "Dashboards criados", value: "23" },
        { label: "Compartilhados", value: "14" },
        { label: "Visualizações (semana)", value: "412" },
        { label: "Templates disponíveis", value: "12" },
      ]}
      items={[
        { id: "1", title: "Diretoria Comercial — Visão executiva", subtitle: "Compartilhado com 4 pessoas · atualizado em tempo real", meta: "Hoje", status: "Ativo", tone: "success" },
        { id: "2", title: "Pipeline por SDR", subtitle: "Equipe de pré-vendas · 8 widgets", meta: "Hoje", status: "Ativo", tone: "success" },
        { id: "3", title: "Performance de Marketing", subtitle: "CAC, LTV, ROI por canal · enviado por e-mail toda segunda", meta: "Semanal", status: "Agendado", tone: "info" },
        { id: "4", title: "Saúde da base — Customer Success", subtitle: "Churn risk · NPS · adoção", meta: "Mensal", status: "Em construção", tone: "neutral" },
      ]}
    />
  ),
});
