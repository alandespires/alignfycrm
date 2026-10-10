import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { Globe } from "@/components/ui/icons";

export const Route = createFileRoute("/landing-pages")({
  head: () => pageHead("Landing Pages"),
  component: () => (
    <UnavailableModule
      title="Landing Pages"
      subtitle="Páginas otimizadas para captura, com integração nativa com pipeline"
      icon={Globe}
    />
  ),
});
