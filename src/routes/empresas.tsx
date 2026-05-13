import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { Building } from "lucide-react";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Empresas"
      subtitle="Organizações com múltiplos contatos, oportunidades e contratos"
      icon={Building}
      ctaLabel="Nova empresa"
      description="Visão consolidada por empresa: receita total, contratos ativos, contatos-chave e saúde do relacionamento."
      kpis={[
        { label: "Empresas ativas", value: "342" },
        { label: "Receita acumulada", value: "R$ 4.2M" },
        { label: "Em risco", value: "18", delta: "—" },
        { label: "Novas (trim.)", value: "27", delta: "+9%" },
      ]}
      items={[
        { id: "1", title: "Acme Corp", subtitle: "SaaS · 250-500 funcionários · São Paulo", meta: "R$ 487k LTV", status: "Estratégico", tone: "success" },
        { id: "2", title: "TechFlow Sistemas", subtitle: "Tecnologia · 50-100 · Campinas", meta: "R$ 312k LTV", status: "Premium", tone: "success" },
        { id: "3", title: "Mendes Advogados", subtitle: "Jurídico · 25-50 · Belo Horizonte", meta: "R$ 124k LTV", status: "Em expansão", tone: "info" },
        { id: "4", title: "Vector Studios", subtitle: "Agência · 10-25 · Curitiba", meta: "R$ 78k LTV", status: "Em risco", tone: "warn" },
      ]}
    />
  ),
});
