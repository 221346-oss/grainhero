import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformEnvironmentalOverview } from "@/lib/platform-monitoring.functions";
import { getPlatformIncidentsOverview } from "@/lib/monitoring.functions";
import { listMaintenanceRequests, updateMaintenanceRequest } from "@/lib/maintenance-requests.functions";

export const Route = createFileRoute("/_authenticated/platform/monitoring")({
  component: PlatformMonitoringPage,
});

const MAINT_STATUSES = ["requested", "acknowledged", "in_progress", "completed", "cancelled"] as const;

function maintStatusTone(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-slate-100 text-slate-600";
  if (status === "in_progress") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}

function PlatformMonitoringPage() {
  const qc = useQueryClient();
  const envFn = useServerFn(getPlatformEnvironmentalOverview);
  const incidentsFn = useServerFn(getPlatformIncidentsOverview);
  const maintFn = useServerFn(listMaintenanceRequests);
  const updateMaintFn = useServerFn(updateMaintenanceRequest);

  const envQ = useQuery({
    queryKey: ["platform-environmental"],
    queryFn: () => envFn(),
    refetchInterval: 30_000,
  });
  const incidentsQ = useQuery({
    queryKey: ["platform-incidents", "environmental"],
    queryFn: () => incidentsFn({ data: { scope: "environmental" } }),
    refetchInterval: 30_000,
  });
  const maintQ = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: () => maintFn(),
    refetchInterval: 30_000,
  });
  const updateStatusMut = useMutation({
    mutationFn: (v: { id: string; status: typeof MAINT_STATUSES[number] }) => updateMaintFn({ data: v }),
    onSuccess: (updated: Record<string, any>) => {
      toast.success("Maintenance request updated");
      // Merge the full updated row (not a partial patch) into cache for an
      // instant, always-complete update, then confirm with a background refetch.
      qc.setQueryData(["maintenance-requests"], (old: { requests: Record<string, any>[] } | undefined) => {
        if (!old) return old;
        return {
          requests: old.requests.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        };
      });
      qc.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const totals = envQ.data?.totals;
  const tenants = envQ.data?.tenants ?? [];
  const incidentTotals = incidentsQ.data?.totals;
  const incidentTenants = incidentsQ.data?.tenants ?? [];
  const maintRequests = (maintQ.data?.requests ?? []) as Array<Record<string, any>>;
  const openMaintCount = maintRequests.filter((r) => !["completed", "cancelled"].includes(r.status)).length;

  const tiles = [
    { key: "silos", label: "Silos (all tenants)", value: totals?.silos ?? "—" },
    { key: "online", label: "Devices live", value: totals?.online ?? "—" },
    { key: "offline", label: "Devices down", value: totals?.offline ?? "—" },
    { key: "incidents", label: "Open incidents", value: incidentTotals?.open ?? "—" },
  ];

  return (
    <AdminPageShell
      title="Monitoring"
      subtitle="Environmental status across every tenant — silos, device health, and incidents. Read-only."
    >
      <AdminSummaryTiles columns={4} tiles={tiles} />

      <AdminDataCard
        title="Environmental health by tenant"
        description="Silo count and device connectivity per tenant — worst offenders first."
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tenant</th>
              <th className="text-right px-2 py-2 font-medium">Silos</th>
              <th className="text-right px-2 py-2 font-medium">Live</th>
              <th className="text-right px-4 py-2 font-medium">Down</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.adminId} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[220px]">{t.tenantName}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-600">{t.silos}</td>
                <td className="px-2 py-2 text-right tabular-nums text-emerald-700">{t.online}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {t.offline > 0 ? <Badge variant="destructive" className="font-mono">{t.offline}</Badge> : <span className="text-slate-400">0</span>}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && !envQ.isLoading && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-8">No tenants with silos or devices yet.</td></tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>

      <AdminDataCard
        title="Environment incidents"
        description={incidentTotals ? `${incidentTotals.open} open of ${incidentTotals.total} total — environment-level only, not per-batch` : "Loading…"}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tenant</th>
              <th className="text-right px-2 py-2 font-medium">Open</th>
              <th className="text-right px-2 py-2 font-medium">Critical</th>
              <th className="text-right px-4 py-2 font-medium">Last triggered</th>
            </tr>
          </thead>
          <tbody>
            {incidentTenants.filter((t) => t.open > 0).map((t) => (
              <tr key={t.adminId} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[220px]">{t.tenantName}</td>
                <td className="px-2 py-2 text-right tabular-nums">{t.open}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {t.critical > 0 ? <Badge variant="destructive" className="font-mono">{t.critical}</Badge> : <span className="text-slate-400">0</span>}
                </td>
                <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap">
                  {t.lastTriggeredAt ? new Date(t.lastTriggeredAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {incidentTenants.filter((t) => t.open > 0).length === 0 && !incidentsQ.isLoading && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-8">No open environment-level incidents.</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t text-xs text-slate-500">
          <Link to="/incidents" className="text-emerald-700 hover:underline">View full incident detail →</Link>
        </div>
      </AdminDataCard>

      <AdminDataCard
        title="Maintenance requests"
        description={`${openMaintCount} open of ${maintRequests.length} total — requested by tenant admins, tracked here`}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tenant</th>
              <th className="text-left px-2 py-2 font-medium">Title</th>
              <th className="text-left px-2 py-2 font-medium">Priority</th>
              <th className="text-left px-2 py-2 font-medium">Requested</th>
              <th className="text-right px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {maintRequests.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[180px]">{r.tenantName ?? "—"}</td>
                <td className="px-2 py-2 text-slate-700 truncate max-w-[220px]">{r.title}</td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className="capitalize text-[10px]">{r.priority}</Badge>
                </td>
                <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Select
                    value={r.status}
                    onValueChange={(v) => updateStatusMut.mutate({ id: r.id, status: v as typeof MAINT_STATUSES[number] })}
                  >
                    <SelectTrigger className={`h-7 w-[140px] text-xs border-0 ${maintStatusTone(r.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {maintRequests.length === 0 && !maintQ.isLoading && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-8">No maintenance requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>
    </AdminPageShell>
  );
}
