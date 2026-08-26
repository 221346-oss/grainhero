import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { listAllHardwareOrders, updateHardwareOrder } from "@/lib/hardware-orders.functions";
import { supabase } from "@/integrations/supabase/client";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { InstallationDrawer } from "@/components/app/orders/InstallationDrawer";
import { InstallStageTracker, deriveStage } from "@/components/app/orders/InstallStageTracker";
import { TechnicianAssignmentDialog } from "@/components/app/orders/TechnicianAssignmentDialog";
import { Truck, MoreHorizontal, Users, Search, RefreshCw, MapPin, Phone } from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export const Route = createFileRoute("/_authenticated/platform/orders")({
  head: () => ({ meta: [{ title: "Install orders — Platform" }] }),
  component: PlatformOrdersPage,
});

// ── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  "pending_payment",
  "paid",
  "packing",
  "shipped",
  "in_transit",
  "installing",
  "completed",
  "cancelled",
  "refunded",
] as const;
type OrderStatus = (typeof STATUSES)[number];

function getStatusCfg(t: (key: string) => string): Record<string, { badge: string; label: string }> {
  return {
    pending_payment: { badge: "bg-muted text-muted-foreground border-border", label: t("orders.pendingPayment") },
    paid: { badge: "bg-blue-100 text-blue-800 border-blue-200", label: t("orders.paid") },
    packing: { badge: "bg-amber-100 text-amber-800 border-amber-200", label: t("orders.packing") },
    shipped: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", label: t("orders.shipped") },
    in_transit: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", label: t("orders.inTransit") },
    installing: { badge: "bg-cyan-100 text-cyan-800 border-cyan-200", label: t("orders.installing") },
    completed: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: t("orders.statusCompleted") },
    cancelled: { badge: "bg-red-100 text-red-700 border-red-200", label: t("orders.statusCancelled") },
    refunded: { badge: "bg-muted text-muted-foreground border-border", label: t("orders.refunded") },
    new: { badge: "bg-amber-100 text-amber-800 border-amber-200", label: "New" },
    approved: { badge: "bg-blue-100 text-blue-800 border-blue-200", label: "Approved" },
    tech_assigned: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Tech assigned" },
    installed: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Installed" },
    live: { badge: "bg-emerald-600 text-white border-emerald-600", label: "Live" },
  };
}

function getPlanTabs(t: (key: string) => string) {
  return [
    { key: "all", label: t("orders.allPlans"), color: "#64748b" },
    { key: "starter", label: "Starter", color: "#2FAC0C" },
    { key: "professional", label: "Professional", color: "#0e7490" },
    { key: "enterprise", label: "Enterprise", color: "#7c3aed" },
  ] as const;
}
type PlanKey = (typeof PLAN_TABS)[number]["key"];

function normalisePlan(raw: string | null | undefined): PlanKey {
  const s = (raw ?? "").toLowerCase().trim();
  if (s.includes("starter") || s.includes("basic")) return "starter";
  if (s.includes("professional") || s.includes("intermediate")) return "professional";
  if (s.includes("enterprise") || s.includes("pro")) return "enterprise";
  return "starter"; // fallback
}

const fmt = (n: number) => new Intl.NumberFormat("en-PK").format(n);

// ── Status group sets — defined at module level so they're stable references ─
const DONE_STATUSES = new Set(["completed", "installed", "live"]);
const ACTIVE_STATUSES = new Set([
  "paid",
  "packing",
  "shipped",
  "in_transit",
  "installing",
  "new",
  "approved",
  "tech_assigned",
]);
const CANCEL_STATUSES = new Set(["cancelled", "refunded"]);

