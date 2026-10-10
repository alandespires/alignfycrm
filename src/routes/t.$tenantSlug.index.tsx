import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/routes/index";

export const Route = createFileRoute("/t/$tenantSlug/")({
  head: () => pageHead("Início do workspace"),
  component: DashboardPage,
});
