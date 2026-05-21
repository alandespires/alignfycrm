import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/base-conhecimento")({
  head: () => ({ meta: [{ title: "Base de Conhecimento — Align CRM" }] }),
  component: () => (
    <ModuleStub
      title="Base de Conhecimento"
      subtitle="Centralize artigos de ajuda, tutoriais e procedimentos internos"
      icon={BookOpen}
      ctaLabel="Novo artigo"
      description="Editor markdown, categorias, busca semântica via IA e métricas de utilidade. Conectada à Launch para sugerir artigos durante atendimentos."
      kpis={[
        { label: "Artigos publicados", value: "127" },
        { label: "Visualizações (mês)", value: "4.218" },
        { label: "Tickets evitados (est.)", value: "84" },
        { label: "Avaliação média", value: "4.6/5" },
      ]}
      items={[
        { id: "1", title: "Como configurar a integração com WhatsApp Business", subtitle: "Categoria: Integrações · 8min de leitura", meta: "847 views", status: "Publicado", tone: "success" },
        { id: "2", title: "Pipeline previsível em 5 passos", subtitle: "Categoria: Boas práticas · 12min", meta: "612 views", status: "Publicado", tone: "success" },
        { id: "3", title: "Recuperar acesso à conta", subtitle: "Categoria: Conta · 3min", meta: "418 views", status: "Publicado", tone: "success" },
        { id: "4", title: "Novo: relatórios customizados via SQL", subtitle: "Categoria: Avançado", meta: "Rascunho", status: "Rascunho", tone: "neutral" },
      ]}
    />
  ),
});
