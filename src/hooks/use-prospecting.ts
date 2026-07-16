import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import type {
  ProspectingFilters,
  ProspectingResultRow,
  ProspectingSearch,
} from "@/lib/prospecting/types";

const T = {
  searches: "prospecting_searches",
  results: "prospecting_results",
  profiles: "prospecting_profiles",
  lists: "prospecting_lists",
  imports: "prospecting_import_logs",
} as const;

function getEdgeFunctionError(error: unknown, action: "buscar" | "importar") {
  if (error instanceof FunctionsFetchError) {
    return new Error(
      `Não foi possível acessar o serviço de prospecção para ${action}. Verifique se a Edge Function foi publicada no Supabase e tente novamente.`,
    );
  }

  if (error instanceof FunctionsRelayError) {
    return new Error("O Supabase não conseguiu encaminhar a solicitação de prospecção.");
  }

  if (error instanceof FunctionsHttpError) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    if (status === 401) return new Error("Sua sessão expirou. Entre novamente para continuar.");
    if (status === 403) return new Error("Você não tem permissão para executar esta ação.");
    if (status === 404) return new Error("O serviço de prospecção ainda não foi publicado.");
    if (status === 429) return new Error("O limite mensal do provedor de prospecção foi atingido.");
    if (status === 502)
      return new Error("O Google Places está temporariamente indisponível. Tente novamente.");
    if (status === 503)
      return new Error("O Google Places ainda não está configurado para esta empresa.");
    return new Error(`O serviço de prospecção não conseguiu ${action} agora.`);
  }

  return error instanceof Error ? error : new Error("Erro inesperado no serviço de prospecção.");
}

/** Última busca por tenant. */
export function useProspectingSearches(limit = 20) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-searches", tenantId, limit],
    enabled: !!tenantId,
    refetchInterval: (query) =>
      (query.state.data as ProspectingSearch[] | undefined)?.some((search) =>
        ["pendente", "buscando", "validando", "deduplicando", "analisando", "calculando"].includes(
          search.status,
        ),
      )
        ? 1500
        : false,
    queryFn: async (): Promise<ProspectingSearch[]> => {
      const { data, error } = await (supabase as any)
        .from(T.searches)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ProspectingSearch[];
    },
  });
}

export function useProspectingKpis(days = 30) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-kpis", tenantId, days],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_prospecting_kpis", {
        _tenant_id: tenantId,
        _days: days,
      });
      if (error) throw error;
      return (data?.[0] ?? {
        encontrados: 0,
        qualificados: 0,
        importados: 0,
        descartados: 0,
        pesquisas: 0,
        taxa_qualificacao: 0,
      }) as {
        encontrados: number;
        qualificados: number;
        importados: number;
        descartados: number;
        pesquisas: number;
        taxa_qualificacao: number;
      };
    },
  });
}

export function useProspectingResults(searchId: string | null) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-results", tenantId, searchId],
    enabled: !!tenantId && !!searchId,
    queryFn: async (): Promise<ProspectingResultRow[]> => {
      const { data, error } = await (supabase as any)
        .from(T.results)
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("search_id", searchId!)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProspectingResultRow[];
    },
  });
}

