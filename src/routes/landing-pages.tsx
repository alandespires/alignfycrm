import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/landing-pages")({
  head: () => ({ meta: [{ title: "Landing Pages — Align CRM" }] }),
  component: () => (
    <UnavailableModule
      title="Landing Pages"
      subtitle="Páginas otimizadas para captura, com integração nativa com pipeline"
      icon={Globe}
    />
  ),
});
