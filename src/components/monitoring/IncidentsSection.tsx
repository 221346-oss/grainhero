'use client';

import { Loader2, AlertOctagon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIncidents } from "@/lib/monitoring.functions";
import { Badge } from "@/components/ui/badge";

export function IncidentsSection() {
  const getFn = useServerFn(getIncidents);
  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: () => getFn() });

  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center text-white/40">
          <p className="text-sm">No incidents reported.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(incidents as any[]).map((i) => (
            <div key={i.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{i.title}</h3>
                    <Badge className={i.status === "open" || i.status === "active" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}>{i.status}</Badge>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{i.message}</p>
                  <div className="text-xs text-white/40 mt-2">
                    {i.triggered_at && <span>Triggered {new Date(i.triggered_at).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