export function useProspectingProfiles() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-profiles", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(T.profiles)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProspectingLists() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-lists", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(T.lists)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Executa a busca segura no backend e devolve o id persistido. */
export function useRunProspectingSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome?: string;
      filtros: ProspectingFilters;
      profileId?: string;
      searchId?: string;
    }) => {
      const tenant_id = requireTenantId();
      const { data, error } = await supabase.functions.invoke("prospecting-search", {
        body: {
          tenant_id,
          nome: input.nome,
          filtros: input.filtros,
          profile_id: input.profileId,
          search_id: input.searchId,
        },
      });
      if (error) throw getEdgeFunctionError(error, "buscar");
      if (data?.error) throw new Error(data.error);
      return data as {
        searchId: string;
        encontrados: number;
        qualificados: number;
        is_demo: boolean;
      };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["prospecting-searches"] });
      qc.invalidateQueries({ queryKey: ["prospecting-kpis"] });
      qc.invalidateQueries({ queryKey: ["prospecting-results"] });
      toast.success(`Busca concluída: ${r.qualificados} qualificados de ${r.encontrados}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na busca"),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, favorito }: { id: string; favorito: boolean }) => {
      const { error } = await (supabase as any).from(T.results).update({ favorito }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospecting-results"] }),
  });
}

export function useUpdateResultStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProspectingResultRow["status"] }) => {
      const { error } = await (supabase as any).from(T.results).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospecting-results"] }),
  });
}

export type ProspectingImportOptions = {
  duplicate_strategy?: "ignore" | "update";
  owner_id?: string;
  tags?: string[];
  observation?: string;
  score_min?: number;
  require_contact?: boolean;
  initial_stage?: "novo" | "contato_inicial" | "qualificacao" | "proposta" | "negociacao";
};

/** Importa resultados pela Edge Function transacional e idempotente. */
export function useImportResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resultIds,
      options,
      requestKey,
    }: {
      resultIds: string[];
      options?: ProspectingImportOptions;
      requestKey?: string;
    }) => {
      const tenant_id = requireTenantId();
      const { data, error } = await supabase.functions.invoke("prospecting-import", {
        body: {
          tenant_id,
          result_ids: Array.from(new Set(resultIds)),
          options,
          request_key: requestKey ?? crypto.randomUUID(),
        },
      });
      if (error) throw getEdgeFunctionError(error, "importar");
      if (data?.error) throw new Error(data.error);
      return data as {
        total: number;
        criados: number;
        atualizados: number;
        ignorados: number;
        falhos: number;
      };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["prospecting-results"] });
      qc.invalidateQueries({ queryKey: ["prospecting-searches"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["prospecting-kpis"] });
      toast.success(
        `${r.criados} criados, ${r.atualizados} atualizados e ${r.ignorados} ignorados`,
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao importar"),
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      filtros: ProspectingFilters;
      descricao?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { error } = await (supabase as any).from(T.profiles).insert({
        tenant_id,
        created_by: u.user.id,
        nome: input.nome,
        filtros: input.filtros as any,
        descricao: input.descricao ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      toast.success("Perfil salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar perfil"),
  });
}

export function useDeleteProspectingSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const tenantId = requireTenantId();
      const { error } = await (supabase as any)
        .from(T.searches)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-searches"] });
      qc.invalidateQueries({ queryKey: ["prospecting-kpis"] });
      toast.success("Pesquisa excluída");
    },
    onError: (error: any) => toast.error(error.message ?? "Erro ao excluir pesquisa"),
  });
}

export function useDeleteProspectingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const tenantId = requireTenantId();
      const { error } = await (supabase as any)
        .from(T.profiles)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospecting-profiles"] }),
  });
}

export function useCreateProspectingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Não autenticado");
      const tenantId = requireTenantId();
      const { data, error } = await (supabase as any)
        .from(T.lists)
        .insert({
          tenant_id: tenantId,
          created_by: auth.user.id,
          nome: input.nome,
          descricao: input.descricao ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-lists"] });
      toast.success("Lista criada");
    },
  });
}

export function useAddResultsToList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, resultIds }: { listId: string; resultIds: string[] }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Não autenticado");
      const tenantId = requireTenantId();
      const rows = Array.from(new Set(resultIds)).map((resultId) => ({
        tenant_id: tenantId,
        list_id: listId,
        result_id: resultId,
        added_by: auth.user!.id,
      }));
      const { error } = await (supabase as any)
        .from("prospecting_list_items")
        .upsert(rows, { onConflict: "list_id,result_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-lists"] });
      toast.success("Resultados adicionados à lista");
    },
  });
}

export function useProspectingSettings() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [sources, rules] = await Promise.all([
        (supabase as any).from("prospecting_sources").select("*").eq("tenant_id", tenantId),
        (supabase as any)
          .from("prospecting_score_rules")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
      ]);
      if (sources.error) throw sources.error;
      if (rules.error) throw rules.error;
      return { sources: sources.data ?? [], rules: rules.data ?? null };
    },
  });
}

export function useSaveProspectingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      source: {
        provider: string;
        ativo: boolean;
        configurado: boolean;
        limite_mensal: number;
      };
      rules: {
        score_minimo: number;
        quantidade_max: number;
        retencao_dias: number;
        pesos?: Record<string, number>;
      };
    }) => {
      const tenantId = requireTenantId();
      const [source, rules] = await Promise.all([
        (supabase as any)
          .from("prospecting_sources")
          .upsert({ tenant_id: tenantId, ...input.source }, { onConflict: "tenant_id,provider" }),
        (supabase as any)
          .from("prospecting_score_rules")
          .upsert({ tenant_id: tenantId, ...input.rules }, { onConflict: "tenant_id" }),
      ]);
      if (source.error) throw source.error;
      if (rules.error) throw rules.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospecting-settings"] });
      toast.success("Configurações salvas");
    },
    onError: (error: any) => toast.error(error.message ?? "Sem permissão para salvar"),
  });
}
