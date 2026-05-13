import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/module-stub";
import { UserCircle } from "lucide-react";

export const Route = createFileRoute("/contatos")({
  head: () => ({ meta: [{ title: "Contatos — Launcher CRM" }] }),
  component: () => (
    <ModuleStub
      title="Contatos"
      subtitle="Pessoas vinculadas a empresas, leads e oportunidades"
      icon={UserCircle}
      ctaLabel="Novo contato"
      description="Mantenha uma base limpa de pessoas, com cargo, papel de decisão, canais preferidos e histórico de interações."
      kpis={[
        { label: "Contatos ativos", value: "1.284" },
        { label: "Decisores", value: "312" },
        { label: "Adicionados (mês)", value: "94", delta: "+18%" },
        { label: "Sem interação 30d", value: "147", delta: "—" },
      ]}
      items={[
        { id: "1", title: "Mariana Silva — Acme Corp", subtitle: "Diretora de Vendas · marie@acme.com", meta: "Decisor", status: "Hot", tone: "success" },
        { id: "2", title: "Rafael Mendes — TechFlow", subtitle: "CTO · rafael@techflow.io", meta: "Influenciador", status: "Ativo", tone: "info" },
        { id: "3", title: "Bianca Lopes — Vector Studios", subtitle: "Head de Operações · bianca@vector.co", meta: "Decisor", status: "Ativo", tone: "info" },
        { id: "4", title: "Pedro Castro — Loma Digital", subtitle: "Gerente Comercial · pedro@loma.com.br", meta: "Usuário final", status: "Frio", tone: "neutral" },
      ]}
    />
  ),
});
