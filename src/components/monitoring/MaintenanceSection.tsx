'use client';

import { Loader2, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMaintenanceOverview } from "@/lib/operations2.functions";
import { Badge } from "@/components/ui/badge";

export function MaintenanceSection() {
  const getFn = useServerFn(getMaintenanceOverview);
  const { data, isLoading } = useQuery({ queryKey: ["maintenance-overview"], queryFn: () => getFn() });

  const maintenance = (data?.devices ?? [])
    .filter((d: any) => d.next_maintenance_date || d.calibration_due_date)
    .map((d: any) => {
      const due = d.next_maintenance_date ?? d.calibration_due_date;
      return {
        id: d.id,
        task_description: `${d.device_name ?? d.device_id} — ${d.next_maintenance_date ? "scheduled maintenance" : "calibration"}`,
        maintenance_type: d.device_type,
        status: due && new Date(due).getTime() < Date.now() ? "pending" : "scheduled",
        due_date: due,
      };
    });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading maintenance tasks…
        </div>
      ) : maintenance.length === 0 ? (
        <div className="py-12 text-center text-white/40">
          <Inbox className="w-10 h-10 mb-2 mx-auto opacity-20" />
          <p className="text-sm">No maintenance tasks.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(maintenance as any[]).map((m) => (
                  <tr key={m.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{m.task_description}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{m.maintenance_type ?? "—"}</td>
                    <td className="px-4 py-3"><Badge className={m.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}>{m.status}</Badge></td>
                    <td className="px-4 py-3 text-white/70 text-xs">{m.due_date ? new Date(m.due_date).toLocaleDateString() : "—"}</td>
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
