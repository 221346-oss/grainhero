import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BatchesSection } from "@/components/grain-operations/BatchesSection";
import { SilosSection } from "@/components/grain-operations/SilosSection";
import { WarehousesSection } from "@/components/grain-operations/WarehousesSection";
import { BuyersSection } from "@/components/grain-operations/BuyersSection";
import { Package, Warehouse, Building2, Users, TrendingUp, TrendingDown } from "lucide-react";
import { listGrainBatches, listSilos, listWarehouses, listBuyers } from "@/lib/operations.functions";

type Tab = "batches" | "silos" | "warehouses" | "buyers";

const TAB_KEYS: Tab[] = ["batches", "silos", "warehouses", "buyers"];

// `status` is genuinely optional here (not just runtime-undefined) so every
// other page that links to /grain-operations?tab=... without a status
// param still type-checks.
type GrainOpsSearch = { tab: Tab; status?: string };

export const Route = createFileRoute("/_authenticated/grain-operations")({
  validateSearch: (search: Record<string, unknown>): GrainOpsSearch => ({
    tab: (TAB_KEYS as string[]).includes(search.tab as string) ? (search.tab as Tab) : "batches",
    // Optional deep-link filter for the Batches tab (e.g. the global search
    // bar sending "spoiled batches" straight to ?tab=batches&status=damaged).
    ...(typeof search.status === "string" ? { status: search.status } : {}),
  }),
  component: GrainOperationsWorkspace,
});

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "batches",    label: "Grain Batches", icon: Package   },
  { key: "silos",      label: "Silos",         icon: Warehouse },
  { key: "warehouses", label: "Warehouses",    icon: Building2 },
  { key: "buyers",     label: "Buyers",        icon: Users     },
];

const BAR_COLORS = Array.from({ length: 12 }, () => "from-primary/70 to-primary");

function GrainOperationsWorkspace() {
  const { tab, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [activeTab, setActiveTabState] = useState<Tab>(tab);

  useEffect(() => {
    setActiveTabState(tab);
  }, [tab]);

  function setActiveTab(next: Tab) {
    setActiveTabState(next);
    navigate({ search: { tab: next } });
  }

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
      className="min-h-screen bg-background p-4 md:p-8 bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px)] [background-size:28px_28px]"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            <VariableFontText text="Grain Operations" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage batches, silos, warehouses, and buyers from one workspace
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Operations Overview
            </p>
            <div className="space-y-4">
              {TABS.map((tab, i) => {
                const count = counts[tab.key];
                const pct   = Math.max((count / maxCount) * 100, count > 0 ? 4 : 0);
                return (
                  <div key={tab.key} className="flex items-center gap-4">
                    <span className="w-24 text-xs text-muted-foreground font-mono truncate text-right shrink-0">
                      {tab.label.split(" ")[0]}…
                    </span>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
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
                    <span className="w-8 text-right text-xs text-foreground/70 font-mono shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
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
                      ? <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
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
                        isActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
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
            {activeTab === "batches"    && <BatchesSection initialStatus={status} />}
            {activeTab === "silos"      && <SilosSection />}
            {activeTab === "warehouses" && <WarehousesSection />}
            {activeTab === "buyers"     && <BuyersSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
