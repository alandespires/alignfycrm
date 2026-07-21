import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat ao Vivo — Align CRM" }] }),
  component: () => (
    <UnavailableModule
      title="Chat ao Vivo"
      subtitle="Atendimento em tempo real no site, com transferência para vendas/suporte"
      icon={MessageCircle}
    />
  ),
});
