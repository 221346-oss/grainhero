import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Brain, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Search, Loader2, Sparkles, WifiOff, RotateCcw, X } from "lucide-react";
import { getSiloPredictions, getSiloRecommendation } from "@/lib/analytics.functions";
import { getMyRole } from "@/lib/roles.functions";
import { getSpoilageInsight } from "@/lib/ai-insights.functions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function levelBadge(level: string) {
  switch (level) {
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "moderate": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
}

export function PredictionsSection() {
  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["admin", "manager"].includes(role);

  if (!roleQ.isLoading && !allowed) {
    return (
      <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>AI Predictions are available to managers and admins. Super Admin has a separate model-monitoring view under Platform.</CardDescription></CardHeader></Card>
    );
  }

  return <TenantView />;
}

function TenantView() {
  const fetchPredictions = useServerFn(getSiloPredictions);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: () => fetchPredictions(),
    refetchInterval: 60_000,
  });

  const [q, setQ] = useState("");
  const [insight, setInsight] = useState<null | { risk_level: string; insight: string; recommendations: string[]; silo_name: string }>(null);
  const insightFn = useServerFn(getSpoilageInsight);
  const runInsight = useMutation({
    mutationFn: (v: { siloId: string; silo_name: string }) => insightFn({ data: { siloId: v.siloId } }).then((r) => ({ ...r, silo_name: v.silo_name })),
    onSuccess: (d) => setInsight(d),
    onError: (e: Error) => toast.error(e.message),
  });
  const preds = data?.predictions ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return preds;
    return preds.filter((p: any) =>
      p.silo_id?.toLowerCase().includes(term) || p.name?.toLowerCase().includes(term) || p.grain_type?.toLowerCase().includes(term) || p.level.includes(term)
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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
            <CardTitle>Silo predictions</CardTitle>
            <CardDescription>{filtered.length} of {preds.length} silos scored</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search silo, grain, level..." className="pl-8 w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((p: any) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to="/silos/$siloId" params={{ siloId: p.id }} className="font-semibold text-slate-900 hover:text-emerald-600 truncate">{p.name ?? p.silo_id}</Link>
                    {p.grain_type && <Badge variant="outline" className="text-[10px]">{p.grain_type}</Badge>}
                    <Badge className={levelBadge(p.level) + " text-[10px] uppercase"}>{p.level}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {p.quantity_kg.toLocaleString()} kg on hand · confidence {(p.confidence * 100).toFixed(0)}% ·{" "}
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
                  <Button size="sm" variant="outline" className="w-full mt-2 gap-1.5"
                    disabled={runInsight.isPending && runInsight.variables?.siloId === p.id}
                    onClick={() => runInsight.mutate({ siloId: p.id, silo_name: p.name ?? p.silo_id })}>
                    {runInsight.isPending && runInsight.variables?.siloId === p.id
                      && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    AI Insight
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">No predictions yet. Add silos and connect sensors.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!insight} onOpenChange={(o) => !o && setInsight(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">AI Spoilage Insight</DialogTitle>
            <DialogDescription>{insight?.silo_name} — risk level <Badge className={levelBadge(insight?.risk_level ?? "low")}>{insight?.risk_level}</Badge></DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{insight?.insight}</p>
          {insight?.recommendations && insight.recommendations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recommendations</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                {insight.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Silo Flashcards ── */}
      <SiloFlashCards predictions={preds} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Silo Recommendation Cards + Sheet drawer
──────────────────────────────────────────────────────────────── */

function SiloIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none"
      xmlns="http://www.w3.org/2000/svg" className="text-[#2d5a1b]" aria-hidden="true">
      <rect x="4" y="16" width="14" height="26" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 16 Q11 10 18 16" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="7" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="27" x2="15" y2="27" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="32" x2="15" y2="32" stroke="currentColor" strokeWidth="1.5" />
      <rect x="20" y="10" width="18" height="32" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M20 10 Q29 3 38 10" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="24" y1="17" x2="34" y2="17" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="23" x2="34" y2="23" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="29" x2="34" y2="29" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="35" x2="34" y2="35" stroke="currentColor" strokeWidth="1.5" />
      <rect x="38" y="28" width="6" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function riskColor(level: string) {
  switch (level) {
    case "critical": return "#ef4444";
    case "high":     return "#f97316";
    case "moderate": return "#f59e0b";
    default:         return "#2FAC0C";
  }
}

interface SiloCardItem {
  id: string;
  name: string;
  grain?: string;
  score: number;
  level: string;
  quantity_kg: number;
  // Extended fields
  temperature?: number | null;
  humidity?: number | null;
  moisture?: number | null;
  co2?: number | null;
  last_reading_at?: string | null;
  confidence?: number | null;
  capacity_kg?: number | null;
  current_occupancy_kg?: number | null;
  status?: string | null;
  factors?: string[];
}

// ── Compact popup dialog with silo info + RAG recommendation ─────────────────
function SiloDetailDialog({ silo, open, onClose }: {
  silo: SiloCardItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const fetchRec = useServerFn(getSiloRecommendation);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["silo-recommendation", silo?.id ?? "none"],
    queryFn: () =>
      fetchRec({
        data: {
          siloId:    silo!.id,
          siloName:  silo!.name,
          grainType: silo!.grain ?? null,
          riskLevel: silo!.level,
          riskScore: silo!.score,
        },
      }),
    enabled: open && !!silo,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (!silo) return null;

  const cleanRec = data?.recommendation
    ?.replace(/\u2014/g, "-").replace(/\u2013/g, "-").replace(/—/g, "-");
  const source = data?.source;

  const utilization = silo.capacity_kg && silo.current_occupancy_kg
    ? Math.round((silo.current_occupancy_kg / silo.capacity_kg) * 100)
    : null;

  const lastRead = silo.last_reading_at
    ? new Date(silo.last_reading_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
    : null;

  const confidencePct = silo.confidence != null ? Math.round(silo.confidence * 100) : null;

  // helper
  const InfoRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: color ?? "#1e293b" }}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-full p-0 overflow-hidden rounded-2xl gap-0">

        {/* Green header */}
        <DialogHeader className="p-0">
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#d4f0a0" }}>
            <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(255,255,255,0.5)" }}>
              <SiloIcon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-bold" style={{ color: "#2d5a1b" }}>{silo.name}</DialogTitle>
              <DialogDescription className="text-[10px]" style={{ color: "#3a6b28" }}>
                {silo.grain ? `${silo.grain} · ` : ""}{silo.status ?? "active"} · {silo.quantity_kg.toLocaleString()} kg
              </DialogDescription>
            </div>
            {silo.last_reading_at && (
              <span style={{ fontSize: "9px", color: "#3a6b28", background: "rgba(255,255,255,0.4)",
                padding: "2px 6px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                {lastRead}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", maxHeight: "70vh", background: "#ffffff", padding: "16px" }}>

          {/* ── Risk score ── */}
          <section style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>Risk Score</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px", fontWeight: 900, color: riskColor(silo.level) }}>{silo.score}%</span>
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", textTransform: "capitalize",
                  background: `${riskColor(silo.level)}15`, color: riskColor(silo.level), border: `1px solid ${riskColor(silo.level)}30` }}>
                  {silo.level}
                </span>
              </div>
            </div>
            <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "6px", width: `${silo.score}%`, background: riskColor(silo.level), borderRadius: "3px", transition: "width 0.6s" }} />
            </div>
            {confidencePct != null && (
              <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                Confidence: {confidencePct}% ({confidencePct >= 80 ? "ML model" : "heuristic estimate"})
              </p>
            )}
          </section>

          {/* ── Risk Factors ── */}
          {silo.factors && silo.factors.length > 0 && (
            <section style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Risk Factors</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {silo.factors.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px",
                    background: `${riskColor(silo.level)}08`, border: `1px solid ${riskColor(silo.level)}20`,
                    borderRadius: "8px", padding: "6px 10px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: riskColor(silo.level), flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "#334155" }}>{f}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Current Conditions ── */}
          {(silo.temperature != null || silo.humidity != null || silo.moisture != null || silo.co2 != null) && (
            <section style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Current Conditions</p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "4px 12px" }}>
                {silo.temperature != null && <InfoRow label="Temperature" value={`${silo.temperature.toFixed(1)} °C`} color={silo.temperature > 28 ? "#f97316" : "#1e293b"} />}
                {silo.humidity != null    && <InfoRow label="Humidity"    value={`${silo.humidity.toFixed(0)} %`}    color={silo.humidity > 70 ? "#f97316" : "#1e293b"} />}
                {silo.moisture != null    && <InfoRow label="Moisture"    value={`${silo.moisture.toFixed(1)} %`}    color={silo.moisture > 14 ? "#ef4444" : "#1e293b"} />}
                {silo.co2 != null         && <InfoRow label="CO₂"         value={`${silo.co2.toFixed(0)} ppm`}       color={silo.co2 > 1500 ? "#ef4444" : silo.co2 > 800 ? "#f97316" : "#1e293b"} />}
              </div>
            </section>
          )}

          {/* ── Storage Info ── */}
          <section style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Storage Info</p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "4px 12px" }}>
              <InfoRow label="Grain Type"  value={silo.grain ?? "Not set"} />
              <InfoRow label="Quantity"    value={`${silo.quantity_kg.toLocaleString()} kg`} />
              {utilization != null && (
                <>
                  <InfoRow label="Capacity"    value={`${silo.capacity_kg?.toLocaleString()} kg`} />
                  <InfoRow label="Utilization" value={`${utilization}%`} color={utilization > 90 ? "#f97316" : "#1e293b"} />
                </>
              )}
              <InfoRow label="Status"      value={silo.status ?? "active"} />
              {lastRead && <InfoRow label="Last Reading" value={lastRead} />}
            </div>
          </section>

          {/* ── AI Recommendation ── */}
          <section>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Sparkles style={{ width: "13px", height: "13px", color: "#2FAC0C", flexShrink: 0 }} />
                <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", flex: 1 }}>AI Recommendation</p>
                {source === "rag"     && <span style={{ fontSize: "8px", background: "#dcfce7", color: "#166534", borderRadius: "4px", padding: "1px 6px" }}>live rag</span>}
                {source === "offline" && <WifiOff style={{ width: "11px", height: "11px", color: "#94a3b8" }} />}
              </div>

              {isFetching && !cleanRec && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[1, 0.85, 0.7].map((w, i) => (
                    <div key={i} className="animate-pulse" style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", width: `${w * 100}%` }} />
                  ))}
                </div>
              )}
              {isError && !isFetching && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "12px", color: "#ef4444" }}>Failed to load recommendation.</p>
                  <button onClick={() => refetch()} style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <RotateCcw style={{ width: "12px", height: "12px" }} /> Retry
                  </button>
                </div>
              )}
              {cleanRec && !isFetching && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cleanRec.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0)
                    .map((line: string, i: number) => {
                      const isStep = /^\d+\./.test(line);
                      const stepNum = isStep ? line.match(/^(\d+)\./)?.[1] : null;
                      const text = isStep ? line.replace(/^\d+\.\s*/, "") : line;
                      return (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          {stepNum && (
                            <span style={{ flexShrink: 0, width: "18px", height: "18px", borderRadius: "50%",
                              background: "#2d5a1b", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "8px", fontWeight: 700, color: "#fff", marginTop: "1px" }}>{stepNum}</span>
                          )}
                          <p style={{ fontSize: "13px", lineHeight: "1.55", color: "#1e293b", flex: 1 }}>{text}</p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Compact clickable card ─────────────────────────────────────────────────────
function SiloCard({ silo, onClick }: { silo: SiloCardItem; onClick: () => void }) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow select-none"
      style={{ background: "#ffffff" }}
      onClick={onClick}
      role="button"
      aria-label={`Open details for ${silo.name}`}
    >
      {/* Green header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "#d4f0a0" }}>
        <span className="font-semibold text-sm" style={{ color: "#2d5a1b" }}>{silo.name}</span>
        <SiloIcon />
      </div>

      {/* Recommendation preview box */}
      <div className="px-4 py-3" style={{ background: "#ffffff" }}>
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px",
          padding: "10px", height: "88px", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Label */}
          <div className="flex items-center gap-1.5 shrink-0" style={{ marginBottom: "6px" }}>
            <Sparkles style={{ width: "11px", height: "11px", color: "#2FAC0C", flexShrink: 0 }} />
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#475569", flex: 1 }}>
              AI Recommendation
            </p>
            <span style={{ fontSize: "9px", color: "#94a3b8" }}>click for details</span>
          </div>
          {/* Skeleton preview lines */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", justifyContent: "center" }}>
            <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px" }} />
            <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", width: "80%" }} />
            <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", width: "60%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────
interface SiloFlashCardsProps {
  predictions: any[];
}

function SiloFlashCards({ predictions }: SiloFlashCardsProps) {
  const [selected, setSelected] = useState<SiloCardItem | null>(null);

  const items: SiloCardItem[] = predictions.length > 0
    ? predictions.slice(0, 6).map((p) => ({
        id:                   p.id,
        name:                 p.name ?? p.silo_id,
        grain:                p.grain_type as string | undefined,
        score:                p.score       as number,
        level:                p.level       as string,
        quantity_kg:          p.quantity_kg as number,
        temperature:          p.temperature ?? null,
        humidity:             p.humidity    ?? null,
        moisture:             p.moisture    ?? null,
        co2:                  p.co2         ?? null,
        last_reading_at:      p.last_reading_at ?? null,
        confidence:           p.confidence  ?? null,
        capacity_kg:          p.capacity_kg ?? null,
        current_occupancy_kg: p.current_occupancy_kg ?? null,
        status:               p.status      ?? null,
        factors:              Array.isArray(p.factors) ? p.factors : [],
      }))
    : [
        { id: "preview-1", name: "Silo 1", grain: "Wheat",  score: 28, level: "low",      quantity_kg: 12400,
          temperature: 22.5, humidity: 58, moisture: 12.8, co2: 480,
          last_reading_at: new Date(Date.now() - 3600000).toISOString(),
          confidence: 0.85, capacity_kg: 20000, current_occupancy_kg: 12400,
          status: "active", factors: ["Moisture 12.8% borderline"] },
        { id: "preview-2", name: "Silo 2", grain: "Maize",  score: 62, level: "moderate", quantity_kg: 8750,
          temperature: 28.1, humidity: 67, moisture: 14.2, co2: 920,
          last_reading_at: new Date(Date.now() - 7200000).toISOString(),
          confidence: 0.85, capacity_kg: 15000, current_occupancy_kg: 8750,
          status: "active", factors: ["High temp 28.1°C", "Moisture 14.2% above safe"] },
        { id: "preview-3", name: "Silo 3", grain: "Barley", score: 85, level: "high",     quantity_kg: 5100,
          temperature: 31.4, humidity: 74, moisture: 15.8, co2: 1420,
          last_reading_at: new Date(Date.now() - 1800000).toISOString(),
          confidence: 0.85, capacity_kg: 10000, current_occupancy_kg: 5100,
          status: "active", factors: ["High temp 31.4°C", "High humidity 74%", "Moisture 15.8% above safe", "CO₂ 1420ppm"] },
      ];

  return (
    <>
      <div className="mt-2">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((silo) => (
            <SiloCard key={silo.id} silo={silo} onClick={() => setSelected(silo)} />
          ))}
        </div>
      </div>
      <SiloDetailDialog silo={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}
