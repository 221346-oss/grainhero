"use client";

import { Loader2, Thermometer, Droplets, Wind } from "lucide-react";
import { useLocationScopeQuery } from "@/components/app/location/LocationScope";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSilos } from "@/lib/operations.functions";

export function EnvironmentalSection() {
  const listFn = useServerFn(listSilos);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const { key: loc, params: locParams } = useLocationScopeQuery();
  const { data, isLoading } = useQuery({
    queryKey: ["silos", loc],
    queryFn: () => listFn({ data: locParams }),
  });

  const silos = (data ?? []).filter((s: any) => s.current_conditions);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading environmental data…
        </div>
      ) : silos.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No environmental data available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(silos as any[]).map((s) => (
            <div key={s.id} className="bg-muted/30 border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{s.name}</h3>
              <div className="space-y-2">
                {s.current_conditions?.temperature && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Thermometer className="w-4 h-4" /> Temperature
                    </div>
                    <span className="text-foreground font-semibold">
                      {s.current_conditions.temperature.value}°C
                    </span>
                  </div>
                )}
                {s.current_conditions?.humidity && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplets className="w-4 h-4" /> Humidity
                    </div>
                    <span className="text-foreground font-semibold">
                      {s.current_conditions.humidity.value}%
                    </span>
                  </div>
                )}
                {s.current_conditions?.co2 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wind className="w-4 h-4" /> CO2
                    </div>
                    <span className="text-foreground font-semibold">
                      {s.current_conditions.co2.value} ppm
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