// Group-aware filter: "completed" matches every DONE status, "installing"
// matches every ACTIVE status, "cancelled" matches every CANCEL status.
// Exact match is used only for statuses that don't belong to any group
// (e.g. "pending_payment").
function matchesStatusFilter(orderStatus: string, filter: string): boolean {
  if (filter === "all") return true;
  if (DONE_STATUSES.has(filter)) return DONE_STATUSES.has(orderStatus);
  if (ACTIVE_STATUSES.has(filter)) return ACTIVE_STATUSES.has(orderStatus);
  if (CANCEL_STATUSES.has(filter)) return CANCEL_STATUSES.has(orderStatus);
  return orderStatus === filter;
}

// ── Export columns ───────────────────────────────────────────────────────────
const orderExportColumns: ExportColumn<any>[] = [
  { header: "Order ID", value: (o) => String(o.id ?? "").slice(0, 8) },
  { header: "Plan", value: (o) => o.plan_name ?? o.plan_id ?? "—" },
  { header: "Buyer name", value: (o) => o.buyer?.name ?? o.customer_name ?? "—" },
  { header: "Buyer email", value: (o) => o.buyer?.email ?? o.customer_email ?? "—" },
  { header: "Qty", value: (o) => o.hardware_quantity ?? 0 },
  { header: "Total (PKR)", value: (o) => fmt(Number(o.hardware_total ?? 0)) },
  { header: "Status", value: (o) => STATUS_CFG[o.status]?.label ?? o.status ?? "—" },
  { header: "City", value: (o) => o.install_city ?? "—" },
  { header: "Country", value: (o) => o.install_country ?? "—" },
  {
    header: "Placed",
    value: (o) => (o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"),
  },
  { header: "Technician", value: (o) => o.technician_name ?? "—" },
];

// ── Export button row ────────────────────────────────────────────────────────
function ExportRow({ rows, label, filename }: { rows: any[]; label: string; filename: string }) {
  return <ExportMenu filename={filename} title={label} rows={rows} columns={orderExportColumns} />;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}
function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-background p-4 space-y-2">
            <Sk className="h-[10px] w-20" />
            <Sk className="h-7 w-12" />
            <Sk className="h-[10px] w-16" />
          </div>
        ))}
      </div>
      <div className="border border-border rounded-md overflow-hidden bg-background">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
          >
            <Sk className="h-[13px] w-24" />
            <Sk className="h-[13px] w-32" />
            <Sk className="h-[13px] w-20" />
            <Sk className="h-5 w-20 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI strip — neon hairline gap-px grid ───────────────────────────────────
