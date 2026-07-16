import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { MockProspectingProvider } from "../_shared/prospecting/providers/mock-provider.ts";
import { GooglePlacesProvider } from "../_shared/prospecting/providers/google-places-provider.ts";
import { batchFingerprint, deduplicate, type ExistingLead } from "../_shared/prospecting/dedup.ts";
import { extractDomain, normalizeEmail, normalizePhone } from "../_shared/prospecting/normalize.ts";
import { scoreLead } from "../_shared/prospecting/score.ts";
import type { ProspectingFilters } from "../_shared/prospecting/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function matchesProviderFilters(
  lead: {
    site?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    rating?: number | null;
    reviews_count?: number | null;
  },
  filters: ProspectingFilters,
) {
  if (filters.sem_site && lead.site) return false;
  if (filters.possui_site && !lead.site) return false;
  if (filters.sem_whatsapp && lead.whatsapp) return false;
  if (filters.possui_whatsapp && !lead.whatsapp) return false;
  if (filters.possui_email && !lead.email) return false;
  if (typeof filters.nota_min === "number" && (lead.rating ?? 0) < filters.nota_min) return false;
  if (typeof filters.reviews_min === "number" && (lead.reviews_count ?? 0) < filters.reviews_min)
    return false;
  if (filters.baixa_presenca_digital && Boolean(lead.site && lead.whatsapp && lead.email))
    return false;
  return true;
}

