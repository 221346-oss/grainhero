"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocationScopeKey } from "@/components/app/location/LocationScope";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Battery, Signal } from "lucide-react";
import { getDeviceHealth } from "@/lib/operations2.functions";

function fmtGap(s: number | null) {
  if (s == null) return "never";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function DeviceHealthSection() {
  const fn = useServerFn(getDeviceHealth);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const loc = useLocationScopeKey();
  const { data } = useQuery({
    queryKey: ["device-health", loc],
    queryFn: () => fn({ data: { loc: loc ?? undefined } }),
    refetchInterval: 15_000,
  });

  const devices = data?.devices ?? [];
  const totals = data?.totals ?? { total: 0, online: 0, offline: 0, lowBattery: 0, weakSignal: 0 };
  const uptime = totals.total ? (totals.online / totals.total) * 100 : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-muted/30 border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Uptime
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{uptime.toFixed(1)}%</div>
        </div>
        <div className="bg-muted/30 border-border rounded-lg p-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Online
            </div>
            <div className="text-xl font-bold text-foreground mt-1">{totals.online}</div>
          </div>
          <Wifi className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="bg-muted/30 border-border rounded-lg p-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Offline
            </div>
            <div className="text-xl font-bold text-red-400 mt-1">{totals.offline}</div>
          </div>
          <WifiOff className="w-5 h-5 text-red-400" />
        </div>
        <div className="bg-muted/30 border-border rounded-lg p-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Low Batt
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">{totals.lowBattery}</div>
          </div>
          <Battery className="w-5 h-5 text-amber-400" />
        </div>
        <div className="bg-muted/30 border-border rounded-lg p-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Weak Signal
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">{totals.weakSignal}</div>
          </div>
          <Signal className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      <div className="bg-muted/30 border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">Devices</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{devices.length} sensors</p>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {devices.map((d: any) => (
            <div
              key={d.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{d.device_name}</span>
                  <Badge
                    className={
                      d.online
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {d.online ? "online" : "offline"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground border-border"
                  >
                    {d.device_type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {d.device_id} · fw {d.firmware_version ?? "—"} · heartbeat{" "}
                  {fmtGap(d.secondsSinceHeartbeat)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {d.battery_level != null && (
                  <Badge
                    variant="outline"
                    className={
                      d.battery_level < 20
                        ? "text-red-400 border-red-500/30"
                        : "text-muted-foreground border-border"
                    }
                  >
                    <Battery className="h-3 w-3 mr-1" />
                    {d.battery_level}%
                  </Badge>
                )}
                {d.signal_strength != null && (
                  <Badge variant="outline" className="text-muted-foreground border-border">
                    <Signal className="h-3 w-3 mr-1" />
                    {d.signal_strength} dBm
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {devices.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No devices registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
