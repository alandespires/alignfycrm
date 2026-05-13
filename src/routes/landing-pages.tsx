import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/landing-pages")({
  head: () => ({ meta: [{ title: "Landing Pages — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Landing Pages"
      subtitle="Páginas otimizadas para captura, com integração nativa com pipeline"
      icon={Globe}
      ctaLabel="Nova página"
      description="Builder visual, templates por objetivo (lead, evento, produto), publicação em domínio próprio e A/B testing nativo."
      kpis={[
        { label: "Páginas ativas", value: "14" },
        { label: "Visitas (mês)", value: "8.412" },
        { label: "Taxa de conversão", value: "12.4%", delta: "+2.1pp" },
        { label: "Leads capturados", value: "1.043" },
      ]}
      items={[
        { id: "1", title: "Webinar IA em Vendas — abril/2026", subtitle: "kscrm.com/webinar-ia-vendas", meta: "287 inscritos · 14% conv", status: "Publicada", tone: "success" },
        { id: "2", title: "Demo gratuita — Plano Premium", subtitle: "kscrm.com/demo-premium", meta: "1.842 visitas · 18% conv", status: "Publicada", tone: "success" },
        { id: "3", title: "E-book: Pipeline previsível", subtitle: "kscrm.com/ebook-pipeline", meta: "612 downloads", status: "Publicada", tone: "success" },
        { id: "4", title: "Campanha Black Friday", subtitle: "Rascunho — A/B variante 2", meta: "—", status: "Rascunho", tone: "neutral" },
      ]}
    />
  ),
});
