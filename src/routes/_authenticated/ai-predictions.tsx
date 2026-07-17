import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Brain, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Search, Sparkles, Loader2, Building2 } from "lucide-react";
import { getBatchPredictions, getPlatformSpoilageOverview } from "@/lib/analytics.functions";
import { getMyRole } from "@/lib/roles.functions";
import { getSpoilageInsight } from "@/lib/ai-insights.functions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboards/_shared";

export const Route = createFileRoute("/_authenticated/ai-predictions")({
  component: AIPredictionsPage,
});

function levelBadge(level: string) {
  switch (level) {
    case "critical": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30";
    case "moderate": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";
    default: return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30";
  }
}

function AIPredictionsPage() {
  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const isSuperAdmin = role === "super_admin";
  const allowed = ["super_admin", "admin", "manager"].includes(role);

  if (!roleQ.isLoading && !allowed) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>AI Predictions are available to managers, admins and super admins.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  return isSuperAdmin ? <PlatformView /> : <TenantView />;
}

function TenantView() {
  const fetchPredictions = useServerFn(getBatchPredictions);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: () => fetchPredictions(),
    refetchInterval: 60_000,
  });

  const [q, setQ] = useState("");
  const [insight, setInsight] = useState<null | { risk_level: string; insight: string; recommendations: string[]; batch_id: string }>(null);
  const insightFn = useServerFn(getSpoilageInsight);
  const runInsight = useMutation({
    mutationFn: (v: { siloId: string; batch_id: string }) => insightFn({ data: { siloId: v.siloId } }).then((r) => ({ ...r, batch_id: v.batch_id })),
    onSuccess: (d) => setInsight(d),
    onError: (e: Error) => toast.error(e.message),
  });
  const preds = data?.predictions ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return preds;
    return preds.filter((p: any) =>
      p.batch_id?.toLowerCase().includes(term) || p.grain_type?.toLowerCase().includes(term) || p.level.includes(term)
    );
  }, [preds, q]);

  const counts = useMemo(() => ({
    critical: preds.filter((p: any) => p.level === "critical").length,
    high: preds.filter((p: any) => p.level === "high").length,
    moderate: preds.filter((p: any) => p.level === "moderate").length,
    low: preds.filter((p: any) => p.level === "low").length,
    avg: preds.length ? Math.round(preds.reduce((s: number, p: any) => s + p.score, 0) / preds.length) : 0,
  }), [preds]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="AI Spoilage Predictions" subtitle="Real-time risk scoring per batch using live sensor telemetry and ML models." />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Critical", value: counts.critical, cls: "text-red-600 dark:text-red-400", iconCls: "text-red-500/70 dark:text-red-400/70", icon: AlertTriangle },
          { label: "High", value: counts.high, cls: "text-orange-600 dark:text-orange-400", iconCls: "text-orange-500/70 dark:text-orange-400/70", icon: TrendingUp },
          { label: "Moderate", value: counts.moderate, cls: "text-amber-600 dark:text-amber-400", iconCls: "text-amber-500/70 dark:text-amber-400/70", icon: TrendingUp },
          { label: "Low", value: counts.low, cls: "text-emerald-600 dark:text-emerald-400", iconCls: "text-emerald-500/70 dark:text-emerald-400/70", icon: ShieldCheck },
          { label: "Avg risk", value: `${counts.avg}%`, cls: "text-foreground", iconCls: "text-muted-foreground", icon: Brain },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</div>
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              </div>
              <s.icon className={`h-6 w-6 ${s.iconCls}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Batch predictions</CardTitle>
            <CardDescription>{filtered.length} of {preds.length} batches scored</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batch, grain, level..." className="pl-8 w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((p: any) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to="/traceability" className="font-semibold text-foreground hover:text-primary truncate">{p.batch_id}</Link>
                    <Badge variant="outline" className="text-[10px]">{p.grain_type}</Badge>
                    <Badge className={levelBadge(p.level) + " text-[10px] uppercase"}>{p.level}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.quantity_kg} kg · confidence {(p.confidence * 100).toFixed(0)}% ·{" "}
                    {p.last_reading_at ? `updated ${new Date(p.last_reading_at).toLocaleString()}` : "no recent readings"}
                  </div>
                  {p.factors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.factors.slice(0, 4).map((f: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-52 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Risk score</span>
                    <span className="font-semibold text-foreground">{p.score}%</span>
                  </div>
                  <Progress value={p.score} className="h-2" />
                  <Button size="sm" variant="outline" className="w-full mt-2 gap-1.5"
                    disabled={!p.silo_id || (runInsight.isPending && runInsight.variables?.batch_id === p.batch_id)}
                    onClick={() => runInsight.mutate({ siloId: p.silo_id, batch_id: p.batch_id })}>
                    {runInsight.isPending && runInsight.variables?.batch_id === p.batch_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Sparkles className="h-3.5 w-3.5" />}
                    AI Insight
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">No predictions yet. Add batches and connect sensors.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!insight} onOpenChange={(o) => !o && setInsight(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Spoilage Insight</DialogTitle>
            <DialogDescription>{insight?.batch_id} — risk level <Badge className={levelBadge(insight?.risk_level ?? "low")}>{insight?.risk_level}</Badge></DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{insight?.insight}</p>
          {insight?.recommendations && insight.recommendations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recommendations</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
                {insight.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlatformView() {
  const fetchPlatform = useServerFn(getPlatformSpoilageOverview);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ai-predictions", "platform"],
    queryFn: () => fetchPlatform(),
    refetchInterval: 120_000,
  });
  const [q, setQ] = useState("");
  const tenants = data?.tenants ?? [];
  const dist = data?.distribution ?? { low: 0, moderate: 0, high: 0, critical: 0 };
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((t: any) =>
      t.name?.toLowerCase().includes(term) || t.email?.toLowerCase().includes(term)
    );
  }, [tenants, q]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Platform Spoilage Risk" subtitle="Cross-tenant risk distribution and worst-offender tenants. Read-only." />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Tenants", value: data?.totalTenants ?? 0, cls: "text-foreground", iconCls: "text-muted-foreground", icon: Building2 },
          { label: "Batches scored", value: data?.totalBatches ?? 0, cls: "text-foreground", iconCls: "text-muted-foreground", icon: Brain },
          { label: "Critical", value: dist.critical, cls: "text-red-600 dark:text-red-400", iconCls: "text-red-500/70 dark:text-red-400/70", icon: AlertTriangle },
          { label: "High", value: dist.high, cls: "text-orange-600 dark:text-orange-400", iconCls: "text-orange-500/70 dark:text-orange-400/70", icon: TrendingUp },
          { label: "Low", value: dist.low, cls: "text-emerald-600 dark:text-emerald-400", iconCls: "text-emerald-500/70 dark:text-emerald-400/70", icon: ShieldCheck },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</div>
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              </div>
              <s.icon className={`h-6 w-6 ${s.iconCls}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Worst offenders</CardTitle>
            <CardDescription>
              {filtered.length} of {tenants.length} tenant(s), ranked by critical + high batches
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tenant..."
              className="pl-8 w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((t: any) => (
              <div key={t.admin_id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{t.name}</span>
                    {t.business_type && (
                      <Badge variant="outline" className="text-[10px] capitalize">{t.business_type}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.batches} batches · {Math.round(t.totalKg).toLocaleString()} kg
                    {t.email ? ` · ${t.email}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.critical > 0 && <Badge className={levelBadge("critical") + " text-[10px] uppercase"}>{t.critical} critical</Badge>}
                    {t.high > 0 && <Badge className={levelBadge("high") + " text-[10px] uppercase"}>{t.high} high</Badge>}
                    {t.moderate > 0 && <Badge className={levelBadge("moderate") + " text-[10px] uppercase"}>{t.moderate} mod</Badge>}
                    {t.low > 0 && <Badge className={levelBadge("low") + " text-[10px] uppercase"}>{t.low} low</Badge>}
                  </div>
                </div>
                <div className="w-full sm:w-52 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg risk</span>
                    <span className="font-semibold text-foreground">{t.avgRisk}%</span>
                  </div>
                  <Progress value={t.avgRisk} className="h-2" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {isFetching ? "Loading tenant risk profiles..." : "No tenant batches scored yet."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}