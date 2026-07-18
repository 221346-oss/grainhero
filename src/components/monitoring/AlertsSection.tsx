'use client';

import { Loader2, Inbox, AlertTriangle, AlertCircle, Bell, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGrainAlerts } from "@/lib/operations.functions";
import { Badge } from "@/components/ui/badge";

const PRIO_ICON: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: Bell,
  low: Activity,
};

export function AlertsSection() {
  const listFn = useServerFn(listGrainAlerts);
  const { data, isLoading } = useQuery({ queryKey: ["grain-alerts"], queryFn: () => listFn() });

  const alerts = (data ?? []).filter((a: any) => a.status === "pending");

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading alerts…
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-12 text-center text-white/40">
          <Inbox className="w-10 h-10 mb-2 mx-auto opacity-20" />
          <p className="text-sm">No active alerts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a: any) => {
            const Icon = PRIO_ICON[a.priority] || Activity;
            const prioColor = ({
              critical: "bg-rose-500/20 text-rose-400",
              high: "bg-orange-500/20 text-orange-400",
              medium: "bg-amber-500/20 text-amber-400",
              low: "bg-blue-500/20 text-blue-400",
            } as Record<string, string>)[a.priority] || "bg-gray-500/20 text-gray-400";

            return (
              <div key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors">
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${prioColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                      <Badge className={prioColor}>{a.priority}</Badge>
                    </div>
                    <p className="text-xs text-white/60 mt-1">{a.message}</p>
                    <div className="text-xs text-white/40 mt-2">
                      {a.silos?.name && <span>{a.silos.name} • </span>}
                      {a.triggered_at && <span>{new Date(a.triggered_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
