import { createFileRoute } from "@tanstack/react-router";
import { DashboardSkeleton } from "@/components/app/skeletons";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Battery, ShieldAlert, Clock, Search, CheckCircle2 } from "lucide-react";
import { getMaintenanceOverview, markMaintenanceDone, getPlatformMaintenanceOverview } from "@/lib/operations2.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Grain Hero" },
      { name: "description", content: "Maintenance workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Maintenance — Grain Hero" },
      { property: "og:description", content: "Maintenance workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MaintenancePage,
});

function urgencyBadge(next: string | null) {
  if (!next) return { cls: "bg-slate-100 text-slate-700", label: "Unscheduled" };
  const t = new Date(next).getTime();
  const now = Date.now();
  if (t < now) return { cls: "bg-red-100 text-red-800", label: `Overdue ${Math.ceil((now - t) / 86400000)}d` };
  const days = Math.ceil((t - now) / 86400000);
  if (days <= 30) return { cls: "bg-amber-100 text-amber-800", label: `Due in ${days}d` };
  return { cls: "bg-emerald-100 text-emerald-800", label: `In ${days}d` };
}

function MaintenancePage() {
  const { isSuperAdmin } = useIsSuperAdmin();
  if (isSuperAdmin) return <PlatformMaintenanceView />;
  return <TenantMaintenanceView />;
}

function TenantMaintenanceView() {
  const fn = useServerFn(getMaintenanceOverview);
  const doneFn = useServerFn(markMaintenanceDone);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["maintenance"], queryFn: () => fn() });
  const [q, setQ] = useState("");

  const doneM = useMutation({
    mutationFn: (args: { id: string; kind: "device" | "actuator" }) => doneFn({ data: { ...args, nextInDays: 180 } }),
    onSuccess: () => { toast.success("Marked serviced"); qc.invalidateQueries({ queryKey: ["maintenance"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const devices = data?.devices ?? [];
  const actuators = data?.actuators ?? [];
  const totals = data?.totals ?? { devices: 0, actuators: 0, overdue: 0, dueSoon: 0, lowBattery: 0, warrantyExpiring: 0 };

  const combined = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = [
      ...devices.map((d: any) => ({ ...d, kind: "device" as const, name: d.device_name, id_str: d.device_id })),
      ...actuators.map((a: any) => ({ ...a, kind: "actuator" as const, name: a.name, id_str: a.actuator_id })),
    ];
    return term ? items.filter((i) => i.name?.toLowerCase().includes(term) || i.id_str?.toLowerCase().includes(term)) : items;
  }, [devices, actuators, q]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Wrench className="h-6 w-6 text-emerald-600" /> Maintenance</h1>
        <p className="text-sm text-slate-500 mt-1">Servicing schedule for sensors and actuators.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Assets</div><div className="text-2xl font-bold">{totals.devices + totals.actuators}</div><div className="text-xs text-slate-500">{totals.devices} sensors · {totals.actuators} actuators</div></div><Wrench className="h-6 w-6 text-slate-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Overdue</div><div className="text-2xl font-bold text-red-600">{totals.overdue}</div></div><Clock className="h-6 w-6 text-red-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Due 30d</div><div className="text-2xl font-bold text-amber-600">{totals.dueSoon}</div></div><Clock className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Low battery</div><div className="text-2xl font-bold">{totals.lowBattery}</div><div className="text-xs text-slate-500">{totals.warrantyExpiring} warranty exp.</div></div><Battery className="h-6 w-6 text-amber-600" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div><CardTitle>Service schedule</CardTitle><CardDescription>{combined.length} assets</CardDescription></div>
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8 w-56" /></div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {combined.map((i: any) => {
              const u = urgencyBadge(i.next_maintenance_date);
              return (
                <div key={`${i.kind}-${i.id}`} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{i.name}</span>
                      <Badge variant="outline" className="text-[10px]">{i.kind}</Badge>
                      {i.kind === "device" && i.battery_level != null && (
                        <Badge variant="outline" className={i.battery_level < 20 ? "text-red-700 border-red-200" : ""}>{i.battery_level}%</Badge>
                      )}
                      <Badge className={u.cls + " text-[10px]"}>{u.label}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {i.id_str}{i.manufacturer ? ` · ${i.manufacturer} ${i.model ?? ""}` : ""}
                      {i.last_maintenance_date ? ` · last ${new Date(i.last_maintenance_date).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => doneM.mutate({ id: i.id, kind: i.kind })} disabled={doneM.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark serviced
                  </Button>
                </div>
              );
            })}
            {combined.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No assets found.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformMaintenanceView() {
  const fn = useServerFn(getPlatformMaintenanceOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-maintenance"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
  const totals = data?.totals ?? { devices: 0, overdue: 0, dueSoon: 0, lowBattery: 0 };
  const tenants = data?.tenants ?? [];
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PlatformScopeBanner label="Overdue and upcoming maintenance across every tenant. Read-only." />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Wrench className="h-6 w-6 text-emerald-600" /> Platform maintenance</h1>
        <p className="text-sm text-slate-500 mt-1">Tenants ranked by overdue devices.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Devices</div><div className="text-2xl font-bold">{totals.devices}</div></div><Wrench className="h-6 w-6 text-slate-500" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Overdue</div><div className="text-2xl font-bold text-red-600">{totals.overdue}</div></div><Clock className="h-6 w-6 text-red-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Due 30d</div><div className="text-2xl font-bold text-amber-600">{totals.dueSoon}</div></div><Clock className="h-6 w-6 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="p-4 flex justify-between items-center"><div><div className="text-xs uppercase text-slate-500 font-semibold">Low battery</div><div className="text-2xl font-bold">{totals.lowBattery}</div></div><Battery className="h-6 w-6 text-amber-600" /></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Worst-offender tenants</CardTitle><CardDescription>Ranked by overdue devices, then due-soon.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">Failed to load: {(error as Error).message}</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Every tenant is up to date.</div>
          ) : (
            <div className="divide-y">
              {tenants.map((t) => (
                <div key={t.adminId} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{t.tenantName}</div>
                    <div className="text-xs text-slate-500">{t.devices} device{t.devices === 1 ? "" : "s"}</div>
                  </div>
                  <Badge className="bg-red-100 text-red-800 border-red-200"><ShieldAlert className="h-3.5 w-3.5 mr-1" />{t.overdue} overdue</Badge>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">{t.dueSoon} due 30d</Badge>
                  <Badge variant="outline"><Battery className="h-3.5 w-3.5 mr-1" />{t.lowBattery} low</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}