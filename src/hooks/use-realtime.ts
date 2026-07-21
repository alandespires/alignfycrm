import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeStatus } from "@/components/realtime-badge";

/**
 * Subscribes to realtime changes on the given Supabase tables and invalidates
 * the matching React Query caches so all connected clients stay in sync.
 */
export function useRealtimeSync(tables: { table: string; queryKeys: string[][] }[]) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  useEffect(() => {
    const channel = supabase.channel(`realtime-${tables.map((t) => t.table).join("-")}-${Math.random().toString(36).slice(2, 8)}`);
    tables.forEach(({ table, queryKeys }) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },
      );
    });
    channel.subscribe((channelStatus) => {
      if (channelStatus === "SUBSCRIBED") setStatus("live");
      else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") setStatus("reconnecting");
      else if (channelStatus === "CLOSED") setStatus("offline");
    });
    return () => {
      setStatus("offline");
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return status;
}
