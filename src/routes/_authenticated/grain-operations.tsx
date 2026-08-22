import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { VariableFontText } from "@/components/app/VariableFontText";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ComponentType } from "react";
import { BatchesSection } from "@/components/grain-operations/BatchesSection";
import { SilosSection } from "@/components/grain-operations/SilosSection";

import { BuyersSection } from "@/components/grain-operations/BuyersSection";
import { PendingApprovalsSection } from "@/components/grain-operations/PendingApprovalsSection";
import { Package, Warehouse, Users, TrendingUp, TrendingDown, Maximize2, Truck } from "lucide-react";
import {
  listGrainBatches,
  listSilos,
  listBuyers,
} from "@/lib/operations.functions";
import { getMyRole } from "@/lib/roles.functions";
import { SiloStatusPie, type StatusSlice } from "@/components/grain-operations/SiloStatusPie";
import { type FlowGroup } from "@/components/grain-operations/SiloFlowDiagram";
import { BATCH_TONE } from "@/components/grain-operations/SiloOperationsCard";
import { listPendingApprovalBatches } from "@/lib/batch-qc.functions";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";

type Tab = "batches" | "silos" | "buyers";

const TAB_KEYS: Tab[] = ["batches", "silos", "buyers"];

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
  const listBuyersFn = useServerFn(listBuyers);
  const listPendingApprovalsFn = useServerFn(listPendingApprovalBatches);

  const { data: batches } = useQuery({
    queryKey: ["grain-batches"],
    queryFn: () => listBatchesFn(),
  });
  const { data: silos } = useQuery({ queryKey: ["silos"], queryFn: () => listSilosFn() });
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

  // Batch status breakdown across every silo — same 6-stage tone mapping
  // used on each silo card, just aggregated for the bird's-eye view.
  const statusPieData: StatusSlice[] = (() => {
    const byTone: Record<FlowGroup["tone"], number> = {
      yellow: 0, orange: 0, green: 0, blue: 0, purple: 0, red: 0,
    };
    if (Array.isArray(batches)) {
      for (const b of batches as Array<{ status?: string | null }>) {
        byTone[BATCH_TONE[String(b.status ?? "")] ?? "yellow"] += 1;
      }
    }
    const labels: Record<FlowGroup["tone"], string> = {
      yellow: "Pending",
      orange: "QC",
      green: "Stored",
      blue: "Processing",
      purple: "Dispatched",
      red: "Issue",
    };
    return (["yellow", "orange", "green", "blue", "purple", "red"] as const)
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
            Manage batches, silos, and buyers from one workspace
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
          <div className="lg:col-span-2 bg-card border-border rounded-2xl p-6">
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

          {/* Key Metrics Panel */}
          <div className="bg-card border-border rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between relative h-full">
            <div className="flex justify-between items-start mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Key Metrics
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
                Last 12 Cycles
              </p>
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col justify-center mt-2">
              {/* Metric 1: Total Grain */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center w-[45%] min-w-[120px]">
                  <div className="truncate">
                    <p className="text-xs font-medium text-muted-foreground">Total Grain</p>
                    <p className="text-base font-black text-foreground truncate">{totalKg.toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                    {/* Placeholder static progress for demo */}
                    <div className="absolute left-0 top-0 bottom-0 bg-amber-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="text-right w-12 shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">0.0%</span>
                </div>
              </div>
              
              {/* Divider */}
              <div className="h-px w-full bg-border" />

              {/* Metric 2: Active Silos */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center w-[45%] min-w-[120px]">
                  <div className="truncate">
                    <p className="text-xs font-medium text-muted-foreground">Active Silos</p>
                    <p className="text-base font-black text-foreground truncate">{activeSilos} online</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="text-right w-12 shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">0.0%</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-border" />

              {/* Metric 3: Dispatched */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center w-[45%] min-w-[120px]">
                  <div className="truncate">
                    <p className="text-xs font-medium text-muted-foreground">Dispatched</p>
                    <p className="text-base font-black text-foreground truncate">{dispatchedKg.toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="text-right w-12 shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="bg-card border-border rounded-2xl overflow-hidden">
          {/* Tab Bar — variable-font hover nav */}
          <div className="border-b border-border/40 px-4 md:px-6 overflow-x-auto no-scrollbar">
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
            {activeTab === "buyers" && <BuyersSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
