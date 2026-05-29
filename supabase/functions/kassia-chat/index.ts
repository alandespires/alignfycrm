// KassIA Chat: assistente conversacional com contexto rico do CRM e tool-calling.
// Tools disponíveis: gerar_relatorio, criar_tarefa, atualizar_lead_pipeline.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Filters = {
  periodo?: { inicio?: string; fim?: string };
  estagio?: string | null;
  tenant_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: SERVICE_KEY },
    });
    if (!userRes.ok) return jsonResp({ error: "unauthorized" }, 401);
    const user = await userRes.json();
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const { messages = [], filters = {} as Filters, tenant_id } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResp({ error: "messages required" }, 400);
    }
    if (!tenant_id || typeof tenant_id !== "string") {
      return jsonResp({ error: "tenant_id required" }, 400);
    }

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

    // CRITICAL: Verify the authenticated user is a member of the requested tenant
    // before using the service role key (which bypasses RLS).
    const memberRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenant_users?user_id=eq.${userId}&tenant_id=eq.${tenant_id}&select=tenant_id&limit=1`,
      { headers },
    );
    if (!memberRes.ok) return jsonResp({ error: "membership_check_failed" }, 500);
    const memberRows = await memberRes.json();
    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return jsonResp({ error: "forbidden" }, 403);
    }

    const tenantFilter = `&tenant_id=eq.${tenant_id}`;
    const periodoIni = filters?.periodo?.inicio;
    const periodoFim = filters?.periodo?.fim;
    const estagio = filters?.estagio;

    // Filtros de data
    const dateFilter = (col: string) => {
      const parts = [];
      if (periodoIni) parts.push(`${col}=gte.${periodoIni}`);
      if (periodoFim) parts.push(`${col}=lte.${periodoFim}`);
      return parts.length ? `&${parts.join("&")}` : "";
    };
    const stageFilter = estagio ? `&status=eq.${estagio}` : "";

    // Coleta contexto amplo
    const [leadsR, tasksR, clientsR, entriesR, expensesR, subsR, commR, dealsR] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/leads?or=(owner_id.eq.${userId},created_by.eq.${userId})${tenantFilter}${stageFilter}${dateFilter("created_at")}&order=updated_at.desc&limit=80`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tasks?status=neq.concluida&assignee_id=eq.${userId}${tenantFilter}&order=prazo.asc.nullslast&limit=40`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/clients?${tenantFilter.slice(1)}&order=updated_at.desc&limit=40`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/financial_entries?${tenantFilter.slice(1)}${dateFilter("created_at")}&order=created_at.desc&limit=120`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/financial_expenses?${tenantFilter.slice(1)}${dateFilter("created_at")}&order=created_at.desc&limit=80`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/financial_subscriptions?${tenantFilter.slice(1)}&order=created_at.desc&limit=80`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/financial_commissions?${tenantFilter.slice(1)}&order=created_at.desc&limit=80`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/deals?${tenantFilter.slice(1)}${dateFilter("created_at")}&order=created_at.desc&limit=80`, { headers }),
    ]);

    const [leads, tasks, clients, entries, expenses, subs, commissions, deals] = await Promise.all([
      leadsR.json(), tasksR.json(), clientsR.json(), entriesR.json(),
      expensesR.json(), subsR.json(), commR.json(), dealsR.json(),
    ]);

    const now = new Date();
    const sum = (arr: any[], key: string) => arr.reduce((a, b) => a + Number(b[key] ?? 0), 0);
    const overdueEntries = (entries ?? []).filter((e: any) => e.status === "atrasado" || (e.vencimento && new Date(e.vencimento) < now && e.status === "pendente"));
    const activeSubs = (subs ?? []).filter((s: any) => s.status === "ativo");
    const mrr = sum(activeSubs, "valor_mensal");
    const funnelByStage = agrupar(leads ?? [], "status");
    const dealsByStage = agrupar(deals ?? [], "stage");

    const ctx = {
      data_atual: now.toISOString().slice(0, 10),
      filtros_aplicados: { inicio: periodoIni ?? null, fim: periodoFim ?? null, estagio: estagio ?? null },
      leads: {
        total: leads?.length ?? 0,
        quentes: (leads ?? []).filter((l: any) => (l.ai_score ?? 0) >= 70 && !["fechado", "perdido"].includes(l.status)).length,
        funil: funnelByStage,
        amostra: (leads ?? []).slice(0, 12).map((l: any) => ({ nome: l.nome, empresa: l.empresa, status: l.status, score: l.ai_score, valor: l.valor_estimado })),
      },
      pipeline: {
        deals_total: deals?.length ?? 0,
        valor_total: sum(deals ?? [], "valor"),
        por_stage: dealsByStage,
      },
      tarefas: {
        em_aberto: tasks?.length ?? 0,
        atrasadas: (tasks ?? []).filter((t: any) => t.prazo && new Date(t.prazo) < now).length,
        proximas: (tasks ?? []).slice(0, 5).map((t: any) => ({ titulo: t.titulo, prazo: t.prazo, prioridade: t.prioridade })),
      },
      clientes: { total: clients?.length ?? 0 },
      financeiro: {
        receita_recebida: sum((entries ?? []).filter((e: any) => e.status === "pago"), "valor_pago"),
        receita_prevista: sum(entries ?? [], "valor"),
        despesas: sum(expenses ?? [], "valor"),
        inadimplencia: sum(overdueEntries, "valor"),
        mrr,
        assinaturas_ativas: activeSubs.length,
        comissoes_pendentes: sum((commissions ?? []).filter((c: any) => c.status === "pendente"), "valor"),
      },
    };

    const systemPrompt = `Você é a KassIA, assistente de IA do KS CRM. Fala português do Brasil de forma direta, profissional e calorosa.

