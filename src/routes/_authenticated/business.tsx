import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { RevenueSection } from "@/components/business/RevenueSection";
import { RevenueChart } from "@/components/business/RevenueChart";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { getRevenueOverview } from "@/lib/billing.functions";
import { getMyRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "Business — Grain Hero" },
      { name: "description", content: "Business workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Business — Grain Hero" },
      { property: "og:description", content: "Business workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BusinessWorkspace,
});

type Tab = "revenue";

const TABS: { key: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "revenue", label: "Revenue", icon: Wallet },
];

const BAR_COLORS = Array.from({ length: 12 }, () => "from-primary/70 to-primary");

function money(n: number) {
  return `PKR ${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function BusinessWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");

  const fetchRevenue = useServerFn(getRevenueOverview);
  const fetchRole = useServerFn(getMyRole);

  const { data: revenue } = useQuery({ queryKey: ["revenue"], queryFn: () => fetchRevenue() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });

  const role = roleData?.role ?? "admin";

  const totals = revenue?.totals ?? { invoiced: 0, paid: 0, collected: 0, outstanding: 0, overdue: 0, countInvoices: 0 };

  const counts = {
    revenue: totals.countInvoices ?? 0,
  } satisfies Record<Tab, number>;

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    { label: "Collected",    value: money(totals.collected),    up: true  },
    { label: "Outstanding",  value: money(totals.outstanding),  up: false },
    { label: "Invoiced",     value: money(totals.invoiced),     up: true  },
    { label: "Overdue",      value: totals.overdue,             up: totals.overdue === 0 },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
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
            Revenue and financial overview
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Tracking Graph - Business Overview */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Business Overview
            </p>
            <RevenueChart 
              invoices={revenue?.invoices ?? []} 
              payments={revenue?.payments ?? []} 
            />
          </div>

          {/* Stats Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Key Metrics
            </p>
            <div className="space-y-0 divide-y divide-border flex-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                    <span className="text-muted-foreground/60">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-foreground font-black text-sm font-mono">{s.value}</span>
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

        {/* Revenue Section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* Tab Bar */}
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
                        layoutId="business-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6">
            {activeTab === "revenue" && <RevenueSection role={role} />}
          </div>
        </div>

      </div>
    </div>
  );
}
