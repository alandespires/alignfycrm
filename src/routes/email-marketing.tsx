import { createFileRoute } from "@tanstack/react-router";
import { UnavailableModule } from "@/components/unavailable-module";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/email-marketing")({
  head: () => ({ meta: [{ title: "E-mail Marketing — Align CRM" }] }),
  component: () => (
    <UnavailableModule
      title="E-mail Marketing"
      subtitle="Disparos transacionais, broadcasts e sequências de nutrição"
      icon={Mail}
    />
  ),
});
