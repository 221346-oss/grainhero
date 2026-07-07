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
import { Brain, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Search } from "lucide-react";
import { getBatchPredictions } from "@/lib/analytics.functions";
import { getMyRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/ai-predictions")({
  component: AIPredictionsPage,
});

function levelBadge(level: string) {
  switch (level) {
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "moderate": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
}

function AIPredictionsPage() {
  const fetchRole = useServerFn(getMyRole);
  const fetchPredictions = useServerFn(getBatchPredictions);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin", "manager"].includes(role);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: () => fetchPredictions(),
    enabled: allowed,
    refetchInterval: 60_000,
  });

  const [q, setQ] = useState("");
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

  if (!roleQ.isLoading && !allowed) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>AI Predictions are available to managers, admins and super admins.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Brain className="h-6 w-6 text-emerald-600" /> AI Spoilage Predictions</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time risk scoring per batch using live sensor telemetry and ML models.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Critical", value: counts.critical, cls: "text-red-600", icon: AlertTriangle },
          { label: "High", value: counts.high, cls: "text-orange-600", icon: TrendingUp },
          { label: "Moderate", value: counts.moderate, cls: "text-amber-600", icon: TrendingUp },
          { label: "Low", value: counts.low, cls: "text-emerald-600", icon: ShieldCheck },
          { label: "Avg risk", value: `${counts.avg}%`, cls: "text-slate-900", icon: Brain },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{s.label}</div>
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              </div>
              <s.icon className={`h-6 w-6 ${s.cls}`} />
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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batch, grain, level..." className="pl-8 w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((p: any) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to="/traceability" className="font-semibold text-slate-900 hover:text-emerald-600 truncate">{p.batch_id}</Link>
                    <Badge variant="outline" className="text-[10px]">{p.grain_type}</Badge>
                    <Badge className={levelBadge(p.level) + " text-[10px] uppercase"}>{p.level}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {p.quantity_kg} kg · confidence {(p.confidence * 100).toFixed(0)}% ·{" "}
                    {p.last_reading_at ? `updated ${new Date(p.last_reading_at).toLocaleString()}` : "no recent readings"}
                  </div>
                  {p.factors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.factors.slice(0, 4).map((f: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-52 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Risk score</span>
                    <span className="font-semibold text-slate-900">{p.score}%</span>
                  </div>
                  <Progress value={p.score} className="h-2" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">No predictions yet. Add batches and connect sensors.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}