import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  QrCode, PieChart, FileText, History, ThermometerSun, MapPin,
  ArrowUpRight, Plus, TrendingUp, ChevronRight, Activity, Wrench,
  AlertOctagon, Building2, Shield, DollarSign, Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";

// ============================================================================
// 1. DATA & TYPES
// ============================================================================

export function useDashboardStats() {
  return {
    data: {
      batches: { total: 142, active: 28 },
      silos: 12,
      buyers: 8,
      alerts: { open: 5, critical: 1 },
    },
  };
}

// ============================================================================
// 2. ANIMATED COUNT-UP
// ============================================================================

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

// ============================================================================
// 4. STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  to,
  trend,
  search,
}: {
  label: string;
  value: number;
  icon?: React.ElementType;
  accent: { bg: string; text: string; border: string; badge: string };
  to?: string;
  trend?: string;
  search?: Record<string, string>;
}) {
  const animated = useCountUp(value);

  const inner = (
    <div
      className={`group relative bg-card border border-border rounded-xl px-3 py-2.5 cursor-pointer overflow-hidden
        transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_20px_-12px_rgba(16,185,129,0.25)]`}
    >
      {Icon && <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-[28px] opacity-25 ${accent.bg}`} />}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase leading-none mb-1 truncate">{label}</p>
          <p className={`text-xl sm:text-2xl font-black tabular-nums leading-tight tracking-tight ${accent.text}`}>{animated}</p>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${accent.badge}`}>
              <TrendingUp className="w-2 h-2" />
              {trend}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${accent.bg}`}>
            <Icon className={`w-3 h-3 ${accent.text}`} />
          </div>
        )}
      </div>
      {to && (
        <p className="text-[10px] font-medium text-muted-foreground mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          View <ArrowUpRight className="w-2.5 h-2.5" />
        </p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to as never} search={search as never} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ============================================================================
// 5. SECTION HEADER
// ============================================================================

function SectionHeader({ title, description }: { title: string; description?: string; size?: "base" | "large" }) {
  return (
    <div className="mb-3">
      <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.15em]">{title}</h2>
      {description && <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>}
    </div>
  );
}

// ============================================================================
// 6. ACTION CARD
// ============================================================================

function ActionCard({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  to?: string;
}) {
  const inner = (
    <div className="group bg-card border border-border rounded-xl p-3 shadow-sm cursor-pointer flex items-center gap-3 h-full hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_20px_-12px_rgba(16,185,129,0.25)] transition-all duration-200">
      <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground leading-snug truncate">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-emerald-500 transition-colors duration-200 shrink-0" />
    </div>
  );

  if (to) {
    return (
      <Link to={to as never} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ============================================================================
// 7. VIEW BATCHES CARD
// ============================================================================

const BATCH_STATUS_OPTIONS = [
  { label: "Stored", value: "stored" },
  { label: "Damaged", value: "damaged" },
  { label: "On Hold", value: "on_hold" },
  { label: "Sold", value: "sold" },
] as const;

function ViewBatchesCard() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleSelect(status: string) {
    setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigate as any)({ to: "/grain-batches", search: { status } });
  }

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    (navigate as any)({ to: "/grain-batches" });
  }

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col gap-2 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_20px_-12px_rgba(16,185,129,0.25)] transition-all duration-200 cursor-pointer"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug">Batch & Dispatch Management</h3>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle batch status filter"
            aria-expanded={open}
            className={`w-5 h-5 flex items-center justify-center rounded-md border transition-all duration-200 flex-shrink-0 ${open
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
          >
            <Plus
              style={{ width: 12, height: 12 }}
              className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`}
            />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="dropdown"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="mt-2 rounded-lg border border-border overflow-hidden">
                {BATCH_STATUS_OPTIONS.map(({ label, value }, i) => (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-colors duration-150 flex items-center justify-between group/item ${i < BATCH_STATUS_OPTIONS.length - 1 ? "border-b border-border" : ""
                      }`}
                  >
                    <span>{label}</span>
                    <ChevronRight
                      style={{ width: 10, height: 10 }}
                      className="text-muted-foreground group-hover/item:text-emerald-500 transition-colors duration-150"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// 8. MAIN DASHBOARD
// ============================================================================

export function ManagerDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();

  const statCards = [
    {
      label: "Total Batches",
      value: s?.batches.total ?? 0,
      to: "/grain-batches",
      trend: "+4 this week",
      accent: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", badge: "bg-emerald-50 text-emerald-700" },
    },
    {
      label: "Active Batches",
      value: s?.batches.active ?? 0,
      to: "/grain-batches",
      trend: "In progress",
      accent: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100", badge: "bg-sky-50 text-sky-700" },
    },
    {
      label: "Silos",
      value: s?.silos ?? 0,
      to: "/silos",
      accent: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", badge: "bg-violet-50 text-violet-700" },
    },
    {
      label: "Buyers",
      value: s?.buyers ?? 0,
      to: "/buyers",
      accent: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", badge: "bg-blue-50 text-blue-700" },
    },
    {
      label: "Open Alerts",
      value: s?.alerts.open ?? 0,
      to: "/grain-alerts",
      accent: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", badge: "bg-rose-50 text-rose-700" },
    },
    {
      label: "Critical",
      value: s?.alerts.critical ?? 0,
      to: "/grain-alerts",
      search: { priority: "critical" },
      accent: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", badge: "bg-amber-50 text-amber-700" },
    },
  ];

  return (
    <AdminPageShell
      title={`Manager${name ? ` — ${name}` : ""}`}
      subtitle="Operations, inventory, logistics and health at a glance"
      actions={<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Manager</Badge>}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {statCards.map((sc) => (
          <StatCard key={sc.label} {...sc} />
        ))}
      </div>

      {/* Overview & Analytics */}
      <div>
        <SectionHeader title="Jump to insights" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Container 1: Operations */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.0, ease: "easeOut" }}
              className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 shadow-sm"
            >
              <h3 className="text-sm font-black text-foreground px-1">Operations</h3>
              <div className="grid grid-cols-1 gap-2 flex-1">
                <ViewBatchesCard />
                <ActionCard
                  icon={Wrench}
                  title="Maintenance Requests"
                  to="/maintenance"
                />
                <ActionCard
                  icon={AlertOctagon}
                  title="Report Incident"
                  to="/incidents"
                />
                <ActionCard
                  icon={Building2}
                  title="Warehouse Management"
                  to="/warehouses"
                />
              </div>
            </motion.div>

            {/* Container 2: Inventory & Storage */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 shadow-sm"
            >
              <h3 className="text-sm font-black text-foreground px-1">Inventory & Storage</h3>
              <div className="grid grid-cols-1 gap-2 flex-1">
                <ActionCard
                  icon={ThermometerSun}
                  title="Environmental Conditions"
                  to="/environmental"
                />
                <ActionCard
                  icon={PieChart}
                  title="Storage Analytics"
                  to="/data-visualization"
                />
                <ActionCard
                  icon={FileText}
                  title="Storage Reports"
                  to="/reports"
                />
                <ActionCard
                  icon={History}
                  title="Sensor Activity Audit Logs"
                  to="/activity-logs"
                />
              </div>
            </motion.div>

            {/* Container 3: Logistics */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 shadow-sm"
            >
              <h3 className="text-sm font-black text-foreground px-1">Logistics</h3>
              <div className="grid grid-cols-1 gap-2 flex-1">
                <ActionCard
                  icon={MapPin}
                  title="Track Buyer Shipments"
                  to="/buyers"
                />
                <ActionCard
                  icon={QrCode}
                  title="Dispatch Traceability"
                  to="/traceability"
                />
                <ActionCard
                  icon={Shield}
                  title="Transit & Crop Insurance"
                  to="/insurance"
                />
                <ActionCard
                  icon={Bell}
                  title="Logistics Notifications"
                  to="/notifications"
                />
              </div>
            </motion.div>

            {/* Container 4: System & Financial Health */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 shadow-sm"
            >
              <h3 className="text-sm font-black text-foreground px-1">System & Financial Health</h3>
              <div className="grid grid-cols-1 gap-2 flex-1">
                <ActionCard
                  icon={Activity}
                  title="System Health"
                  to="/server-monitoring"
                />
                <ActionCard
                  icon={DollarSign}
                  title="Financial Revenue"
                  to="/revenue"
                />
              </div>
            </motion.div>
        </div>
      </div>
    </AdminPageShell>
  );
}
