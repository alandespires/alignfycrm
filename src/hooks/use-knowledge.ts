import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";
import { createUniqueSlug } from "@/lib/slug";

export type Article = {
  id: string; tenant_id: string; titulo: string; conteudo: string | null;
  slug: string;
  categoria: string | null; department_id: string | null;
  prioridade: string | null; status: string | null;
  views_count: number; anexos: any;
  created_by: string | null; created_at: string; updated_at: string;
};
export type ArticleVersion = {
  id: string; article_id: string; versao: number;
  titulo: string | null; conteudo: string | null;
  created_by: string | null; created_at: string;
};

const t = () => getActiveTenantId();

export function useArticles() {
  const tid = t();
  return useQuery({
    queryKey: ["kb-articles", tid], enabled: !!tid,
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_articles" as any)
        .select("*").eq("tenant_id", tid!).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Article[];
    },
  });
}
export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Article> & { titulo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const tenant_id = requireTenantId();
      if (input.id) {
        // snapshot current version
        const { data: current } = await supabase.from("knowledge_articles" as any).select("titulo,conteudo").eq("id", input.id).single();
        const { count } = await supabase.from("knowledge_versions" as any).select("*", { count: "exact", head: true }).eq("article_id", input.id);
        if (current) {
          await supabase.from("knowledge_versions" as any).insert({
            tenant_id, article_id: input.id, versao: (count ?? 0) + 1,
            titulo: (current as any).titulo, conteudo: (current as any).conteudo, created_by: u.user?.id,
          });
        }
        const { error } = await supabase.from("knowledge_articles" as any).update(input as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("knowledge_articles" as any).insert({
          ...(input as any),
          slug: createUniqueSlug(input.titulo),
          tenant_id,
          created_by: u.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kb-articles"] }); toast.success("Artigo salvo"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_articles" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kb-articles"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}
export function useFavorites() {
  return useQuery({
    queryKey: ["kb-favorites"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase.from("knowledge_favorites" as any)
        .select("article_id").eq("user_id", u.user.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.article_id) as string[];
    },
  });
}
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, on }: { articleId: string; on: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      if (on) {
        await supabase.from("knowledge_favorites" as any).insert({ tenant_id, user_id: u.user.id, article_id: articleId });
      } else {
        await supabase.from("knowledge_favorites" as any).delete().eq("user_id", u.user.id).eq("article_id", articleId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-favorites"] }),
  });
}
export function useIncrementView() {
  return useMutation({
    mutationFn: async (articleId: string) => {
      await supabase.rpc("increment_article_view" as any, { _article_id: articleId });
    },
  });
}
export function useArticleVersions(articleId: string | null) {
  return useQuery({
    queryKey: ["kb-versions", articleId], enabled: !!articleId,
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_versions" as any)
        .select("*").eq("article_id", articleId!).order("versao", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ArticleVersion[];
    },
  });
}
