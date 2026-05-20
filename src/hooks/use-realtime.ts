import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on the given Supabase tables and invalidates
 * the matching React Query caches so all connected clients stay in sync.
 */
export function useRealtimeSync(tables: { table: string; queryKeys: string[][] }[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`realtime-${tables.map((t) => t.table).join("-")}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach(({ table, queryKeys }) => {
      (channel as any).on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
