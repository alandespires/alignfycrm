import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/contexts/tenant-context";
import { toast } from "sonner";

export type TaskAttachment = {
  id: string;
  tenant_id: string;
  task_id: string | null;
  project_id: string | null;
  user_id: string;
  nome: string;
  url: string;
  storage_path: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

export function useTaskAttachments(opts: { taskId?: string; projectId?: string }) {
  const key = opts.taskId ? ["task-attachments", "task", opts.taskId] : ["task-attachments", "project", opts.projectId];
  return useQuery({
    queryKey: key,
    enabled: !!(opts.taskId || opts.projectId),
    queryFn: async (): Promise<TaskAttachment[]> => {
      let q = (supabase as any).from("task_attachments").select("*").order("created_at", { ascending: false });
      if (opts.taskId) q = q.eq("task_id", opts.taskId);
      else if (opts.projectId) q = q.eq("project_id", opts.projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TaskAttachment[];
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; taskId?: string; projectId?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const tenant_id = requireTenantId();
      if (input.file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10MB");

      const ext = input.file.name.split(".").pop() ?? "bin";
      const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${tenant_id}/${input.taskId ?? input.projectId ?? "misc"}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("task-attachments")
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage.from("task-attachments").createSignedUrl(path, 60 * 60 * 24 * 7);

      const { data, error } = await (supabase as any).from("task_attachments").insert({
        tenant_id,
        task_id: input.taskId ?? null,
        project_id: input.projectId ?? null,
        user_id: u.user.id,
        nome: safeName,
        url: signed?.signedUrl ?? path,
        storage_path: path,
        tamanho_bytes: input.file.size,
        mime_type: input.file.type || null,
      }).select().single();
      if (error) throw error;
      return data as TaskAttachment;
    },
    onSuccess: (_d, vars) => {
      if (vars.taskId) qc.invalidateQueries({ queryKey: ["task-attachments", "task", vars.taskId] });
      if (vars.projectId) qc.invalidateQueries({ queryKey: ["task-attachments", "project", vars.projectId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha no upload"),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: TaskAttachment) => {
      if (att.storage_path) {
        await supabase.storage.from("task-attachments").remove([att.storage_path]).catch(() => {});
      }
      const { error } = await (supabase as any).from("task_attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: (_d, att) => {
      if (att.task_id) qc.invalidateQueries({ queryKey: ["task-attachments", "task", att.task_id] });
      if (att.project_id) qc.invalidateQueries({ queryKey: ["task-attachments", "project", att.project_id] });
    },
  });
}

export async function refreshSignedUrl(path: string) {
  const { data } = await supabase.storage.from("task-attachments").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}
