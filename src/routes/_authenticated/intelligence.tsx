import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { PredictionsSection } from "@/components/intelligence/PredictionsSection";
import { AnalyticsSection } from "@/components/intelligence/AnalyticsSection";
import { MLModelsSection } from "@/components/intelligence/MLModelsSection";
import { ReportsSection } from "@/components/intelligence/ReportsSection";
import { Brain, BarChart3, Cpu, FileBarChart, TrendingUp, TrendingDown } from "lucide-react";
import { getSiloPredictions, getAnalyticsOverview, getMLModels } from "@/lib/analytics.functions";
import { getReportsData } from "@/lib/monitoring.functions";
import { getMyRole } from "@/lib/roles.functions";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({
    meta: [
      { title: "Intelligence — Grain Hero" },
      { name: "description", content: "Intelligence workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Intelligence — Grain Hero" },
      { property: "og:description", content: "Intelligence workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntelligenceWorkspace,
});

type Tab = "predictions" | "analytics" | "ml-models" | "reports";

const TABS: { key: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "predictions", label: "AI Predictions", icon: Brain },
  { key: "analytics",   label: "Analytics",      icon: BarChart3 },
  { key: "ml-models",   label: "ML Models",      icon: Cpu },
  { key: "reports",     label: "Reports",        icon: FileBarChart },
];

function IntelligenceWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("predictions");

  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const isSuperAdmin = role === "super_admin";
  const allowedAnalytics = ["super_admin", "admin", "manager"].includes(role);
  const allowedModels = ["super_admin", "admin"].includes(role);

  if (roleQ.isLoading) return <KpiChartHubSkeleton />;

  const fetchPredictions = useServerFn(getSiloPredictions);
  const fetchOverview = useServerFn(getAnalyticsOverview);
  const fetchModels = useServerFn(getMLModels);
  const fetchReports = useServerFn(getReportsData);

  const { data: predictions } = useQuery({
    queryKey: ["ai-predictions"],
    queryFn: () => fetchPredictions(),
    enabled: allowedAnalytics && !isSuperAdmin,
    refetchInterval: 60_000,
  });
  const { data: analytics } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => fetchOverview(),
    enabled: allowedAnalytics,
    refetchInterval: 60_000,
  });
  const { data: mlModels } = useQuery({
    queryKey: ["ml-models"],
    queryFn: () => fetchModels(),
    enabled: allowedModels,
  });
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports() });

  const preds = predictions?.predictions ?? [];
  const atRisk = preds.filter((p: any) => p.level === "critical" || p.level === "high").length;
  const avgRisk = preds.length ? Math.round(preds.reduce((s: number, p: any) => s + p.score, 0) / preds.length) : 0;
  const models = mlModels?.models ?? [];
  const productionModels = models.filter((m: any) => m.status === "production").length;

  const counts = {
    predictions: preds.length,
    analytics: analytics?.totals?.batches ?? 0,
    "ml-models": models.length,
    reports: reports?.batches?.length ?? 0,
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    { label: "At-Risk Batches", value: atRisk, up: false },
    { label: "Avg Risk Score", value: `${avgRisk}%`, up: avgRisk < 50 },
    { label: "Production Models", value: productionModels, up: true },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            <VariableFontText text="Intelligence" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI predictions, analytics, model performance and reports
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Intelligence Overview
            </p>
            <div className="space-y-1">
              {TABS.map((tab) => {
                const count = counts[tab.key];
                const pct = (count / maxCount) * 100;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="w-full flex items-center gap-4 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted group"
                    title={`${count} ${tab.label.toLowerCase()} — view ${tab.label}`}
                  >
                    <span className="w-36 flex items-center gap-2 text-sm text-foreground/80 shrink-0 group-hover:text-foreground transition-colors">
                      <Icon className="w-4 h-4 text-muted-foreground/60 group-hover:text-emerald-400 transition-colors shrink-0" />
                      {tab.label}
                    </span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                        style={{ width: count > 0 ? `${Math.max(pct, 3)}%` : "0%" }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold text-foreground tabular-nums shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground/60">
              Items per area — click a row to open it
            </p>
          </div>

          {/* Stats Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Key Metrics
            </p>
            <div className="space-y-0 divide-y divide-border flex-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                    <span className="text-muted-foreground/60">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-foreground font-black text-base font-mono">{s.value}</span>
                    {s.up
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* Tab Bar — variable-font hover nav */}
          <div className="border-b border-border px-4 md:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VariableFontText text={tab.label} base={isActive ? 850 : 350} hover={850} staggerMs={30} />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/60"
                      }`}
                    >
                      {counts[tab.key]}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="intelligence-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === "predictions" && <PredictionsSection />}
            {activeTab === "analytics" && <AnalyticsSection />}
            {activeTab === "ml-models" && <MLModelsSection />}
            {activeTab === "reports" && <ReportsSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
