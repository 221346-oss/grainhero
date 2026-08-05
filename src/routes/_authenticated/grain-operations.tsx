import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { VariableFontText } from "@/components/app/VariableFontText";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";
import { BatchesSection } from "@/components/grain-operations/BatchesSection";
import { SilosSection } from "@/components/grain-operations/SilosSection";
import { WarehousesSection } from "@/components/grain-operations/WarehousesSection";
import { BuyersSection } from "@/components/grain-operations/BuyersSection";
import { PendingApprovalsSection } from "@/components/grain-operations/PendingApprovalsSection";
import { Package, Warehouse, Building2, Users, TrendingUp, TrendingDown } from "lucide-react";
import {
  listGrainBatches,
  listSilos,
  listWarehouses,
  listBuyers,
} from "@/lib/operations.functions";
import { getMyRole } from "@/lib/roles.functions";
import { SiloStatusPie, type StatusSlice } from "@/components/grain-operations/SiloStatusPie";
import { type FlowGroup } from "@/components/grain-operations/SiloFlowDiagram";
import { BATCH_TONE } from "@/components/grain-operations/SiloOperationsCard";
import { listPendingApprovalBatches } from "@/lib/batch-qc.functions";

type Tab = "batches" | "silos" | "warehouses" | "buyers";

const TAB_KEYS: Tab[] = ["batches", "silos", "warehouses", "buyers"];

// `status` is genuinely optional here (not just runtime-undefined) so every
// other page that links to /grain-operations?tab=... without a status
// param still type-checks.
type GrainOpsSearch = { tab: Tab; status?: string };

export const Route = createFileRoute("/_authenticated/grain-operations")({
  head: () => ({
    meta: [
      { title: "Grain Operations — Grain Hero" },
      { name: "description", content: "Grain Operations workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Grain Operations — Grain Hero" },
      { property: "og:description", content: "Grain Operations workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): GrainOpsSearch => ({
    tab: (TAB_KEYS as string[]).includes(search.tab as string) ? (search.tab as Tab) : "silos",
    // Optional deep-link filter for the Batches tab (e.g. the global search
    // bar sending "spoiled batches" straight to ?tab=batches&status=damaged).
    ...(typeof search.status === "string" ? { status: search.status } : {}),
  }),
  component: GrainOperationsWorkspace,
});

const ALL_TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "batches", label: "Grain Batches", icon: Package },
  { key: "silos", label: "Silos", icon: Warehouse },
  { key: "warehouses", label: "Warehouses", icon: Building2 },
  { key: "buyers", label: "Buyers", icon: Users },
];

function GrainOperationsWorkspace() {
  const { tab, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [activeTab, setActiveTabState] = useState<Tab>(tab);

  // Fetch user role to determine which tabs to show
  const roleFn = useServerFn(getMyRole);
  const { data: roleData } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => roleFn(),
  });
  const userRole = roleData?.role ?? "pending";

  // Filter tabs based on role - managers can view warehouses but cannot create them
  const TABS = ALL_TABS;

  useEffect(() => {
    setActiveTabState(tab);
  }, [tab]);

  function setActiveTab(next: Tab) {
    setActiveTabState(next);
    navigate({ search: { tab: next } });
  }

  const listBatchesFn = useServerFn(listGrainBatches);
  const listSilosFn = useServerFn(listSilos);
  const listWarehousesFn = useServerFn(listWarehouses);
  const listBuyersFn = useServerFn(listBuyers);
  const listPendingApprovalsFn = useServerFn(listPendingApprovalBatches);

  const { data: batches } = useQuery({
    queryKey: ["grain-batches"],
    queryFn: () => listBatchesFn(),
  });
  const { data: silos } = useQuery({ queryKey: ["silos"], queryFn: () => listSilosFn() });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehousesFn(),
  });
  const { data: buyers } = useQuery({ queryKey: ["buyers"], queryFn: () => listBuyersFn() });

  // Fetch pending approvals for admins
  const isAdmin = ["super_admin", "admin"].includes(userRole);
  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approval-batches"],
    queryFn: () => listPendingApprovalsFn(),
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingCount = pendingApprovals?.batches?.length ?? 0;

  const counts = {
    batches: Array.isArray(batches) ? batches.length : 0,
    silos: Array.isArray(silos) ? silos.length : 0,
    warehouses: Array.isArray(warehouses) ? warehouses.length : 0,
    buyers: Array.isArray(buyers) ? buyers.length : 0,
  };

  const activeSilos = Array.isArray(silos)
    ? silos.filter((s: { status?: string | null }) => s.status === "active").length
    : 0;
  const totalKg = Array.isArray(batches)
    ? (batches as { quantity_kg?: number }[]).reduce((a, b) => a + (b.quantity_kg ?? 0), 0)
    : 0;
  const dispatchedKg = Array.isArray(batches)
    ? (batches as { dispatched_quantity_kg?: number }[]).reduce(
        (a, b) => a + (b.dispatched_quantity_kg ?? 0),
        0,
      )
    : 0;

  // Batch status breakdown across every silo — same yellow/green/red tone
  // mapping used on each silo card, just aggregated for the bird's-eye view.
  const statusPieData: StatusSlice[] = (() => {
    const byTone: Record<FlowGroup["tone"], number> = { yellow: 0, green: 0, red: 0 };
    if (Array.isArray(batches)) {
      for (const b of batches as Array<{ status?: string | null }>) {
        byTone[BATCH_TONE[String(b.status ?? "")] ?? "yellow"] += 1;
      }
    }
    const labels: Record<FlowGroup["tone"], string> = {
      yellow: "In progress",
      green: "Stored",
      red: "Rejected/error",
    };
    return (["yellow", "green", "red"] as const)
      .filter((t) => byTone[t] > 0)
      .map((t) => ({ name: labels[t], value: byTone[t], tone: t }));
  })();

  const stats = [
    { label: "Total Grain (kg)", value: totalKg.toLocaleString(), up: true },
    { label: "Active Silos", value: activeSilos.toString(), up: true },
    { label: "Dispatched (kg)", value: dispatchedKg.toLocaleString(), up: false },
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

        {/* Pending Approvals Section - Only for Admins */}
        {isAdmin && pendingCount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6">
            <PendingApprovalsSection />
          </div>
        )}

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Batch status breakdown — pie chart, replacing the old plain bar list */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Batch Status Breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
              <SiloStatusPie data={statusPieData} />
              <div className="flex sm:flex-col gap-3 sm:gap-1.5 flex-wrap">
                {TABS.map((tab) => (
                  <div key={tab.key} className="flex items-center gap-2 text-xs">
                    <tab.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{tab.label}</span>
                    <span className="font-mono font-semibold text-foreground">
                      {counts[tab.key]}
                    </span>
                  </div>
                ))}
              </div>
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
                    <span className="text-foreground font-black text-base font-mono">
                      {s.value}
                    </span>
                    {s.up ? (
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
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
                    <VariableFontText
                      text={tab.label}
                      base={isActive ? 850 : 350}
                      hover={850}
                      staggerMs={30}
                    />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
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
            {activeTab === "batches" && <BatchesSection initialStatus={status} />}
            {activeTab === "silos" && <SilosSection />}
            {activeTab === "warehouses" && <WarehousesSection />}
            {activeTab === "buyers" && <BuyersSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
