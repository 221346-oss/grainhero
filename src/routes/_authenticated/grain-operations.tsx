import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BatchesSection } from "@/components/grain-operations/BatchesSection";
import { SilosSection } from "@/components/grain-operations/SilosSection";
import { WarehousesSection } from "@/components/grain-operations/WarehousesSection";
import { BuyersSection } from "@/components/grain-operations/BuyersSection";
import { Package, Warehouse, Building2, Users, TrendingUp, TrendingDown } from "lucide-react";
import { listGrainBatches, listSilos, listWarehouses, listBuyers } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/grain-operations")({
  component: GrainOperationsWorkspace,
});

type Tab = "batches" | "silos" | "warehouses" | "buyers";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "batches",    label: "Grain Batches", icon: Package   },
  { key: "silos",      label: "Silos",         icon: Warehouse },
  { key: "warehouses", label: "Warehouses",    icon: Building2 },
  { key: "buyers",     label: "Buyers",        icon: Users     },
];

const BAR_COLORS = [
  "from-[#6366f1] to-[#818cf8]",   // indigo
  "from-[#06b6d4] to-[#22d3ee]",   // cyan/teal
  "from-[#10b981] to-[#34d399]",   // emerald
  "from-[#a855f7] to-[#c084fc]",   // purple
];

function GrainOperationsWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("batches");

  const listBatchesFn   = useServerFn(listGrainBatches);
  const listSilosFn     = useServerFn(listSilos);
  const listWarehousesFn = useServerFn(listWarehouses);
  const listBuyersFn    = useServerFn(listBuyers);

  const { data: batches }    = useQuery({ queryKey: ["grain-batches"], queryFn: () => listBatchesFn() });
  const { data: silos }      = useQuery({ queryKey: ["silos"],         queryFn: () => listSilosFn() });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"],    queryFn: () => listWarehousesFn() });
  const { data: buyers }     = useQuery({ queryKey: ["buyers"],        queryFn: () => listBuyersFn() });

  const counts = {
    batches:    Array.isArray(batches)    ? batches.length    : 0,
    silos:      Array.isArray(silos)      ? silos.length      : 0,
    warehouses: Array.isArray(warehouses) ? warehouses.length : 0,
    buyers:     Array.isArray(buyers)     ? buyers.length     : 0,
  };

  const activeSilos  = Array.isArray(silos) ? silos.filter((s: { status?: string | null }) => s.status === "active").length : 0;
  const totalKg      = Array.isArray(batches) ? (batches as { quantity_kg?: number }[]).reduce((a, b) => a + (b.quantity_kg ?? 0), 0) : 0;
  const dispatchedKg = Array.isArray(batches) ? (batches as { dispatched_quantity_kg?: number }[]).reduce((a, b) => a + (b.dispatched_quantity_kg ?? 0), 0) : 0;

  const maxCount = Math.max(counts.batches, counts.silos, counts.warehouses, counts.buyers, 1);

  const stats = [
    { label: "Total Grain (kg)", value: totalKg.toLocaleString(), up: true  },
    { label: "Active Silos",     value: activeSilos.toString(),   up: true  },
    { label: "Dispatched (kg)",  value: dispatchedKg.toLocaleString(), up: false },
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
            <VariableFontText text="Grain Operations" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Manage batches, silos, warehouses, and buyers from one workspace
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/8 rounded-2xl p-6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              Operations Overview
            </p>
            <div className="space-y-4">
              {TABS.map((tab, i) => {
                const count = counts[tab.key];
                const pct   = Math.max((count / maxCount) * 100, count > 0 ? 4 : 0);
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
                      {/* dot grid overlay */}
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
                        s.up ? "bg-rose-500/20" : "bg-emerald-500/20"
                      }`}
                    >
                      {s.up
                        ? <TrendingUp  className="w-3.5 h-3.5 text-rose-400" />
                        : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
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
                        layoutId="grain-ops-tab-underline"
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
            {activeTab === "batches"    && <BatchesSection />}
            {activeTab === "silos"      && <SilosSection />}
            {activeTab === "warehouses" && <WarehousesSection />}
            {activeTab === "buyers"     && <BuyersSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