function sanitizeFilters(value: unknown, maxQuantity: number): ProspectingFilters {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const text = (key: string, max: number) =>
    typeof input[key] === "string" ? String(input[key]).trim().slice(0, max) : undefined;
  const number = (key: string, min: number, max: number) =>
    typeof input[key] === "number" && Number.isFinite(input[key])
      ? Math.min(max, Math.max(min, input[key]))
      : undefined;
  return {
    tipo_lead: ["empresa", "profissional", "ambos"].includes(String(input.tipo_lead))
      ? (input.tipo_lead as ProspectingFilters["tipo_lead"])
      : "empresa",
    nicho: text("nicho", 120),
    palavra_chave: text("palavra_chave", 120),
    cidade: text("cidade", 120),
    uf: text("uf", 2)?.toUpperCase(),
    quantidade: Math.round(number("quantidade", 1, maxQuantity) ?? Math.min(30, maxQuantity)),
    nota_min: number("nota_min", 0, 5),
    reviews_min: Math.round(number("reviews_min", 0, 1_000_000) ?? 0),
    score_min: Math.round(number("score_min", 0, 100) ?? 0),
    excluir_cadastrados: input.excluir_cadastrados !== false,
    excluir_pesquisas_anteriores: input.excluir_pesquisas_anteriores === true,
    excluir_invalidos: input.excluir_invalidos === true,
    sem_site: input.sem_site === true,
    sem_whatsapp: input.sem_whatsapp === true,
    possui_site: input.possui_site === true,
    possui_whatsapp: input.possui_whatsapp === true,
    possui_email: input.possui_email === true,
    baixa_presenca_digital: input.baixa_presenca_digital === true,
    recem_abertas: input.recem_abertas === true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);
  let searchId: string | null = null;

  try {
    const { data: auth } = await userClient.auth.getUser();
    if (!auth.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : "";
    if (!tenantId) return json({ error: "tenant_id_required" }, 400);

    const { data: canEdit, error: permissionError } = await admin.rpc(
      "has_prospecting_permission",
      {
        _user_id: auth.user.id,
        _tenant_id: tenantId,
        _permission: "search",
      },
    );
    if (permissionError) throw permissionError;
    if (!canEdit) return json({ error: "forbidden" }, 403);

    const { data: rules } = await admin
      .from("prospecting_score_rules")
      .select("pesos, quantidade_max")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const filters = sanitizeFilters(body.filtros, rules?.quantidade_max ?? 100);
    if (!filters.nicho && !filters.palavra_chave)
      return json({ error: "Informe um nicho ou palavra-chave" }, 400);

    const { data: source } = await admin
      .from("prospecting_sources")
      .select("provider, configurado, ativo, limite_mensal, usado_mes")
      .eq("tenant_id", tenantId)
      .eq("provider", "google_places")
      .maybeSingle();
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const environment = (Deno.env.get("ENVIRONMENT") ?? "production").toLowerCase();
    const googleEnabled = Boolean(source?.ativo && source?.configurado);
    if (
      googleEnabled &&
      (source?.limite_mensal ?? 0) > 0 &&
      (source?.usado_mes ?? 0) >= (source?.limite_mensal ?? 0)
    ) {
      return json({ error: "Limite mensal do provider atingido" }, 429);
    }
    if (environment === "production" && (!googleEnabled || !googleKey)) {
      return json(
        {
          error: "provider_not_configured",
          message: "O Google Places ainda não está configurado para esta empresa.",
        },
        503,
      );
    }
    const provider =
      googleEnabled && googleKey
        ? new GooglePlacesProvider(googleKey)
        : new MockProspectingProvider();
    const requestedSearchId =
      typeof body.search_id === "string" && /^[0-9a-f-]{36}$/i.test(body.search_id)
        ? body.search_id
        : crypto.randomUUID();
    const { data: search, error: searchError } = await admin
      .from("prospecting_searches")
      .insert({
        id: requestedSearchId,
        tenant_id: tenantId,
        created_by: auth.user.id,
        profile_id: typeof body.profile_id === "string" ? body.profile_id : null,
        nome:
          typeof body.nome === "string"
            ? body.nome.trim().slice(0, 160)
            : (filters.nicho ?? filters.palavra_chave),
        filtros: filters,
        provedor: provider.name,
        status: "buscando",
        etapa_atual: "Buscando empresas",
        is_demo: provider.isDemo,
      })
      .select("id")
      .single();
    if (searchError) throw searchError;
    searchId = search.id;

    const updateStage = async (status: string, stage: string) => {
      const { error } = await admin
        .from("prospecting_searches")
        .update({ status, etapa_atual: stage })
        .eq("tenant_id", tenantId)
        .eq("id", searchId!);
      if (error) throw error;
    };

    const raw = (await provider.search(filters))
      .filter((lead) => matchesProviderFilters(lead, filters))
      .slice(0, filters.quantidade ?? 30);
    if (!provider.isDemo) {
      await admin
        .from("prospecting_sources")
        .update({ usado_mes: (source?.usado_mes ?? 0) + 1 })
        .eq("tenant_id", tenantId)
        .eq("provider", provider.name);
    }
    await updateStage("validando", "Validando formatos e fontes");

    const priorStatuses = filters.excluir_pesquisas_anteriores
      ? ["novo", "favorito", "ignorado", "invalido", "importado"]
      : ["invalido"];
    const [
      { data: leads, error: leadsError },
      { data: identifiers, error: identifiersError },
      { data: priorResults, error: priorError },
    ] = await Promise.all([
      admin.from("leads").select("id, nome, empresa, email, whatsapp").eq("tenant_id", tenantId),
      admin.from("lead_identifiers").select("lead_id, kind, value").eq("tenant_id", tenantId),
      filters.excluir_pesquisas_anteriores || filters.excluir_invalidos
        ? admin
            .from("prospecting_results")
            .select("telefone_norm, whatsapp_norm, email, site_domain")
            .eq("tenant_id", tenantId)
            .in("status", priorStatuses)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (leadsError) throw leadsError;
    if (identifiersError) throw identifiersError;
    if (priorError) throw priorError;

    const existing: ExistingLead[] = (leads ?? []).map((lead) => ({
      ...lead,
      identifiers: (identifiers ?? []).filter((identifier) => identifier.lead_id === lead.id),
    }));

    await updateStage("deduplicando", "Eliminando duplicados");
    const seen = new Map<string, number>();
    const priorFingerprints = new Set(
      (priorResults ?? []).flatMap((result) =>
        [
          result.telefone_norm ? `telefone:${result.telefone_norm}` : null,
          result.whatsapp_norm ? `whatsapp:${result.whatsapp_norm}` : null,
          result.email ? `email:${result.email}` : null,
          result.site_domain ? `dominio:${result.site_domain}` : null,
        ].filter((value): value is string => !!value),
      ),
    );
    const rows = raw.map((lead) => {
      const duplicate = deduplicate(lead, existing);
      const batchKeys = batchFingerprint(lead);
      const batchDuplicate = batchKeys.some((key) => seen.has(key));
      const previousDuplicate = batchKeys.some((key) => priorFingerprints.has(key));
      for (const key of batchKeys) seen.set(key, (seen.get(key) ?? 0) + 1);
      const effectiveDuplicate =
        batchDuplicate || previousDuplicate
          ? {
              level: "confirmada" as const,
              confidence: 0.99,
              matchedLeadId: null,
              reasons: [
                batchDuplicate
                  ? "duplicado na resposta do provider"
                  : "encontrado em pesquisa anterior",
              ],
            }
          : duplicate;
      const scored = scoreLead(lead, filters, rules?.pesos ?? undefined);
      const excluded =
        (filters.excluir_cadastrados && effectiveDuplicate.level === "confirmada") ||
        scored.score < (filters.score_min ?? 0);
      return {
        tenant_id: tenantId,
        search_id: searchId,
        nome: lead.nome,
        razao_social: lead.razao_social ?? null,
        nome_fantasia: lead.nome_fantasia ?? null,
        cnpj: lead.cnpj ?? null,
        segmento: lead.segmento ?? null,
        descricao: lead.descricao ?? null,
        endereco: lead.endereco ?? null,
        bairro: lead.bairro ?? null,
        cidade: lead.cidade ?? null,
        uf: lead.uf ?? null,
        telefone: lead.telefone ?? null,
        telefone_norm: normalizePhone(lead.telefone),
        whatsapp: lead.whatsapp ?? null,
        whatsapp_norm: normalizePhone(lead.whatsapp),
        email: normalizeEmail(lead.email),
        site: lead.site ?? null,
        site_domain: extractDomain(lead.site),
        instagram: lead.instagram ?? null,
        facebook: lead.facebook ?? null,
        linkedin: lead.linkedin ?? null,
        horario_funcionamento: lead.horario_funcionamento ?? null,
        rating: lead.rating ?? null,
        reviews_count: lead.reviews_count ?? null,
        score: scored.score,
        tier: scored.tier,
        confiabilidade: scored.reliability,
        motivos_positivos: scored.positives,
        motivos_atencao: scored.attention,
        oportunidade: scored.opportunity,
        score_rule_version: 1,
        score_breakdown: scored.breakdown,
        dedup_level: effectiveDuplicate.level,
        dedup_confidence: effectiveDuplicate.confidence,
        matched_lead_id: effectiveDuplicate.matchedLeadId,
        validation_status: "formato_valido",
        status: excluded ? "ignorado" : "novo",
        source: lead.source,
        source_ref: lead.source_ref ?? null,
        raw: { dedup_reasons: effectiveDuplicate.reasons },
        is_demo: lead.is_demo,
      };
    });

    await updateStage("calculando", "Calculando potencial de conversão");
    let inserted: Array<{ id: string; telefone_norm: string | null; email: string | null }> = [];
    if (rows.length) {
      const { data, error } = await admin
        .from("prospecting_results")
        .insert(rows)
        .select("id, telefone_norm, email");
      if (error) throw error;
      inserted = data ?? [];
    }

    const validationLogs = inserted.flatMap((result) =>
      [
        result.telefone_norm
          ? {
              tenant_id: tenantId,
              result_id: result.id,
              provider: provider.name,
              validation_type: "telefone",
              status: "formato_valido",
              confidence: 0.5,
              reason: "Formato normalizado; existência não verificada",
              validated_by: auth.user.id,
            }
          : null,
        result.email
          ? {
              tenant_id: tenantId,
              result_id: result.id,
              provider: provider.name,
              validation_type: "email",
              status: "formato_valido",
              confidence: 0.5,
              reason: "Sintaxe válida; caixa postal não verificada",
              validated_by: auth.user.id,
            }
          : null,
      ].filter(Boolean),
    );
    if (validationLogs.length) {
      const { error } = await admin.from("prospecting_validation_logs").insert(validationLogs);
      if (error) throw error;
    }

    const qualified = rows.filter((row) => row.status === "novo").length;
    const { error: finishError } = await admin
      .from("prospecting_searches")
      .update({
        status: "pronto",
        etapa_atual: null,
        encontrados: rows.length,
        qualificados: qualified,
        descartados: rows.length - qualified,
      })
      .eq("tenant_id", tenantId)
      .eq("id", searchId);
    if (finishError) throw finishError;

    return json({
      searchId,
      encontrados: rows.length,
      qualificados: qualified,
      is_demo: provider.isDemo,
    });
  } catch (error) {
    console.error("prospecting-search error", error);
    if (searchId) {
      await admin
        .from("prospecting_searches")
        .update({ status: "erro", etapa_atual: null, erro: "Não foi possível concluir a busca" })
        .eq("id", searchId);
    }
    if (error instanceof Error && error.message.startsWith("google_places_")) {
      return json(
        {
          error: "provider_unavailable",
          message: "O Google Places não conseguiu concluir a busca. Tente novamente em instantes.",
        },
        502,
      );
    }
    return json({ error: "internal_error" }, 500);
  }
});
