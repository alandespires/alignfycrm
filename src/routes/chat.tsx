import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat ao Vivo — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Chat ao Vivo"
      subtitle="Atendimento em tempo real no site, com transferência para vendas/suporte"
      icon={MessageCircle}
      ctaLabel="Configurar widget"
      description="Widget customizável, distribuição inteligente entre operadores, respostas rápidas, integração com Launch e conversão automática em lead."
      kpis={[
        { label: "Conversas hoje", value: "84" },
        { label: "Tempo médio resp.", value: "27s", delta: "−8s" },
        { label: "Operadores online", value: "5" },
        { label: "Convertidos em lead", value: "23%" },
      ]}
      items={[
        { id: "1", title: "Visitante #VS-9128", subtitle: "Página: /demo-premium · 'Quanto custa o plano enterprise?'", meta: "Agora", status: "Aguardando", tone: "warn" },
        { id: "2", title: "Mariana Silva (Acme)", subtitle: "Atendido por Camila · 6 mensagens", meta: "2min", status: "Em conversa", tone: "info" },
        { id: "3", title: "Visitante #VS-9127", subtitle: "Solicitou demonstração — convertido em lead", meta: "12min", status: "Convertido", tone: "success" },
        { id: "4", title: "Pedro Castro (Loma)", subtitle: "Dúvida resolvida — CSAT 5/5", meta: "Há 1h", status: "Encerrado", tone: "neutral" },
      ]}
    />
  ),
});
