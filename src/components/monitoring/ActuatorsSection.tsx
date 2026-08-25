"use client";

import { Loader2 } from "lucide-react";
import { useLocationScopeQuery } from "@/components/app/location/LocationScope";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActuators } from "@/lib/operations.functions";

export function ActuatorsSection() {
  const listFn = useServerFn(listActuators);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const { key: loc, params: locParams } = useLocationScopeQuery();
  const { data, isLoading } = useQuery({
    queryKey: ["actuators", loc],
    queryFn: () => listFn({ data: locParams }),
  });

  const actuators = data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading actuators…
        </div>
      ) : actuators.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No actuators registered.</p>
        </div>
      ) : (
        <div className="bg-muted/30 border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Actuator
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Silo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(actuators as any[]).map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{a.actuator_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${a.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {a.is_on ? "On" : "Off"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {a.silos?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
