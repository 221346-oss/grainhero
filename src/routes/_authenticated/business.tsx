import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { RevenueSection } from "@/components/business/RevenueSection";
import { SubscriptionSection } from "@/components/business/SubscriptionSection";
import { InsuranceSection } from "@/components/business/InsuranceSection";
import { Wallet, CreditCard, Shield, TrendingUp, TrendingDown } from "lucide-react";
import { getRevenueOverview, getMySubscription } from "@/lib/billing.functions";
import { listPolicies, listClaims } from "@/lib/team-settings-insurance.functions";

export const Route = createFileRoute("/_authenticated/business")({
  component: BusinessWorkspace,
});

type Tab = "revenue" | "subscription" | "insurance";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "revenue",      label: "Revenue",      icon: Wallet },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "insurance",    label: "Insurance",    icon: Shield },
];

const BAR_COLORS = [
  "from-[#10b981] to-[#34d399]",   // emerald
  "from-[#6366f1] to-[#818cf8]",   // indigo
  "from-[#f59e0b] to-[#fbbf24]",   // amber
];

function money(n: number) {
  return `PKR ${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function BusinessWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");

  const fetchRevenue = useServerFn(getRevenueOverview);
  const fetchSub = useServerFn(getMySubscription);
  const fetchPolicies = useServerFn(listPolicies);
  const fetchClaims = useServerFn(listClaims);

  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: () => fetchRevenue() });
  const { data: mySub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => fetchSub() });
  const { data: policies } = useQuery({ queryKey: ["insurance-policies"], queryFn: () => fetchPolicies() });
  const { data: claims } = useQuery({ queryKey: ["insurance-claims"], queryFn: () => fetchClaims() });

  const totals = revenue?.totals ?? { invoiced: 0, paid: 0, outstanding: 0, overdue: 0, countInvoices: 0 };
  const sub = mySub?.subscription;
  const policyList = (policies ?? []) as any[];
  const claimList = (claims ?? []) as any[];
  const activePolicies = policyList.filter((p) => p.status === "active").length;
  const totalCoverage = policyList.reduce((s, p) => s + (p.coverage_amount ?? 0), 0);
  const openClaims = claimList.filter((c) => c.status !== "paid" && c.status !== "rejected").length;

  const counts = {
    revenue: totals.countInvoices ?? 0,
    subscription: sub ? 1 : 0,
    insurance: policyList.length,
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    { label: "Collected", value: money(totals.paid), up: true },
    { label: "Outstanding", value: money(totals.outstanding), up: false },
    { label: "Coverage", value: money(totalCoverage), up: true },
    { label: "Open Claims", value: openClaims, up: openClaims === 0 },
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
            <VariableFontText text="Business" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, subscription, insurance and plan management
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/8 rounded-2xl p-6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              Business Overview
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
                        style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(16,185,129,0.3)" }}
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
                <div key={s.label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-white/50 text-sm font-mono">
                    <span className="text-white/30">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-black text-sm font-mono">{s.value}</span>
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
                        layoutId="business-tab-underline"
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
            {activeTab === "revenue" && <RevenueSection />}
            {activeTab === "subscription" && <SubscriptionSection />}
            {activeTab === "insurance" && <InsuranceSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
