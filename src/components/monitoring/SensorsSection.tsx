'use client';

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSensorDevices } from "@/lib/operations.functions";

export function SensorsSection() {
  const listFn = useServerFn(listSensorDevices);
  const { data, isLoading } = useQuery({ queryKey: ["sensor-devices"], queryFn: () => listFn() });

  const devices = data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sensors…
        </div>
      ) : devices.length === 0 ? (
        <div className="py-12 text-center text-white/40">
          <p className="text-sm">No sensors registered.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Device</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Battery</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/60 text-xs uppercase tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(devices as any[]).map((d) => (
                  <tr key={d.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{d.device_name}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{d.device_type ?? "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${d.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{d.status}</span></td>
                    <td className="px-4 py-3 text-white/70 text-xs">{d.battery_level ?? "—"}%</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{d.silos?.name ?? d.warehouses?.name ?? "—"}</td>
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
