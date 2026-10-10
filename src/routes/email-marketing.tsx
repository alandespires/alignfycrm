import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { Mail } from "@/components/ui/icons";

export const Route = createFileRoute("/email-marketing")({
  head: () => pageHead("E-mail Marketing"),
  component: () => (
    <UnavailableModule
      title="E-mail Marketing"
      subtitle="Disparos transacionais, broadcasts e sequências de nutrição"
      icon={Mail}
    />
  ),
});
