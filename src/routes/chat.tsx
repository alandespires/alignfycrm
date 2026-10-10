import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { MessageCircle } from "@/components/ui/icons";

export const Route = createFileRoute("/chat")({
  head: () => pageHead("Chat ao Vivo"),
  component: () => (
    <UnavailableModule
      title="Chat ao Vivo"
      subtitle="Atendimento em tempo real no site, com transferência para vendas/suporte"
      icon={MessageCircle}
    />
  ),
});
