import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { PredictionsSection } from "@/components/intelligence/PredictionsSection";
import { AnalyticsSection } from "@/components/intelligence/AnalyticsSection";
import { MLModelsSection } from "@/components/intelligence/MLModelsSection";
import { ReportsSection } from "@/components/intelligence/ReportsSection";
import { Brain, BarChart3, Cpu, FileBarChart, TrendingUp, TrendingDown } from "lucide-react";
import { getBatchPredictions, getAnalyticsOverview, getMLModels } from "@/lib/analytics.functions";
import { getReportsData } from "@/lib/monitoring.functions";
import { getMyRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/intelligence")({
  component: IntelligenceWorkspace,
});

type Tab = "predictions" | "analytics" | "ml-models" | "reports";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "predictions", label: "AI Predictions", icon: Brain },
  { key: "analytics",   label: "Analytics",      icon: BarChart3 },
  { key: "ml-models",   label: "ML Models",      icon: Cpu },
  { key: "reports",     label: "Reports",        icon: FileBarChart },
];

const BAR_COLORS = [
  "from-[#6366f1] to-[#818cf8]",   // indigo
  "from-[#10b981] to-[#34d399]",   // emerald
  "from-[#a855f7] to-[#c084fc]",   // purple
  "from-[#f59e0b] to-[#fbbf24]",   // amber
];

function IntelligenceWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("predictions");

  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const isSuperAdmin = role === "super_admin";
  const allowedAnalytics = ["super_admin", "admin", "manager"].includes(role);
  const allowedModels = ["super_admin", "admin"].includes(role);

  const fetchPredictions = useServerFn(getBatchPredictions);
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
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            <VariableFontText text="Intelligence" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-white/40">
            AI predictions, analytics, model performance and reports
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/8 rounded-2xl p-6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              Intelligence Overview
            </p>
            <div className="space-y-4">
              {TABS.map((tab, i) => {
                const count = counts[tab.key];
                const pct = Math.max((count / maxCount) * 100, count > 0 ? 4 : 0);
                return (
                  <div key={tab.key} className="flex items-center gap-4">
                    <span className="w-24 text-xs text-white/50 font-mono truncate text-right shrink-0">
                      {tab.label.split(" ")[0]}…
                    </span>
                    <div className="flex-1 h-8 bg-white/5 rounded-md overflow-hidden relative">
                      <div
                        className={`h-full rounded-md bg-gradient-to-r ${BAR_COLORS[i]} transition-all duration-700`}
                        style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                          backgroundSize: "8px 8px",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-white/60 font-mono shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[#111111] border border-white/8 rounded-2xl p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
              Key Metrics
            </p>
            <div className="space-y-0 divide-y divide-white/8 flex-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2 text-white/50 text-sm font-mono">
                    <span className="text-white/30">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-black text-base font-mono">{s.value}</span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        s.up ? "bg-emerald-500/20" : "bg-rose-500/20"
                      }`}
                    >
                      {s.up
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="bg-[#111111] border border-white/8 rounded-2xl overflow-hidden">

          {/* Tab Bar — variable-font hover nav */}
          <div className="border-b border-white/8 px-4 md:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <VariableFontText text={tab.label} base={isActive ? 850 : 350} hover={850} staggerMs={30} />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive ? "bg-[#006400]/30 text-[#7ccd7c]" : "bg-white/5 text-white/30"
                      }`}
                    >
                      {counts[tab.key]}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="intelligence-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2FAC0C]"
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
