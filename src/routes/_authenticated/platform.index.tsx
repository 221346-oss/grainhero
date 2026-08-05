import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPlatformMetrics,
  getPlatformOverviewWidgets,
  getPlatformApiHealth,
} from "@/lib/platform.functions";
import { listAllHardwareOrders } from "@/lib/hardware-orders.functions";
import { getDeviceHealth } from "@/lib/operations2.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import {
  Users, Activity, Database,
  CheckCircle2, AlertCircle, Loader2, ChevronRight,
  UserPlus, GitBranch, TicketCheck, AlertTriangle,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import React from "react";

export const Route = createFileRoute("/_authenticated/platform/")({
  head: () => ({
    meta: [
      { title: "Platform — Grain Hero" },
      { name: "description", content: "Platform workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform — Grain Hero" },
      { property: "og:description", content: "Platform workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformOverviewPage,
});

// ── Skeleton pulse ────────────────────────────────────────────────────────────
function Sk({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} style={style} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-3">
      {/* Row 1: 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between"><Sk className="h-2.5 w-20" /><Sk className="h-3.5 w-3.5 rounded" /></div>
            <Sk className="h-7 w-12" />
            <Sk className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Row 2: MRR wide + 4 KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3">
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <Sk className="h-2.5 w-28" />
          <Sk className="h-8 w-36" />
          <Sk className="h-2.5 w-20" />
          <Sk className="h-2 w-full rounded-full" />
          <Sk className="h-10 w-full rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between"><Sk className="h-2.5 w-16" /><Sk className="h-3.5 w-3.5 rounded" /></div>
              <Sk className="h-7 w-10" />
            </div>
          ))}
        </div>
      </div>
      {/* Row 3: API health */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 h-9 border-b border-border flex items-center justify-between">
          <Sk className="h-3 w-20" /><Sk className="h-2.5 w-16" />
        </div>
        <div className="p-2.5 grid grid-cols-3 gap-2">
          {[0,1,2].map(i => <Sk key={i} className="h-8 rounded" />)}
        </div>
      </div>
      {/* Row 4: IoT 6 tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
            <Sk className="h-6 w-10" /><Sk className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Row 5: tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[0,1].map(c => (
          <div key={c} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 h-9 border-b border-border flex items-center justify-between">
              <Sk className="h-3 w-24" /><Sk className="h-2.5 w-20" />
            </div>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="px-3 py-2 flex items-center gap-3 border-b border-border last:border-0">
                <div className="flex-1 space-y-1"><Sk className="h-3 w-28" /><Sk className="h-2.5 w-20" /></div>
                <Sk className="h-2.5 w-12" /><Sk className="h-5 w-12 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat tile — label / value / sub, tight padding ───────────────────────────
function StatTile({
  label, value, sub, valueClass,
}: {
  label: string; value: string | number; sub?: string;
  icon?: React.ReactNode; valueClass?: string; iconClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 min-w-0">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate block mb-1">{label}</span>
      <div className={`text-[22px] font-semibold tabular-nums leading-none ${valueClass ?? "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div>}
    </div>
  );
}

// ── MRR card — compact version with slim sparkline ───────────────────────────
function MrrCard({
  mrr, activeSubs, revenueSeries,
}: {
  mrr: number; activeSubs: number;
  revenueSeries?: Array<{ month?: string; revenue?: number; date?: string; count?: number } | Record<string, any>>;
}) {
  // revenueSeries may be { month, revenue } or { date, count } — handle both
  const normalized = (revenueSeries ?? []).map((d: any) => ({
    key:   d.month ?? d.date ?? "",
    value: d.revenue ?? d.count ?? 0,
  })).sort((a, b) => a.key.localeCompare(b.key));

  const lastRev = normalized[normalized.length - 1]?.value ?? 0;
  const prevRev = normalized[normalized.length - 2]?.value ?? 0;
  const growthPct = prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : null;
  const growthUp  = (growthPct ?? 0) >= 0;
  const barPct    = growthPct !== null ? Math.min(100, Math.abs(growthPct)) : 0;

  const sparkColor = "hsl(var(--success))";
  const sparkData = normalized.slice(-8).map((d) => ({ v: d.value }));

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 min-w-0">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Monthly Revenue</p>
          <p className="text-[22px] font-semibold tabular-nums text-success leading-none">
            PKR {Math.round(mrr).toLocaleString("en-PK")}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
          {activeSubs} active
        </span>
      </div>
      {/* Growth progress bar */}
      {growthPct !== null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">Growth vs Last Month</span>
            <span className={`text-[11px] font-semibold tabular-nums ${growthUp ? "text-success" : "text-severity-critical"}`}>
              {growthUp ? "+" : ""}{growthPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${barPct}%`,
                background: growthUp
                  ? "hsl(var(--success))"
                  : "hsl(var(--severity-critical))",
              }}
            />
          </div>
        </div>
      )}
      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="h-10 -mx-0.5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} fill="url(#mrrGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── API health pill ───────────────────────────────────────────────────────────
function HealthPill({ label, status, latencyMs }: {
  label: string; status: "healthy" | "degraded" | "down"; latencyMs: number;
}) {
  const cfg = {
    healthy:  { dot: "bg-success",          text: "text-success",          badge: "Healthy" },
    degraded: { dot: "bg-warning",           text: "text-warning",          badge: "Slow"    },
    down:     { dot: "bg-severity-critical", text: "text-severity-critical",badge: "Down"    },
  }[status];
  return (
    <div className="flex items-center justify-between rounded border border-border px-2.5 py-1.5 bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-[12px] text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">{latencyMs}ms</span>
        <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.badge}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PlatformOverviewPage() {
  const fetchMetrics   = useServerFn(getPlatformMetrics);
  const fetchWidgets   = useServerFn(getPlatformOverviewWidgets);
  const fetchOrders    = useServerFn(listAllHardwareOrders);
  const fetchHealth    = useServerFn(getDeviceHealth);
  const fetchApiHealth = useServerFn(getPlatformApiHealth);

  const metricsQ   = useQuery({ queryKey: ["platform-metrics"],         queryFn: () => fetchMetrics(),   staleTime: 60_000 });
  const widgetsQ   = useQuery({ queryKey: ["platform-widgets"],         queryFn: () => fetchWidgets(),   staleTime: 60_000 });
  const ordersQ    = useQuery({ queryKey: ["platform-hardware-orders"], queryFn: () => fetchOrders(),    staleTime: 30_000 });
  const healthQ    = useQuery({ queryKey: ["device-health"],            queryFn: () => fetchHealth(),    staleTime: 30_000, refetchInterval: 30_000 });
  const apiHealthQ = useQuery({ queryKey: ["platform-api-health"],      queryFn: () => fetchApiHealth(), staleTime: 30_000, refetchInterval: 60_000 });

  const navigate = useNavigate();
  const m = metricsQ.data;
  const w = widgetsQ.data;

  const orders       = ordersQ.data?.orders ?? [];
  const totalOrdered = orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.hardware_quantity ?? 0), 0);
  const deployed     = healthQ.data?.totals?.total ?? 0;
  const remaining    = Math.max(0, totalOrdered - deployed);
  const isLoading    = metricsQ.isLoading || widgetsQ.isLoading;

  const actions = (
    <div className="flex gap-2">
      <Link to="/platform/plans"   className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">Plans</Link>
      <Link to="/platform/tenants" className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">Tenants</Link>
      <Link to="/platform/health"  className="text-[12px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">Health</Link>
    </div>
  );

  return (
    <AdminPageShell title="Platform overview" subtitle="Tenants, revenue, devices, and health across every account" actions={actions}>
      {isLoading ? <OverviewSkeleton /> : (
        <div className="space-y-3">

          {/* ── Row 1: 4 top-level insight tiles ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Signups (30d)"
              value={w?.signupsTotal ?? m?.totalTenants ?? "—"}
              sub={w ? `${w.wowDelta >= 0 ? "+" : ""}${w.wowDelta}% WoW` : undefined}
              icon={<UserPlus className="w-3.5 h-3.5" />}
              valueClass={w && w.wowDelta > 0 ? "text-success" : "text-foreground"}
            />
            <StatTile label="Support tickets" value={m?.totalAlerts ?? "—"} sub="open incidents" icon={<TicketCheck className="w-3.5 h-3.5" />} />
            <StatTile
              label="Pipeline"
              value={w?.pipeline ? Object.values(w.pipeline as Record<string, number>).reduce((a, b) => a + b, 0) : "—"}
              sub="HubSpot syncs"
              icon={<GitBranch className="w-3.5 h-3.5" />}
            />
            <StatTile
              label="Critical alerts"
              value={m?.criticalAlerts ?? "—"}
              sub={m ? `of ${m.totalAlerts} total` : undefined}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              valueClass={m && m.criticalAlerts > 0 ? "text-severity-critical" : "text-foreground"}
              iconClass={m && m.criticalAlerts > 0 ? "text-severity-critical" : undefined}
            />
          </div>

          {/* ── Row 2: MRR card + 4 KPI tiles (same height via items-stretch) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3 items-stretch">
            <MrrCard
              mrr={m?.mrr ?? w?.revenue?.mrr ?? 0}
              activeSubs={m?.activeSubscriptions ?? w?.revenue?.activeSubs ?? 0}
              revenueSeries={w?.signupsSeries}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Tenants"     value={m?.totalTenants        ?? "—"} icon={<Users    className="w-3.5 h-3.5" />} />
              <StatTile label="Total users" value={m?.totalUsers          ?? "—"} icon={<Users    className="w-3.5 h-3.5" />} />
              <StatTile label="Total silos" value={m?.totalSilos          ?? "—"} icon={<Database className="w-3.5 h-3.5" />} valueClass="text-success" />
              <StatTile label="Active subs" value={m?.activeSubscriptions ?? "—"} icon={<Activity className="w-3.5 h-3.5" />} />
            </div>
          </div>

          {/* ── Row 3: API health strip ── */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 h-9 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {apiHealthQ.isLoading
                  ? <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                  : apiHealthQ.data?.overall === "healthy"
                    ? <CheckCircle2 className="w-3 h-3 text-success" />
                    : <AlertCircle  className="w-3 h-3 text-warning" />
                }
                <span className="text-[12px] font-medium">API Health</span>
                {apiHealthQ.data?.checkedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    checked {new Date(apiHealthQ.data.checkedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Link to="/platform/health" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                Full report <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {apiHealthQ.isLoading && [0,1,2].map(i => <Sk key={i} className="h-8 rounded" />)}
              {(apiHealthQ.data?.checks ?? []).map((c: any) => (
                <HealthPill key={c.label} label={c.label} status={c.status} latencyMs={c.latencyMs} />
              ))}
              {apiHealthQ.isError && (
                <div className="col-span-3 text-[12px] text-muted-foreground text-center py-2">Health check unavailable</div>
              )}
            </div>
          </div>

          {/* ── Row 4: IoT fleet — 6 compact tiles ── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {([
              { val: ordersQ.isLoading ? "—" : totalOrdered,                   label: "Devices sold",     cls: "text-foreground" },
              { val: healthQ.isLoading ? "—" : deployed,                        label: "Deployed",         cls: "text-success" },
              { val: ordersQ.isLoading || healthQ.isLoading ? "—" : remaining,  label: "Awaiting install", cls: "text-warning" },
              { val: healthQ.data?.totals?.online    ?? "—",                    label: "Live",             cls: "text-success" },
              { val: healthQ.data?.totals?.offline   ?? "—",                    label: "Down",             cls: "text-severity-critical" },
              { val: healthQ.data?.totals?.lowBattery ?? "—",                   label: "Low battery",      cls: "text-warning" },
            ] as Array<{ val: string | number; label: string; cls: string }>).map(({ val, label, cls }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-3 py-2.5">
                <div className={`text-[20px] font-semibold tabular-nums leading-tight ${cls}`}>{val}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Row 5: Recent signups + System alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Recent signups */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 h-9 border-b border-border flex items-center justify-between">
                <span className="text-[12px] font-medium">Recent signups</span>
                {w && (
                  <span className="text-[11px] text-muted-foreground">
                    {w.signupsTotal} in 30d ·{" "}
                    <span className={w.wowDelta >= 0 ? "text-success" : "text-severity-critical"}>
                      {w.wowDelta >= 0 ? "+" : ""}{w.wowDelta}% WoW
                    </span>
                  </span>
                )}
              </div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/40 border-b border-border">
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Name</th>
                      <th className="text-left px-2 py-1.5 font-medium">Business</th>
                      <th className="text-left px-2 py-1.5 font-medium">Plan</th>
                      <th className="text-right px-3 py-1.5 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(w?.recentSignups ?? []).map((s: any) => (
                      <tr key={s.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group"
                        onClick={() => navigate({ to: "/platform/tenants/$adminId", params: { adminId: s.id } })}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground truncate max-w-[100px]">{s.name ?? "—"}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{s.email}</div>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">{s.business_type ?? "—"}</td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.subscription_plan ?? "starter"}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {(!w || w.recentSignups.length === 0) && (
                      <tr><td colSpan={4} className="text-center text-muted-foreground py-6 text-[12px]">No recent signups</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground/50">
                Click a row to view tenant details
              </div>
            </div>

            {/* System alerts */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 h-9 border-b border-border flex items-center justify-between">
                <span className="text-[12px] font-medium">System alerts</span>
                {m && <span className="text-[11px] text-muted-foreground">{m.criticalAlerts} critical of {m.totalAlerts} total</span>}
              </div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/40 border-b border-border">
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Alert</th>
                      <th className="text-left px-2 py-1.5 font-medium">Priority</th>
                      <th className="text-right px-3 py-1.5 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(w?.systemAlerts ?? []).map((a: any) => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground truncate max-w-[180px]">{a.alert_type}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{a.message}</div>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-[11px] font-medium ${a.priority === "critical" ? "text-severity-critical" : "text-warning"}`}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                    {(!w || w.systemAlerts.length === 0) && (
                      <tr><td colSpan={3} className="text-center text-muted-foreground py-6 text-[12px]">No system alerts</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
