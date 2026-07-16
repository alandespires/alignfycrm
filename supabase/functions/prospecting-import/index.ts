import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: auth } = await userClient.auth.getUser();
    if (!auth.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : "";
    const resultIds = Array.isArray(body.result_ids)
      ? [...new Set(body.result_ids.filter((id: unknown) => typeof id === "string"))]
      : [];
    if (!tenantId || !resultIds.length || resultIds.length > 500)
      return json({ error: "invalid_request" }, 400);

    const { data: canEdit, error: permissionError } = await admin.rpc(
      "has_prospecting_permission",
      {
        _user_id: auth.user.id,
        _tenant_id: tenantId,
        _permission: "import",
      },
    );
    if (permissionError) throw permissionError;
    if (!canEdit) return json({ error: "forbidden" }, 403);

    const environment = Deno.env.get("ENVIRONMENT") ?? "production";
    const allowDemo =
      environment !== "production" && Deno.env.get("PROSPECTING_ALLOW_DEMO_IMPORT") === "true";
    const requestKey =
      req.headers.get("Idempotency-Key") ??
      (typeof body.request_key === "string" ? body.request_key.slice(0, 200) : crypto.randomUUID());
    const options = {
      duplicate_strategy: body.options?.duplicate_strategy === "update" ? "update" : "ignore",
      owner_id: typeof body.options?.owner_id === "string" ? body.options.owner_id : auth.user.id,
      tags: Array.isArray(body.options?.tags)
        ? body.options.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 20)
        : [],
      observation:
        typeof body.options?.observation === "string"
          ? body.options.observation.slice(0, 2000)
          : "",
      score_min:
        typeof body.options?.score_min === "number"
          ? Math.min(100, Math.max(0, Math.round(body.options.score_min)))
          : 0,
      require_contact: body.options?.require_contact === true,
      initial_stage: ["novo", "contato_inicial", "qualificacao", "proposta", "negociacao"].includes(
        body.options?.initial_stage,
      )
        ? body.options.initial_stage
        : "novo",
    };

    const { data, error } = await admin.rpc("import_prospecting_results_internal", {
      _tenant_id: tenantId,
      _user_id: auth.user.id,
      _result_ids: resultIds,
      _options: options,
      _request_key: requestKey,
      _allow_demo: allowDemo,
    });
    if (error) {
      if (error.message?.includes("demo_import_blocked"))
        return json(
          { error: "Dados de demonstração não podem ser importados neste ambiente" },
          422,
        );
      if (error.message?.includes("forbidden")) return json({ error: "forbidden" }, 403);
      throw error;
    }
    return json({ ...data, request_key: requestKey });
  } catch (error) {
    console.error("prospecting-import error", error);
    return json({ error: "internal_error" }, 500);
  }
});
