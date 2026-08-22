import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { Badge } from "@/components/ui/badge";
import { getPlatformIntelligenceOverview } from "@/lib/platform-intelligence.functions";

export const Route = createFileRoute("/_authenticated/platform/intelligence")({
  head: () => ({
    meta: [
      { title: "Platform · Intelligence — Grain Hero" },
      { name: "description", content: "Platform · Intelligence workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Intelligence — Grain Hero" },
      { property: "og:description", content: "Platform · Intelligence workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformIntelligencePage,
});

function PlatformIntelligencePage() {
  const fn = useServerFn(getPlatformIntelligenceOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["platform-intelligence"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const totals = data?.totals;
  const bySource = data?.bySource;
  const tenants = data?.tenants ?? [];
  const successRate = totals && totals.total > 0 ? Math.round((totals.succeeded / totals.total) * 100) : null;

  const tiles = [
    { key: "total", label: "Total requests", value: totals?.total ?? "—", hint: "Last 2,000 logged" },
    { key: "success", label: "Success rate", value: successRate != null ? `${successRate}%` : "—" },
    { key: "failed", label: "Failed", value: totals?.failed ?? "—" },
    { key: "latency", label: "Avg latency", value: totals?.avgLatencyMs != null ? `${totals.avgLatencyMs}ms` : "—" },
  ];

  return (
    <AdminPageShell
      title="Intelligence"
      subtitle="ML model health and request volume across the platform. Read-only — no tenant prediction data."
    >
      <PlatformScopeBanner label="API/model-level monitoring only. Risk scores and spoilage predictions are each tenant's own data, not shown here." />

      <AdminDataCard title="Deployed model">
        <div className="p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Primary</div>
            <div className="text-sm font-medium text-foreground mt-0.5">{data?.model.primary ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fallback</div>
            <div className="text-sm font-medium text-foreground mt-0.5">{data?.model.fallback ?? "—"}</div>
          </div>
        </div>
      </AdminDataCard>

      <AdminSummaryTiles columns={4} tiles={tiles} />

      <AdminDataCard
        title="Requests by source"
        description="Where each inference attempt was actually served from"
      >
        <div className="p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-700">{bySource?.api ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Remote API</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-700">{bySource?.python_local ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Local Python fallback</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-700">{bySource?.cascade_failed ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Both failed</div>
          </div>
        </div>
      </AdminDataCard>

      <AdminDataCard
        title="Requests by tenant"
        description="Volume and failures per admin — worst offenders first"
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tenant</th>
              <th className="text-right px-2 py-2 font-medium">Requests</th>
              <th className="text-right px-2 py-2 font-medium">Failed</th>
              <th className="text-right px-4 py-2 font-medium">Last request</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.adminId} className="border-t hover:bg-muted/20 align-top">
                <td className="px-4 py-2 font-medium text-foreground truncate max-w-[200px]">{t.tenantName}</td>
                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{t.total}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {t.failed > 0 ? <Badge variant="destructive" className="font-mono">{t.failed}</Badge> : <span className="text-muted-foreground">0</span>}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground whitespace-nowrap">
                  {t.lastRequestAt ? new Date(t.lastRequestAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && !isLoading && (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-8">No inference requests logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>

      {tenants.some((t) => t.recentFailures.length > 0) && (
        <AdminDataCard title="Recent failure detail" description="Latest errors per tenant with failures">
          <div className="divide-y">
            {tenants.filter((t) => t.recentFailures.length > 0).map((t) => (
              <div key={t.adminId} className="p-4">
                <div className="text-sm font-medium text-foreground">{t.tenantName}</div>
                <ul className="mt-2 space-y-1.5">
                  {t.recentFailures.map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{f.triggeredBy}</Badge>
                      <span className="text-muted-foreground">{new Date(f.at).toLocaleString()}</span>
                      <span className="text-red-600 truncate max-w-[400px]">{f.error ?? "Unknown error"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminDataCard>
      )}
    </AdminPageShell>
  );
}