function KpiStrip({
  kpis,
  activeFilter,
  onFilter,
  allOrders,
  planTab,
  t,
}: {
  kpis: { total: number; completed: any[]; pending: any[]; cancelled: any[]; count: number };
  activeFilter: string;
  onFilter: (s: string) => void;
  allOrders: any[];
  planTab: string;
  t: (key: string) => string;
}) {
  const week = 7 * 86_400_000;
  const src =
    planTab === "all"
      ? allOrders
      : allOrders.filter((o) => normalisePlan(o.plan_name ?? o.plan_id) === planTab);

  const thisWeek = src
    .filter((o) => o.created_at && Date.now() - new Date(o.created_at).getTime() < week)
    .reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);
  const lastWeek = src
    .filter((o) => {
      const a = Date.now() - new Date(o.created_at ?? 0).getTime();
      return a >= week && a < 2 * week;
    })
    .reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);
  const trendPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const trendUp = trendPct !== null && trendPct >= 0;

  const completedCount = kpis.completed.length;
  const totalActive = kpis.count - kpis.cancelled.length;
  const completePct = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;
  const pendingPct = totalActive > 0 ? Math.round((kpis.pending.length / totalActive) * 100) : 0;
  const cancelPct = kpis.count > 0 ? Math.round((kpis.cancelled.length / kpis.count) * 100) : 0;

  const completedRev = kpis.completed.reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);
  const pendingRev = kpis.pending.reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);
  const cancelledRev = kpis.cancelled.reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);

  const isPendingActive = ACTIVE_STATUSES.has(activeFilter);
  const isCompleteActive = DONE_STATUSES.has(activeFilter);
  const isCancelActive = CANCEL_STATUSES.has(activeFilter);

  const cells = [
    {
      label: t("orders.totalRevenue"),
      value: `PKR ${fmt(kpis.total)}`,
      sub: `${kpis.count} ${t("orders.orders")}${trendPct !== null ? ` · ${trendUp ? "+" : ""}${trendPct}% WoW` : ""}`,
      subClass:
        trendPct !== null
          ? trendUp
            ? "text-success"
            : "text-severity-critical"
          : "text-muted-foreground",
      barPct: completePct,
      barColor: "hsl(var(--success))",
      active: false,
      onClick: () => onFilter("all"),
    },
    {
      label: t("orders.completed"),
      value: String(completedCount),
      sub: `PKR ${fmt(completedRev)} · ${completePct}% of active`,
      subClass: "text-success",
      barPct: completePct,
      barColor: "hsl(var(--success))",
      active: isCompleteActive,
      onClick: () => onFilter(isCompleteActive ? "all" : "completed"),
    },
    {
      label: t("orders.inProgress"),
      value: String(kpis.pending.length),
      sub: `PKR ${fmt(pendingRev)} · ${pendingPct}% of active${kpis.pending.length > 0 ? ` · ${t("orders.needsAttention")}` : ""}`,
      subClass: kpis.pending.length > 0 ? "text-warning" : "text-muted-foreground",
      barPct: pendingPct,
      barColor: "hsl(var(--warning))",
      active: isPendingActive,
      onClick: () => onFilter(isPendingActive ? "all" : "installing"),
    },
    {
      label: t("orders.cancelled"),
      value: String(kpis.cancelled.length),
      sub:
        kpis.cancelled.length > 0
          ? `PKR ${fmt(cancelledRev)} lost · ${cancelPct}%`
          : t("orders.noCancellations"),
      subClass: kpis.cancelled.length > 0 ? "text-severity-critical" : "text-success",
      barPct: cancelPct,
      barColor: "hsl(var(--severity-critical))",
      active: isCancelActive,
      onClick: () => onFilter(isCancelActive ? "all" : "cancelled"),
    },
  ];

  return (
    <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
      {cells.map((c) => (
        <button
          key={c.label}
          onClick={c.onClick}
          className={`bg-background p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none ${c.active ? "bg-muted/60" : ""}`}
        >
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
            {c.label}
          </p>
          <p className="text-2xl font-medium tabular-nums leading-none text-foreground">
            {c.value}
          </p>
          <p className={`text-[11px] mt-1 truncate ${c.subClass}`}>{c.sub}</p>
          <div className="mt-2.5 h-[2px] bg-muted overflow-hidden rounded-none">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${c.barPct}%`, background: c.barColor }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function PlatformOrdersPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAllHardwareOrders);
  const updateFn = useServerFn(updateHardwareOrder);
  const { t } = useTranslation();
  const STATUS_CFG = getStatusCfg(t);
  const PLAN_TABS = getPlanTabs(t);

  // Plan tab + status filter + search
  const [planTab, setPlanTab] = useState<PlanKey>("all");
  const [statusFilter, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [installOrderId, setInstall] = useState<string | null>(null);
  const [assignOrder, setAssign] = useState<any>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-orders"],
    queryFn: () => fetchFn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Realtime: invalidate when installs or orders change
  useEffect(() => {
    const channel = supabase
      .channel("superadmin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_installations" },
        () => {
          qc.invalidateQueries({ queryKey: ["platform-orders"] });
          qc.invalidateQueries({ queryKey: ["platform-widgets"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-orders"] });
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const allOrders: any[] = data?.orders ?? [];

  // Filtered view — uses module-level matchesStatusFilter for group-aware matching
  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      if (planTab !== "all" && normalisePlan(o.plan_name ?? o.plan_id) !== planTab) return false;
      if (!matchesStatusFilter(o.status, statusFilter)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hit =
          (o.buyer?.name ?? "").toLowerCase().includes(s) ||
          (o.buyer?.email ?? "").toLowerCase().includes(s) ||
          (o.plan_name ?? "").toLowerCase().includes(s) ||
          (o.install_city ?? "").toLowerCase().includes(s) ||
          String(o.id ?? "")
            .toLowerCase()
            .includes(s);
        if (!hit) return false;
      }
      return true;
    });
  }, [allOrders, planTab, statusFilter, search]);

  // Per-plan counts
  const planCounts = useMemo(() => {
    const c: Record<string, number> = { all: allOrders.length };
    for (const o of allOrders) {
      const k = normalisePlan(o.plan_name ?? o.plan_id);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [allOrders]);
  const kpis = useMemo(() => {
    const src =
      planTab === "all"
        ? allOrders
        : allOrders.filter((o) => normalisePlan(o.plan_name ?? o.plan_id) === planTab);
    const total = src.reduce((s, o) => s + Number(o.hardware_total ?? 0), 0);
    const completed = src.filter((o) => DONE_STATUSES.has(o.status));
    const pending = src.filter((o) => ACTIVE_STATUSES.has(o.status));
    const cancelled = src.filter((o) => CANCEL_STATUSES.has(o.status));
    return { total, completed, pending, cancelled, count: src.length };
  }, [allOrders, planTab]);

  const update = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-orders"] });
      toast.success(t("orders.orderUpdated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabColor = PLAN_TABS.find((t) => t.key === planTab)?.color ?? "#64748b";

  return (
    <AdminPageShell
      title={t("orders.title")}
      subtitle={t("orders.subtitle")}
      actions={
        <div className="flex items-center gap-2">
          <ExportRow
            rows={filtered}
            label={`Install Orders — ${PLAN_TABS.find((t) => t.key === planTab)?.label ?? "All"} — GrainHero`}
            filename={`install-orders-${planTab}`}
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> {t("orders.refresh")}
          </button>
        </div>
      }
    >
      {/* ── Plan tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit flex-wrap">
        {PLAN_TABS.map((t) => {
          const active = planTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setPlanTab(t.key);
                setStatus("all");
                setSearch("");
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
              style={
                active
                  ? {
                      background: "#fff",
                      color: t.color,
                      boxShadow: "0 1px 3px 0 rgba(0,0,0,0.10)",
                    }
                  : { color: "#64748b" }
              }
            >
              {t.label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={
                  active
                    ? { background: t.color + "18", color: t.color }
                    : { background: "#e2e8f0", color: "#64748b" }
                }
              >
                {planCounts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── KPI cards — clickable, color-coded, with trend + progress ── */}
      {!isLoading && (
        <KpiStrip
          kpis={kpis}
          activeFilter={statusFilter}
          onFilter={setStatus}
          allOrders={allOrders}
          planTab={planTab}
          t={t}
        />
      )}

      {/* ── Filters + per-tab export ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.search")}
              className="pl-8 h-8 text-xs w-56"
            />
          </div>
          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.allStatuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CFG[s]?.label ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Per-plan export */}
        {planTab !== "all" && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              Export {PLAN_TABS.find((t) => t.key === planTab)?.label}:
            </span>
            <ExportRow
              rows={filtered}
              label={`${PLAN_TABS.find((t) => t.key === planTab)?.label} Orders — GrainHero`}
              filename={`orders-${planTab}`}
            />
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-background py-12 text-center text-sm text-muted-foreground">
          {t("orders.noOrders")}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="overflow-x-auto">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[1.8fr_1.8fr_1fr_1fr_2fr_1fr_auto] gap-0 border-b border-border px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 min-w-[900px]">
              <span>{t("orders.headerOrder")}</span>
              <span>{t("orders.headerBuyer")}</span>
              <span>{t("orders.headerLocation")}</span>
              <span>{t("orders.headerTotal")}</span>
              <span>{t("orders.headerStatus")}</span>
              <span>{t("orders.headerPlaced")}</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {filtered.map((o) => (
                <OrderRow
                  key={o.id as string}
                  order={o}
                  tabColor={tabColor}
                  onUpdate={(v) => update.mutate({ orderId: o.id as string, ...v })}
                  busy={update.isPending}
                  onOpenInstall={() => setInstall(o.id as string)}
                  onAssign={() => setAssign(o)}
                  STATUS_CFG={STATUS_CFG}
                  t={t}
                />
              ))}
            </div>
          </div>
          <div className="px-5 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {filtered.length} {filtered.length === 1 ? t("orders.order") : t("orders.orders")}
            </span>
            <span className="font-medium text-muted-foreground">
              PKR {fmt(filtered.reduce((s, o) => s + Number(o.hardware_total ?? 0), 0))}
            </span>
          </div>
        </div>
      )}

      <InstallationDrawer
        orderId={installOrderId}
        open={!!installOrderId}
        onOpenChange={(v) => !v && setInstall(null)}
        canEdit
      />
      {assignOrder && (
        <TechnicianAssignmentDialog
          open={!!assignOrder}
          onOpenChange={(v) => !v && setAssign(null)}
          order={assignOrder}
        />
      )}
    </AdminPageShell>
  );
}

// ── Order row ────────────────────────────────────────────────────────────────
function OrderRow({
  order,
  tabColor,
  onUpdate,
  busy,
  onOpenInstall,
  onAssign,
  STATUS_CFG,
  t,
}: {
  order: any;
  tabColor: string;
  onUpdate: (v: {
    status?: OrderStatus;
    technicianName?: string;
    technicianPhone?: string;
    scheduledInstallDate?: string;
    cancelReason?: string;
  }) => void;
  busy: boolean;
  onOpenInstall: () => void;
  onAssign: () => void;
  STATUS_CFG: Record<string, { badge: string; label: string }>;
  t: (key: string) => string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // local edit state inside detail dialog
  const [editStatus, setEditStatus] = useState<OrderStatus>(order.status);
  const [techName, setTechName] = useState(order.technician_name ?? "");
  const [techPhone, setTechPhone] = useState(order.technician_phone ?? "");
  const [scheduled, setScheduled] = useState(
    order.scheduled_install_date
      ? new Date(order.scheduled_install_date).toISOString().slice(0, 16)
      : "",
  );

  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.new;

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden p-4 border-b border-border space-y-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-foreground">
              {order.plan_name ?? order.plan_id ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {String(order.id ?? "").slice(0, 8)} · {order.hardware_quantity ?? 0} unit
              {Number(order.hardware_quantity) !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-600">
              PKR {fmt(Number(order.hardware_total ?? 0))}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setDetailOpen(true)}>
                  {t("orders.viewEditDetails")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAssign}>
                  <Users className="w-3.5 h-3.5 mr-1.5" /> {t("orders.assignTechnician")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenInstall}>
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> {t("orders.trackInstallation")}
                </DropdownMenuItem>
                {order.status !== "cancelled" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={() => setCancelOpen(true)}>
                      {t("orders.cancelOrder")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2 text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground block">
              {order.buyer?.name ?? order.customer_name ?? "—"}
            </span>
            <span className="truncate block text-[11px]">
              {order.buyer?.email ?? order.customer_email ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        </div>

        <div className="pt-1">
          <InstallStageTracker
            variant="row"
            {...deriveStage(order, order.installation ?? null, order.visit_events ?? [])}
          />
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-[1.8fr_1.8fr_1fr_1fr_2fr_1fr_auto] gap-0 items-center px-5 py-3 hover:bg-muted/30 transition-colors min-w-[900px]">
        {/* Order */}
        <div>
          <div className="text-sm font-medium text-foreground">
            {order.plan_name ?? order.plan_id ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
            {String(order.id ?? "").slice(0, 8)} · {order.hardware_quantity ?? 0} unit
            {Number(order.hardware_quantity) !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Buyer */}
        <div>
          <div className="text-sm text-foreground truncate max-w-[160px]">
            {order.buyer?.name ?? order.customer_name ?? "—"}
          </div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
            {order.buyer?.email ?? order.customer_email ?? "—"}
          </div>
        </div>

        {/* Location */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}
          </span>
        </div>

        {/* Total */}
        <div className="text-sm font-semibold text-foreground tabular-nums">
          PKR {fmt(Number(order.hardware_total ?? 0))}
        </div>

        {/* Stage tracker */}
        <div className="min-w-0">
          <InstallStageTracker
            variant="row"
            {...deriveStage(order, order.installation ?? null, order.visit_events ?? [])}
          />
        </div>

        {/* Placed */}
        <div className="text-xs text-muted-foreground">
          {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setDetailOpen(true)}>
              {t("orders.viewEditDetails")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>
              <Users className="w-3.5 h-3.5 mr-1.5" /> {t("orders.assignTechnician")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenInstall}>
              <Truck className="w-3.5 h-3.5 mr-1.5" /> {t("orders.trackInstallation")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {order.status !== "cancelled" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => setCancelOpen(true)}>
                  {t("orders.cancelOrder")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Detail / edit Sheet ─────────────────────────────────── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{order.plan_name ?? order.plan_id}</SheetTitle>
            <SheetDescription>
              Order <span className="font-mono">{String(order.id ?? "").slice(0, 8)}</span>
              {" · "}
              <span
                className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}
              >
                {cfg.label}
              </span>
            </SheetDescription>
          </SheetHeader>

          {/* Read-only info block */}
          <div className="mt-4 rounded-lg bg-muted/30 border border-border p-3 text-xs space-y-1.5 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold w-20">{t("orders.buyer")}</span>
              <span>
                {order.buyer?.name ?? order.customer_name ?? "—"} ·{" "}
                {order.buyer?.email ?? order.customer_email ?? "—"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold w-20 shrink-0">{t("orders.address")}</span>
              <span>
                {[order.install_address, order.install_city, order.install_country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </div>
            {order.contact_phone && (
              <div className="flex items-center gap-2">
                <span className="font-semibold w-20">{t("orders.phone")}</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.contact_phone}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold w-20">{t("orders.hardware")}</span>
              <span>
                {order.hardware_quantity} {Number(order.hardware_quantity) !== 1 ? t("orders.units") : t("orders.unit")} ·
                PKR {fmt(Number(order.hardware_total ?? 0))}
              </span>
            </div>
          </div>

          {/* Editable fields */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{t("orders.status")}</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {STATUS_CFG[s]?.label ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("orders.technicianName")}</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder={t("orders.fullName")}
              />
            </div>
            <div>
              <Label className="text-xs">{t("orders.technicianPhone")}</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                placeholder="+92…"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">{t("orders.scheduledInstallDate")}</Label>
              <Input
                type="datetime-local"
                className="h-8 text-xs mt-1"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
              {t("common.close")}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                onUpdate({
                  status: editStatus,
                  technicianName: techName,
                  technicianPhone: techPhone,
                  scheduledInstallDate: scheduled ? new Date(scheduled).toISOString() : undefined,
                });
                setDetailOpen(false);
              }}
            >
              {t("orders.saveChanges")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Cancel confirmation — popup modal, not a Sheet (see side-panel convention in components/ui/sheet.tsx) ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("orders.cancelTitle")}</DialogTitle>
            <DialogDescription>
              {t("orders.cancelDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("orders.reasonOptional")}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>
              {t("orders.back")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => {
                onUpdate({ status: "cancelled", cancelReason });
                setCancelOpen(false);
              }}
            >
              {t("orders.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
