import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSyncMonitorOverview, listSyncRuns, runSyncManually, type SyncEndpoint } from "@/lib/mobile-sync-monitor.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const ENDPOINTS: SyncEndpoint[] = ["field-tasks", "field-incidents", "marketplace", "buyer-summary"];

export const Route = createFileRoute("/_authenticated/platform/mobile-sync-monitor")({
  component: MobileSyncMonitorPage,
});

function MobileSyncMonitorPage() {
  const loadOverview = useServerFn(getSyncMonitorOverview);
  const loadRuns = useServerFn(listSyncRuns);
  const trigger = useServerFn(runSyncManually);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<SyncEndpoint | undefined>(undefined);

  const { data: overview } = useQuery({
    queryKey: ["sync-monitor-overview"], queryFn: () => loadOverview(),
    refetchInterval: 30_000,
  });
  const { data: runs } = useQuery({
    queryKey: ["sync-monitor-runs", selected], queryFn: () => loadRuns({ data: { endpoint: selected, limit: 50 } }),
  });

  const runNow = useMutation({
    mutationFn: (endpoint: SyncEndpoint) => trigger({ data: { endpoint } }),
    onSuccess: (r, endpoint) => {
      toast[r.ok ? "success" : "error"](r.ok ? `${endpoint} probed OK (${r.row_count} rows)` : `${endpoint} failed: ${r.error}`);
      qc.invalidateQueries({ queryKey: ["sync-monitor-overview"] });
      qc.invalidateQueries({ queryKey: ["sync-monitor-runs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const ov = overview as { endpoints: Array<{ endpoint: string; total: number; success: number; failure: number; error_rate: number; p95_ms: number; last_run_at: string | null; last_error_at: string | null; last_error_message: string | null }>; totals: { total: number; error_rate: number; p95_ms: number } } | undefined;

  return (
    <AdminPageShell
      title="Mobile sync monitor"
      subtitle="Per-endpoint health for the mobile Data API. 24-hour rolling window. Manual re-runs probe RLS visibility only."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-4">
          <CardHeader><CardTitle>Endpoints (last 24h)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {ENDPOINTS.map((endpoint) => {
                const row = ov?.endpoints.find((e) => e.endpoint === endpoint);
                const errRate = row?.error_rate ?? 0;
                return (
                  <div key={endpoint} className="rounded border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{endpoint}</div>
                      <Badge variant={errRate > 0.1 ? "destructive" : errRate > 0 ? "secondary" : "default"}>
                        {(errRate * 100).toFixed(1)}% err
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                      <span>Total: {row?.total ?? 0}</span>
                      <span>Fail: {row?.failure ?? 0}</span>
                      <span>P95: {row?.p95_ms ?? 0}ms</span>
                      <span>Last: {row?.last_run_at ? new Date(row.last_run_at).toLocaleTimeString() : "—"}</span>
                    </div>
                    {row?.last_error_message && (
                      <div className="text-xs text-destructive line-clamp-2">{row.last_error_message}</div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelected(endpoint)}>View runs</Button>
                      <Button size="sm" onClick={() => runNow.mutate(endpoint)} disabled={runNow.isPending}>
                        Run now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Recent runs {selected ? `— ${selected}` : "(all endpoints)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant={selected ? "outline" : "default"} onClick={() => setSelected(undefined)}>All</Button>
              {ENDPOINTS.map((e) => (
                <Button key={e} size="sm" variant={selected === e ? "default" : "outline"} onClick={() => setSelected(e)}>{e}</Button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Started</th>
                    <th className="py-2 pr-3">Endpoint</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Rows</th>
                    <th className="py-2 pr-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {((runs as Array<Record<string, unknown>>) ?? []).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-xs">{new Date(r.started_at as string).toLocaleString()}</td>
                      <td className="py-2 pr-3">{r.endpoint as string}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.status === "ok" ? "default" : "destructive"}>{r.status as string}</Badge>
                      </td>
                      <td className="py-2 pr-3">{r.duration_ms as number}ms</td>
                      <td className="py-2 pr-3">{(r.row_count as number | null) ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs text-destructive max-w-md truncate">{(r.error_message as string | null) ?? ""}</td>
                    </tr>
                  ))}
                  {!runs?.length && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground text-sm">No runs yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}