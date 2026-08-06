import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Wifi, WifiOff, Battery, Signal } from "lucide-react";
import { getDeviceHealth } from "@/lib/operations2.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { CommandConsoleSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/server-monitoring")({
  head: () => ({
    meta: [
      { title: "Server Monitoring — Grain Hero" },
      { name: "description", content: "Server Monitoring workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Server Monitoring — Grain Hero" },
      { property: "og:description", content: "Server Monitoring workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ServerMonitoringPage,
});

function fmtGap(s: number | null) {
  if (s == null) return "never";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function ServerMonitoringPage() {
  const fn = useServerFn(getDeviceHealth);
  const { data, isLoading } = useQuery({ queryKey: ["device-health"], queryFn: () => fn(), refetchInterval: 15_000 });

  if (isLoading) return <CommandConsoleSkeleton />;
  const { isSuperAdmin } = useIsSuperAdmin();
  const devices = data?.devices ?? [];
  const totals = data?.totals ?? { total: 0, online: 0, offline: 0, lowBattery: 0, weakSignal: 0 };
  const uptime = totals.total ? (totals.online / totals.total) * 100 : 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Fleet health across every tenant. Read-only." />
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Server className="h-6 w-6 text-emerald-600" /> Device Health</h1>
        <p className="text-sm text-slate-500 mt-1">Live connectivity and hardware status across all sensor devices.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-slate-500 font-semibold">Uptime</div><div className="text-2xl font-bold text-emerald-600">{uptime.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Online</div><div className="text-2xl font-bold">{totals.online}</div></div><Wifi className="h-6 w-6 text-emerald-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Offline</div><div className="text-2xl font-bold text-red-600">{totals.offline}</div></div><WifiOff className="h-6 w-6 text-red-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Low battery</div><div className="text-2xl font-bold text-amber-600">{totals.lowBattery}</div></div><Battery className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Weak signal</div><div className="text-2xl font-bold text-amber-600">{totals.weakSignal}</div></div><Signal className="h-6 w-6 text-amber-600" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Devices</CardTitle><CardDescription>{devices.length} sensors</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {devices.map((d: any) => (
              <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{d.device_name}</span>
                    <Badge className={d.online ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                      {d.online ? "online" : "offline"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{d.device_type}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {d.device_id} · fw {d.firmware_version ?? "—"} · heartbeat {fmtGap(d.secondsSinceHeartbeat)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {d.battery_level != null && <Badge variant="outline" className={d.battery_level < 20 ? "text-red-700 border-red-200" : ""}><Battery className="h-3 w-3 mr-1" />{d.battery_level}%</Badge>}
                  {d.signal_strength != null && <Badge variant="outline"><Signal className="h-3 w-3 mr-1" />{d.signal_strength} dBm</Badge>}
                </div>
              </div>
            ))}
            {devices.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No devices registered.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}