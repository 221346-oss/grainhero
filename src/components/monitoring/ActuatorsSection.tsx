'use client';

import { Loader2, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActuators } from "@/lib/operations.functions";

export function ActuatorsSection() {
  const listFn = useServerFn(listActuators);
  const { data, isLoading } = useQuery({ queryKey: ["actuators"], queryFn: () => listFn() });

  const actuators = data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading actuators…
        </div>
      ) : actuators.length === 0 ? (
        <div className="py-12 text-center text-white/40">
          <Inbox className="w-10 h-10 mb-2 mx-auto opacity-20" />
          <p className="text-sm">No actuators registered.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Actuator</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">State</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Silo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(actuators as any[]).map((a) => (
                  <tr key={a.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{a.actuator_type}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${a.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-white/70 text-xs">{a.is_on ? "On" : "Off"}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{a.silos?.name ?? "—"}</td>
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
