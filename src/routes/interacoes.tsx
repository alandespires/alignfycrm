import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { History } from "lucide-react";

export const Route = createFileRoute("/interacoes")({
  head: () => ({ meta: [{ title: "Histórico de Interações — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Histórico de Interações"
      subtitle="Timeline cronológica de todos os pontos de contato com clientes e leads"
      icon={History}
      ctaLabel="Registrar interação"
      description="E-mails, ligações, reuniões, mensagens — tudo unificado em uma timeline pesquisável e filtrável por pessoa, empresa ou negócio."
      kpis={[
        { label: "Interações (semana)", value: "428", delta: "+14%" },
        { label: "Ligações", value: "117" },
        { label: "E-mails enviados", value: "284" },
        { label: "Reuniões", value: "27" },
      ]}
      items={[
        { id: "1", title: "Reunião com Mariana Silva (Acme Corp)", subtitle: "Apresentação de proposta — 32min", meta: "Hoje 14:30", status: "Reunião", tone: "info" },
        { id: "2", title: "WhatsApp para Rafael Mendes", subtitle: "Confirmação de demo agendada para sexta", meta: "Hoje 11:15", status: "WhatsApp", tone: "success" },
        { id: "3", title: "Ligação para Pedro Castro (Loma)", subtitle: "Follow-up pós envio de proposta — 8min", meta: "Ontem 16:42", status: "Ligação", tone: "warn" },
        { id: "4", title: "E-mail para Bianca Lopes", subtitle: "Material técnico de integração", meta: "Ontem 09:18", status: "E-mail", tone: "neutral" },
      ]}
    />
  ),
});
