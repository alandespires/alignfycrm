import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId, requireTenantId } from "@/contexts/tenant-context";

export type TenantSettings = {
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    compactLeads: boolean;
  };
  sales: {
    maxStageDays: number;
    proposalValidityDays: number;
    autoAssignLeads: boolean;
    requireLostReason: boolean;
  };
  marketing: {
    senderEmail: string;
    senderName: string;
    unsubscribeLink: boolean;
    weeklyReport: boolean;
  };
};

const DEFAULTS: TenantSettings = {
  preferences: { emailNotifications: true, pushNotifications: true, compactLeads: false },
  sales: { maxStageDays: 14, proposalValidityDays: 15, autoAssignLeads: false, requireLostReason: true },
  marketing: { senderEmail: "", senderName: "", unsubscribeLink: true, weeklyReport: false },
};

type SettingsRow = {
  preferences: Partial<TenantSettings["preferences"]> | null;
  sales: Partial<TenantSettings["sales"]> | null;
  marketing: Partial<TenantSettings["marketing"]> | null;
};

export function useTenantSettings() {
  const tenantId = getActiveTenantId();
  return useQuery({
    queryKey: ["tenant-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantSettings> => {
      const { data, error } = await supabase.from("tenant_settings").select("preferences, sales, marketing").eq("tenant_id", tenantId).maybeSingle();
      if (error) throw error;
      const row = data as SettingsRow | null;
      return {
        preferences: { ...DEFAULTS.preferences, ...(row?.preferences ?? {}) },
        sales: { ...DEFAULTS.sales, ...(row?.sales ?? {}) },
        marketing: { ...DEFAULTS.marketing, ...(row?.marketing ?? {}) },
      };
    },
  });
}

export function useSaveTenantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: TenantSettings) => {
      const tenantId = requireTenantId();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("tenant_settings").upsert({
        tenant_id: tenantId,
        preferences: settings.preferences,
        sales: settings.sales,
        marketing: settings.marketing,
        updated_by: auth.user.id,
      }, { onConflict: "tenant_id" });
      if (error) throw error;
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(["tenant-settings", getActiveTenantId()], settings);
      toast.success("Configurações salvas");
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao salvar configurações"),
  });
}
