import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";

export function useConsultorAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["module-access", user?.id, "consultor"],
    enabled: !!user,
    placeholderData: undefined,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_module_access", { _module: "consultor" });
      if (error) throw error;
      return data === true;
    },
  });
}