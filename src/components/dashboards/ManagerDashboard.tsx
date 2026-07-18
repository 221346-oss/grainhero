import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Package, CheckCircle, CalendarClock, ArrowLeftRight, Award, QrCode,
  Warehouse, BarChart3, Bell, UserCog, PieChart, Sparkles, FileText,
  Download, History, ThermometerSun, Truck, MapPin, Users, ClipboardCheck,
  ArrowUpRight, Plus, TrendingUp, AlertTriangle, Layers, ShoppingCart,
  ChevronRight, Activity, Wrench, AlertOctagon, Building2, Smartphone, Zap, Brain, Shield, DollarSign, Cpu, CreditCard, ShieldCheck,
} from "lucide-react";
import { CustomWidgetsBand } from "@/components/app/analytics/CustomWidgetsBand";

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
// 3. HERO SECTION
// ============================================================================

function HeroSection({ name }: { name?: string }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const timeFmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="py-2">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111827] tracking-tight leading-tight">
        Welcome, {name || "Manahil Malik"}
      </h1>
      <p className="text-base md:text-lg text-[#6B7280] mt-3 font-medium">
        {fmt(currentTime)} &middot;{" "}
        <span className="tabular-nums font-semibold text-[#111827]">{timeFmt(currentTime)}</span>
      </p>
    </div>
  );
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
      className={`group relative bg-white border ${accent.border} rounded-[13px] px-3.5 py-3 cursor-pointer overflow-hidden
        transition-all duration-[250ms] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.10)] hover:-translate-y-[3px]`}
    >
      {Icon && <div className={`absolute top-0 right-0 w-10 h-10 rounded-bl-[36px] opacity-25 ${accent.bg}`} />}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-[#9CA3AF] tracking-widest uppercase leading-none mb-1.5 truncate">{label}</p>
          <p className={`text-[26px] font-bold tabular-nums leading-none tracking-tight ${accent.text}`}>{animated}</p>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1.5 px-1.5 py-0.5 rounded-full ${accent.badge}`}>
              <TrendingUp className="w-2 h-2" />
              {trend}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 ${accent.bg}`}>
            <Icon className={`w-3.5 h-3.5 ${accent.text}`} />
          </div>
        )}
      </div>
      {to && (
        <p className="text-[10px] font-medium text-[#9CA3AF] mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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

function SectionHeader({ title, description, size = "base" }: { title: string; description?: string; size?: "base" | "large" }) {
  return (
    <div className="mb-6">
      <h2 className={`font-bold text-[#111827] tracking-tight ${size === "large" ? "text-3xl" : "text-2xl"}`}>{title}</h2>
      {description && <p className={`text-[#6B7280] mt-1 ${size === "large" ? "text-lg" : "text-base"}`}>{description}</p>}
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
    <div className="group bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm cursor-pointer flex flex-col gap-4 h-full hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">

      <div className="flex-1">
        <h3 className="text-base font-semibold text-[#111827] leading-snug">{title}</h3>
        {description && <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">{description}</p>}
      </div>
      <div className="flex items-center justify-end pt-1 border-t border-[#F3F4F6]">
        <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-emerald-500 transition-colors duration-200" />
      </div>
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
      className="group bg-white border border-[#EAEAEA] rounded-2xl p-5 shadow-sm flex flex-col gap-4 hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer"
    >


      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#111827] leading-snug">Batch & Dispatch Management</h3>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle batch status filter"
            aria-expanded={open}
            className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${open
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-[#E5E7EB] text-[#9CA3AF] hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
          >
            <Plus
              style={{ width: 14, height: 14 }}
              className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`}
            />
          </button>
        </div>

        {/*<p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
          View batches, approve dispatches, and schedule shipments.
        </p>*/}

        {/* Inline expanding dropdown — AnimatePresence only animates height, no x/y */}
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
              <div className="mt-3 rounded-xl border border-[#E5E7EB] overflow-hidden">
                {BATCH_STATUS_OPTIONS.map(({ label, value }, i) => (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`w-full text-left px-3 py-2.5 text-sm font-medium text-[#374151] hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-150 flex items-center justify-between group/item ${i < BATCH_STATUS_OPTIONS.length - 1 ? "border-b border-[#F3F4F6]" : ""
                      }`}
                  >
                    <span>{label}</span>
                    <ChevronRight
                      style={{ width: 12, height: 12 }}
                      className="text-[#D1D5DB] group-hover/item:text-emerald-500 transition-colors duration-150"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!open && (
        <div className="flex items-center justify-end pt-1 border-t border-[#F3F4F6]">
          <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-emerald-500 transition-colors duration-200" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 8. MAIN DASHBOARD
// ============================================================================

export function ManagerDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();

  const sections: {
    title: string;
    description?: string;
    items: { icon: React.ElementType; title: string; description?: string; to?: string }[];
  }[] = [];


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
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="p-3 md:p-5 w-full space-y-10">

        {/* Hero */}
        <HeroSection name={name} />

        {/* Stats */}
        <div>
          <SectionHeader
            title="Overview"
            size="large"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((sc) => (
              <StatCard key={sc.label} {...sc} />
            ))}
          </div>
        </div>

        <CustomWidgetsBand />

        {/* Overview & Analytics Parent Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full bg-[#FFFFFF] rounded-[20px] shadow-sm border border-[#E5E7EB] p-6 mt-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Container 1: Operations */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.0, ease: "easeOut" }}
              whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-white border border-[#EAEAEA] rounded-[16px] p-5 flex flex-col gap-3 transition-shadow duration-250 ease-out min-h-64 h-auto shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2 text-emerald-600 mb-2">

                <h3 className="font-bold text-[#111827] text-lg">Operations</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
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
              whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-white border border-[#EAEAEA] rounded-[16px] p-5 flex flex-col gap-3 transition-shadow duration-250 ease-out min-h-64 h-auto shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2 text-emerald-600 mb-2">

                <h3 className="font-bold text-[#111827] text-lg">Inventory & Storage</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
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
              whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-white border border-[#EAEAEA] rounded-[16px] p-5 flex flex-col gap-3 transition-shadow duration-250 ease-out min-h-64 h-auto shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
            >
              <div className="flex flex-col mb-2">
                <div className="flex items-center gap-2 text-emerald-600">

                  <h3 className="font-bold text-[#111827] text-lg">Logistics</h3>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Manage shipment tracking, dispatch traceability, insurance, and logistics notifications from one place.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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
              whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-white border border-[#EAEAEA] rounded-[16px] p-5 flex flex-col gap-3 transition-shadow duration-250 ease-out min-h-64 h-auto shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-2 text-emerald-600 mb-2">

                <h3 className="font-bold text-[#111827] text-lg">System & Financial Health</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
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
        </motion.div>


      </div>
    </div>
  );
}
