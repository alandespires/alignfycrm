import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import { mockSearch } from "@/lib/prospecting/mock-provider";
import { scoreLead } from "@/lib/prospecting/score";
import { detectDuplicate, type ExistingLead } from "@/lib/prospecting/dedup";
import { normalizePhone, normalizeEmail, extractDomain } from "@/lib/prospecting/normalize";
import type { ProspectingFilters, ProspectingResultRow, ProspectingSearch } from "@/lib/prospecting/types";

const T = {
  searches: "prospecting_searches",
  results: "prospecting_results",
  profiles: "prospecting_profiles",
  lists: "prospecting_lists",
  imports: "prospecting_import_logs",
} as const;

/** Última busca por tenant. */
export function useProspectingSearches(limit = 20) {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["prospecting-searches", tenantId, limit],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProspectingSearch[]> => {
      const { data, error } = await (supabase as any)
        .from(T.searches).select("*").eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as ProspectingSearch[];
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
        .from(T.results).select("*").eq("tenant_id", tenantId!).eq("search_id", searchId!)
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
        .from(T.profiles).select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
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
        .from(T.lists).select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Executa uma busca client-side com o provedor mock, calcula score,
 * detecta duplicatas e persiste em prospecting_searches/prospecting_results.
 */
export function useRunProspectingSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome?: string; filtros: ProspectingFilters; profileId?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();

      // 1. Cria a busca
      const { data: search, error: e1 } = await (supabase as any)
        .from(T.searches)
        .insert({
          tenant_id, created_by: u.user.id,
          profile_id: input.profileId ?? null,
          nome: input.nome ?? null,
          filtros: input.filtros as any,
          provedor: "mock",
          status: "buscando",
          etapa_atual: "Buscando fontes",
          is_demo: true,
        })
        .select().single();
      if (e1) throw e1;

      // 2. Busca no provedor (mock)
      await new Promise((r) => setTimeout(r, 400));
      const raw = mockSearch(input.filtros);

      // 3. Carrega leads existentes para dedup
      const { data: existing } = await supabase
        .from("leads").select("id, nome, email, whatsapp, empresa").eq("tenant_id", tenant_id);
      const existingList: ExistingLead[] = (existing ?? []) as any;

      // 4. Scoring + dedup + montagem dos registros
      const rows = raw.map((r) => {
        const s = scoreLead(r, input.filtros);
        const dup = detectDuplicate(r, existingList);
        const excluir = input.filtros.excluir_cadastrados && dup.level === "confirmada";
        const scoreMin = input.filtros.score_min ?? 0;
        const abaixoScore = s.score < scoreMin;
        return {
          tenant_id,
          search_id: search.id,
          nome: r.nome,
          razao_social: r.razao_social ?? null,
          nome_fantasia: r.nome_fantasia ?? null,
          cnpj: r.cnpj ?? null,
          segmento: r.segmento ?? null,
          descricao: r.descricao ?? null,
          endereco: r.endereco ?? null,
          bairro: r.bairro ?? null,
          cidade: r.cidade ?? null,
          uf: r.uf ?? null,
          telefone: r.telefone ?? null,
          telefone_norm: normalizePhone(r.telefone),
          whatsapp: r.whatsapp ?? null,
          whatsapp_norm: normalizePhone(r.whatsapp),
          email: normalizeEmail(r.email),
          site: r.site ?? null,
          site_domain: extractDomain(r.site),
          instagram: r.instagram ?? null,
          facebook: r.facebook ?? null,
          linkedin: r.linkedin ?? null,
          horario_funcionamento: r.horario_funcionamento ?? null,
          rating: r.rating ?? null,
          reviews_count: r.reviews_count ?? null,
          score: s.score,
          tier: s.tier,
          confiabilidade: s.confiabilidade,
          motivos_positivos: s.motivos_positivos,
          motivos_atencao: s.motivos_atencao,
          oportunidade: s.oportunidade,
          status: excluir || abaixoScore ? "ignorado" : "novo",
          favorito: false,
          source: r.source ?? "mock",
          source_ref: r.source_ref ?? null,
          raw: { ...(r.raw ?? {}), dedup: dup } as any,
          is_demo: true,
        };
      });

      // 5. Insere resultados
      if (rows.length) {
        const { error: e2 } = await (supabase as any).from(T.results).insert(rows);
        if (e2) throw e2;
      }

      // 6. Atualiza busca
      const qualificados = rows.filter((r) => r.status === "novo").length;
      const descartados = rows.length - qualificados;
      await (supabase as any).from(T.searches).update({
        status: "pronto", etapa_atual: null,
        encontrados: rows.length, qualificados, descartados,
      }).eq("id", search.id);

      return { searchId: search.id as string, encontrados: rows.length, qualificados };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["prospecting-searches"] });
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

/** Importa resultados selecionados como leads. */
export function useImportResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ resultIds, origem }: { resultIds: string[]; origem?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();

      const { data: results, error: e0 } = await (supabase as any)
        .from(T.results).select("*").in("id", resultIds);
      if (e0) throw e0;

      const leadsToInsert = (results ?? []).map((r: any) => ({
        tenant_id, created_by: u.user!.id, owner_id: u.user!.id,
        nome: r.nome, empresa: r.razao_social ?? r.nome_fantasia ?? r.nome,
        email: r.email, whatsapp: r.whatsapp ?? r.telefone,
        origem: origem ?? "Prospecção B2B",
        interesse: r.segmento,
        observacoes: [r.oportunidade, r.descricao].filter(Boolean).join("\n\n"),
        status: "novo" as const,
        tags: [r.tier, "prospeccao"],
      }));

      if (!leadsToInsert.length) return { imported: 0 };

      const { data: inserted, error: e1 } = await supabase
        .from("leads").insert(leadsToInsert as any).select("id");
      if (e1) throw e1;

      // Marca resultados como importados
      const importedAt = new Date().toISOString();
      await Promise.all(
        (results ?? []).map((r: any, i: number) =>
          (supabase as any).from(T.results).update({
            status: "importado", imported_lead_id: (inserted ?? [])[i]?.id ?? null, imported_at: importedAt,
          }).eq("id", r.id),
        ),
      );

      // Log
      await (supabase as any).from(T.imports).insert({
        tenant_id, user_id: u.user.id, quantidade: inserted?.length ?? 0,
        origem: origem ?? "Prospecção B2B",
      });

      return { imported: inserted?.length ?? 0 };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["prospecting-results"] });
      qc.invalidateQueries({ queryKey: ["prospecting-searches"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${r.imported} leads importados`);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao importar"),
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; filtros: ProspectingFilters; descricao?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      const { error } = await (supabase as any).from(T.profiles).insert({
        tenant_id, created_by: u.user.id, nome: input.nome, filtros: input.filtros as any,
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
