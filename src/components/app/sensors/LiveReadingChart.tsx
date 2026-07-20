import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Radio, WifiOff } from "lucide-react";
import { getSiloReadings } from "@/lib/telemetry.functions";
import { supabase } from "@/integrations/supabase/client";

type Metric = "temperature" | "humidity" | "moisture" | "co2";
const COL: Record<Metric, string> = {
  temperature: "temperature_value",
  humidity: "humidity_value",
  moisture: "moisture_value",
  co2: "co2_value",
};

type Point = { t: string; v: number | null };

export function LiveReadingChart({
  siloId, deviceId, metric = "temperature", hours = 6,
}: { siloId: string; deviceId: string; metric?: Metric; hours?: number }) {
  const fetchReadings = useServerFn(getSiloReadings);
  const { data, isLoading } = useQuery({
    queryKey: ["silo-readings", siloId, metric, hours],
    queryFn: () => fetchReadings({ data: { siloId, hours } }),
    refetchInterval: 60_000,
  });

  const [live, setLive] = useState<Point[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let failures = 0;
    const channel = supabase
      .channel(`readings:${deviceId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings", filter: `device_id=eq.${deviceId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const v = row[COL[metric]] as number | null;
          const t = (row.reading_timestamp as string) ?? new Date().toISOString();
          setLive((prev) => [...prev.slice(-99), { t, v }]);
        })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          failures += 1;
          if (failures >= 3) setPaused(true);
        } else if (status === "SUBSCRIBED") {
          failures = 0; setPaused(false);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, metric]);

  const points = useMemo<Point[]>(() => {
    const base = (data?.readings ?? []).map((r): Point => ({
      t: r.reading_timestamp as string,
      v: (r[COL[metric]] as number | null) ?? null,
    }));
    const merged = [...base, ...live];
    return merged.slice(-200);
  }, [data, live, metric]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{metric}</div>
        {paused ? (
          <Badge variant="outline" className="gap-1 text-amber-600"><WifiOff className="h-3 w-3" /> Live paused · polling</Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-emerald-600"><Radio className="h-3 w-3" /> Live</Badge>
        )}
      </div>
      <div className="h-48">
        {isLoading && points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No readings in the selected window.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} minTickGap={30} fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip labelFormatter={(t) => new Date(t as string).toLocaleString()} />
              <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} stroke="hsl(var(--primary))" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