CAPACIDADES:
- Responder dúvidas sobre o CRM (leads, pipeline, clientes, tarefas, automação, financeiro).
- Gerar relatórios sob demanda usando os dados reais do contexto.
- Dar recomendações estratégicas.
- Usar TOOLS para executar ações: 'criar_lead', 'criar_tarefa', 'gerar_relatorio', 'mover_lead'. **CHAME A TOOL APROPRIADA SEMPRE** que o usuário expressar uma intenção de ação, mesmo que de forma informal.

EXEMPLOS DE COMANDOS CONVERSACIONAIS → TOOLS:
- "Crie um novo lead para João da Acme com valor estimado de R$ 25.000" → chame 'criar_lead' com { nome: "João", empresa: "Acme", valor_estimado: 25000 }
- "Adicione um lead Maria Silva da Globo, R$ 80k" → 'criar_lead'
- "Mova o lead Pedro para negociação" → 'mover_lead'
- "Crie tarefa de follow-up com cliente X amanhã" → 'criar_tarefa' com prazo_dias: 1
- "Gere relatório de vendas do último trimestre" → 'gerar_relatorio' com tipo: "faturamento"
- "Qual o status dos leads na etapa de Proposta?" → responda em texto usando o contexto (NÃO use tool)
- "Quantos leads quentes tenho?" → responda em texto

REGRAS:
- Quando chamar uma tool, NÃO descreva a ação em texto — apenas chame a tool. O sistema mostrará confirmação ao usuário.
- Extraia valores monetários inteligentemente: "R$ 25.000", "25k", "25 mil" → 25000.
- Markdown sempre (negrito, listas, tabelas) para respostas em texto.
- Valores em R$ com separador de milhar.
- Conciso. Não invente dados — se não souber, diga.
- Para relatórios em texto, estruture: título → KPIs principais → tabela → insights.

CONTEXTO ATUAL (dados reais do CRM, filtrados):
${JSON.stringify(ctx, null, 2)}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "criar_lead",
          description: "Cria um novo lead no CRM. Use quando o usuário pedir para adicionar/cadastrar/registrar um lead, contato ou prospect. Extraia o valor monetário inteligentemente (ex.: 'R$ 25.000', '25k', '25 mil' → 25000).",
          parameters: {
            type: "object",
            properties: {
              nome: { type: "string", description: "Nome completo do lead" },
              empresa: { type: "string", description: "Empresa do lead (opcional)" },
              valor_estimado: { type: "number", description: "Valor estimado da oportunidade em reais (apenas o número, sem R$)" },
              email: { type: "string" },
              whatsapp: { type: "string" },
              interesse: { type: "string", description: "Produto/serviço de interesse" },
              observacoes: { type: "string" },
              status: { type: "string", enum: ["novo", "contato_inicial", "qualificacao", "proposta", "negociacao"] },
            },
            required: ["nome"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "criar_tarefa",
          description: "Cria uma tarefa/follow-up no CRM. Use quando o usuário pedir agendamento, follow-up ou ação a executar.",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Título curto da tarefa" },
              descricao: { type: "string" },
              prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
              prazo_dias: { type: "number", description: "Dias a partir de hoje" },
              lead_nome: { type: "string", description: "Nome do lead para vincular (opcional)" },
            },
            required: ["titulo"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "mover_lead",
          description: "Move um lead para outro estágio do pipeline.",
          parameters: {
            type: "object",
            properties: {
              lead_nome: { type: "string" },
              novo_status: { type: "string", enum: ["novo", "contato_inicial", "qualificacao", "proposta", "negociacao", "fechado", "perdido"] },
            },
            required: ["lead_nome", "novo_status"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "gerar_relatorio",
          description: "Gera um relatório estruturado em PDF (faturamento, funil, inadimplência, pipeline, geral).",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["faturamento", "funil", "inadimplencia", "pipeline", "geral"] },
              titulo: { type: "string" },
              resumo: { type: "string", description: "Resumo executivo em 2-3 frases" },
              kpis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    valor: { type: "string" },
                  },
                  required: ["label", "valor"],
                  additionalProperties: false,
                },
              },
              tabela: {
                type: "object",
                properties: {
                  colunas: { type: "array", items: { type: "string" } },
                  linhas: { type: "array", items: { type: "array", items: { type: "string" } } },
                },
                required: ["colunas", "linhas"],
                additionalProperties: false,
              },
              insights: { type: "array", items: { type: "string" } },
            },
            required: ["tipo", "titulo", "resumo", "kpis", "insights"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
      }),
    });

    if (aiRes.status === 429) return jsonResp({ error: "rate_limited" }, 429);
    if (aiRes.status === 402) return jsonResp({ error: "credits_exhausted" }, 402);
    if (!aiRes.ok || !aiRes.body) return jsonResp({ error: "ai_failed", detail: await aiRes.text() }, 500);

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("kassia-chat error:", err);
    return jsonResp({ error: "internal_error" }, 500);
  }
});

function agrupar(arr: any[], key: string) {
  return arr.reduce((acc: Record<string, number>, item: any) => {
    const k = String(item[key] ?? "—");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
