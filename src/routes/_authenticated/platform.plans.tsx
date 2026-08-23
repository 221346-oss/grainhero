import { SectionLabel } from "@/components/app/surface";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPlanThresholds,
  updatePlanThreshold,
  listPlanChangeRequests,
  decidePlanChangeRequest,
} from "@/lib/plan-thresholds.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Database,
  Warehouse,
  Package,
  Cpu,
  Zap,
  Star,
  CheckCircle,
  XCircle,
  X,
  Bell,
  Pencil,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/plans")({
  head: () => ({
    meta: [
      { title: "Platform · Plans — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Plans workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Plans — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Plans workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformPlansPage,
});

type Plan = Awaited<ReturnType<typeof listPlanThresholds>>[number];
type Req = Awaited<ReturnType<typeof listPlanChangeRequests>>[number];

const G = "#2FAC0C";
const GL = "rgba(47,172,12,0.10)";

const fmt = (n: number) => new Intl.NumberFormat("en-PK").format(n);

// Per-plan visual identity
const PLAN_THEME: Record<
  string,
  {
    accent: string;
    accentLight: string;
    accentBorder: string;
    label: string;
    tagline: string;
  }
> = {
  starter: {
    accent: "#3b82f6",
    accentLight: "rgba(59,130,246,0.10)",
    accentBorder: "rgba(59,130,246,0.22)",
    label: "Starter",
    tagline: "For small teams getting started",
  },
  professional: {
    accent: "#2FAC0C",
    accentLight: "rgba(47,172,12,0.10)",
    accentBorder: "rgba(47,172,12,0.22)",
    label: "Professional",
    tagline: "For growing grain businesses",
  },
  enterprise: {
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.10)",
    accentBorder: "rgba(124,58,237,0.22)",
    label: "Enterprise",
    tagline: "Unlimited scale for large operations",
  },
  // plan_thresholds keys these rows by plan_id — basic / intermediate / pro —
  // not by display name, so alias them or every tier falls back to neutral.
  basic: {
    accent: "#3b82f6",
    accentLight: "rgba(59,130,246,0.10)",
    accentBorder: "rgba(59,130,246,0.22)",
    label: "Starter",
    tagline: "For small teams getting started",
  },
  intermediate: {
    accent: "#2FAC0C",
    accentLight: "rgba(47,172,12,0.10)",
    accentBorder: "rgba(47,172,12,0.22)",
    label: "Professional",
    tagline: "For growing grain businesses",
  },
  pro: {
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.10)",
    accentBorder: "rgba(124,58,237,0.22)",
    label: "Enterprise",
    tagline: "Unlimited scale for large operations",
  },
};
const theme = (id: string) =>
  PLAN_THEME[id.toLowerCase()] ?? {
    accent: "var(--muted-foreground)",
    accentLight: "color-mix(in oklab, var(--muted-foreground) 12%, transparent)",
    accentBorder: "color-mix(in oklab, var(--muted-foreground) 22%, transparent)",
    label: id,
    tagline: "",
  };

// Feature limit definitions
const LIMITS = [
  { key: "max_users", icon: Users, label: "Users", max: 100 },
  { key: "max_silos", icon: Database, label: "Silos", max: 50 },
  { key: "max_warehouses", icon: Warehouse, label: "Warehouses", max: 20 },
  { key: "max_batches", icon: Package, label: "Batches", max: 500 },
  { key: "max_sensors", icon: Cpu, label: "Sensors", max: 200 },
  { key: "max_actuators", icon: Zap, label: "Actuators", max: 100 },
] as const;

// ── Skeleton Components ──────────────────────────────────────────────────────
function SkeletonPulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card/50 p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-7 w-32" />
          <SkeletonPulse className="h-3 w-40" />
        </div>
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <SkeletonPulse className="h-3 w-16" />
              <SkeletonPulse className="h-3 w-8" />
            </div>
            <SkeletonPulse className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <SkeletonPulse className="h-9 w-full rounded-lg" />
    </div>
  );
}

function RequestsTableSkeleton() {
  return (
    <div className="divide-y divide-border/40">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-4">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-5 w-16 rounded-full" />
          <SkeletonPulse className="h-5 w-14 rounded-full" />
          <div className="ml-auto flex gap-2">
            <SkeletonPulse className="h-7 w-16 rounded-lg" />
            <SkeletonPulse className="h-7 w-18 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const t = theme(plan.plan_id);
  const price = Math.round(plan.price_cents / 100);

  return (
    <div className="flex flex-col border-b border-border/40 last:border-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      {/* Coloured top stripe */}
      <div className="h-0.5 w-full" style={{ background: t.accent }} />

      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* Title & subtitle */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{plan.name}</span>
            {plan.is_popular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                <Star className="h-3 w-3" /> Popular
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t.tagline}</p>
        </div>

        {/* Price & status */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
              PKR {fmt(price)}
            </span>
            {plan.is_active ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium"
                style={{ background: GL, color: G }}
              >
                <CheckCircle className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm font-medium text-muted-foreground">
                <XCircle className="h-3 w-3" /> Inactive
              </span>
            )}
          </div>
          <p className="text-sm">
            <span className="font-medium" style={{ color: t.accent }}>
              {Number((plan as any).max_users ?? 0)} users
            </span>{" "}
            <span className="text-muted-foreground">included per month</span>
          </p>
        </div>

        {/* Feature limit meters */}
        <div className="flex-1 space-y-1.5">
          {LIMITS.map(({ key, icon: Icon, label, max }) => {
            const val = Number((plan as any)[key] ?? 0);
            const pct = Math.min(100, Math.round((val / max) * 100));
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Icon className="w-2.5 h-2.5 text-muted-foreground" />
                    {label}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground tabular-nums">
                    {val}
                  </span>
                </div>
                <div className="h-0.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: t.accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="mt-1 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-colors"
          style={{ background: t.accentLight, color: t.accent }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.accentBorder)}
          onMouseLeave={(e) => (e.currentTarget.style.background = t.accentLight)}
        >
          <Pencil className="w-2.5 h-2.5" /> Edit plan
        </button>
      </div>
    </div>
  );
}

// ── Slide-Over Drawer ────────────────────────────────────────────────────────
function EditDrawer({
  plan,
  open,
  onClose,
  onSave,
  saving,
}: {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<any>(null);

  // Reset form when plan changes
  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name,
        price_cents: plan.price_cents,
        max_users: plan.max_users,
        max_silos: plan.max_silos,
        max_warehouses: (plan as any).max_warehouses ?? 0,
        max_batches: plan.max_batches,
        max_sensors: plan.max_sensors,
        max_actuators: plan.max_actuators,
        is_active: plan.is_active,
        is_popular: plan.is_popular,
      });
    }
  }, [plan?.plan_id]);

  if (!plan || !form) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const origPrice = Math.round(plan.price_cents / 100);
  const newPrice = Math.round(form.price_cents / 100);

  const limitKeys = [
    "max_users",
    "max_silos",
    "max_warehouses",
    "max_batches",
    "max_sensors",
    "max_actuators",
  ];
  const changedCount =
    (newPrice !== origPrice ? 1 : 0) +
    limitKeys.filter((k) => form[k] !== ((plan as any)[k] ?? 0)).length;

  const t = theme(plan.plan_id);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-foreground/30 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="h-1.5 w-full" style={{ background: t.accent }} />
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Edit — {plan.name}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{plan.plan_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Price */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">
              Price (PKR / month)
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                value={newPrice}
                onChange={(e) => set("price_cents", Math.round(Number(e.target.value) * 100))}
                className="h-9 text-sm"
              />
              {newPrice !== origPrice && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${newPrice > origPrice ? "text-success" : "text-red-500"}`}
                >
                  {newPrice > origPrice ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  was {fmt(origPrice)}
                </div>
              )}
            </div>
          </div>

          {/* Feature limits */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Feature Limits
            </label>
            <div className="space-y-3">
              {LIMITS.map(({ key, icon: Icon, label, max }) => {
                const orig = Number((plan as any)[key] ?? 0);
                const cur = Number(form[key] ?? 0);
                const diff = cur - orig;
                const pct = Math.min(100, Math.round((cur / max) * 100));
                return (
                  <div
                    key={key}
                    className="rounded-xl bg-muted/20 p-3 space-y-2"
                    style={
                      diff !== 0
                        ? {
                            borderColor: diff > 0 ? "#bbf7d0" : "#fecaca",
                            background: diff > 0 ? "rgba(47,172,12,0.03)" : "rgba(239,68,68,0.03)",
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {label}
                      </span>
                      <div className="flex items-center gap-2">
                        {diff !== 0 && (
                          <span
                            className={`text-[10px] font-bold ${diff > 0 ? "text-success" : "text-red-500"}`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                        <Input
                          type="number"
                          min={0}
                          value={cur}
                          onChange={(e) => set(key, Number(e.target.value))}
                          className="h-7 w-20 text-xs text-right"
                        />
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: diff > 0 ? G : diff < 0 ? "#ef4444" : t.accent,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
              Settings
            </label>
            <div className="space-y-2">
              {(
                [
                  {
                    k: "is_active",
                    label: "Plan is active",
                    sub: "Visible and purchasable by tenants",
                  },
                  {
                    k: "is_popular",
                    label: "Mark as popular",
                    sub: "Highlights this plan on the pricing page",
                  },
                ] as const
              ).map(({ k, label, sub }) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <Switch checked={!!form[k]} onCheckedChange={(v) => set(k, v)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t space-y-3">
          {changedCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border-amber-200 bg-amber-50 px-3 py-2.5">
              <Bell className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">
                  {changedCount} change{changedCount !== 1 ? "s" : ""}
                </span>{" "}
                — all tenants on this plan will be updated and notified.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={saving || changedCount === 0}
              onClick={() => onSave(form)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40"
              style={{ background: changedCount > 0 ? G : "#94a3b8" }}
            >
              {saving ? "Saving…" : changedCount > 0 ? "Save & notify" : "No changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function PlatformPlansPage() {
  const qc = useQueryClient();
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("pending");
  const [activeView, setActiveView] = useState<"plans" | "pending" | "auto_applied" | "active">(
    "plans",
  );

  const fetchPlans = useServerFn(listPlanThresholds);
  const fetchRequests = useServerFn(listPlanChangeRequests);
  const savePlan = useServerFn(updatePlanThreshold);
  const decide = useServerFn(decidePlanChangeRequest);

  const plansQ = useQuery({
    queryKey: ["plan-thresholds"],
    queryFn: () => fetchPlans(),
    staleTime: 60_000,
  });
  const reqQ = useQuery({
    queryKey: ["plan-change-requests", statusFilter],
    queryFn: () => fetchRequests({ data: { status: statusFilter } }),
  });

  const plans: Plan[] = plansQ.data ?? [];
  const requests: Req[] = reqQ.data ?? [];
  const editPlan = plans.find((p) => p.plan_id === editPlanId) ?? null;
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const saveMut = useMutation({
    mutationFn: (v: any) => savePlan({ data: v }),
    onSuccess: (_data, vars) => {
      const planName = plans.find((p) => p.plan_id === vars.plan_id)?.name ?? vars.plan_id;
      toast.success(`"${planName}" plan saved`, {
        description:
          "Limits updated instantly across all tenants on this plan. You'll see a confirmation in your notification bell.",
        duration: 6000,
      });
      qc.invalidateQueries({ queryKey: ["plan-thresholds"] });
      setEditPlanId(null);
    },
    onError: (e: any) =>
      toast.error("Failed to save plan", { description: e?.message ?? "Unknown error" }),
  });

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string | null }) =>
      decide({ data: v }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["plan-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  // ── Stats strip ────────────────────────────────────────────────────────────
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.is_active).length;
  const pendingReqs = pendingCount;
  const autoApplied = requests.filter((r) => r.status === "auto_applied").length;

  const PILLARS = [
    {
      key: "plans" as const,
      value: totalPlans,
      label: "Total Plans",
      accent: "#64748b",
      grad: "linear-gradient(160deg, #475569 0%, #334155 100%)",
      bg: "rgba(100,116,139,0.07)",
    },
    {
      key: "active" as const,
      value: activePlans,
      label: "Active",
      accent: "#2FAC0C",
      grad: "linear-gradient(160deg, #2FAC0C 0%, #16a34a 100%)",
      bg: "rgba(47,172,12,0.07)",
    },
    {
      key: "pending" as const,
      value: pendingReqs,
      label: "Pending Requests",
      accent: pendingReqs > 0 ? "#d97706" : "#94a3b8",
      grad:
        pendingReqs > 0
          ? "linear-gradient(160deg, #f59e0b 0%, #d97706 100%)"
          : "linear-gradient(160deg, #94a3b8 0%, #64748b 100%)",
      bg: pendingReqs > 0 ? "rgba(217,119,6,0.07)" : "rgba(100,116,139,0.05)",
    },
    {
      key: "auto_applied" as const,
      value: autoApplied,
      label: "Auto-applied",
      accent: "#0e7490",
      grad: "linear-gradient(160deg, #0891b2 0%, #0e7490 100%)",
      bg: "rgba(14,116,144,0.07)",
    },
  ];

  // neon tone per pillar
  const PILLAR_TONE: Record<string, string> = {
    plans: "text-muted-foreground",
    active: "text-success",
    pending: pendingReqs > 0 ? "text-warning" : "text-muted-foreground",
    auto_applied: "text-info",
  };

  const StatStrip = () =>
    plansQ.isLoading ? (
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-background p-4 space-y-2">
            <SkeletonPulse className="h-[10px] w-16" />
            <SkeletonPulse className="h-6 w-10" />
          </div>
        ))}
      </div>
    ) : (
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
        {PILLARS.map((p) => {
          const isActive = activeView === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActiveView(p.key)}
              className={`bg-background p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none ${isActive ? "bg-muted/60" : ""}`}
            >
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
                {p.label}
              </p>
              <p
                className={`text-2xl font-medium tabular-nums leading-none ${PILLAR_TONE[p.key] ?? "text-foreground"}`}
              >
                {p.value}
              </p>
              {isActive && <span className="mt-1.5 inline-block w-4 h-px bg-foreground/40" />}
            </button>
          );
        })}
      </div>
    );

  return (
    <AdminPageShell
      title="Plans & Thresholds"
      subtitle="Configure plan limits — changes propagate to all tenants on that plan instantly."
    >
      <StatStrip />

      {/* ── Plan cards — shown when activeView is plans or active ─── */}
      {(activeView === "plans" || activeView === "active") && (
        <div>
          <SectionLabel index="01" className="mb-3">
            {activeView === "active" ? "Active plan tiers" : "Plan tiers"}
          </SectionLabel>
          {plansQ.isLoading ? (
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-card/50 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <PlanCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-1">
              {(activeView === "active" ? plans.filter((p) => p.is_active) : plans).map((p) => (
                <PlanCard key={p.plan_id} plan={p} onEdit={() => setEditPlanId(p.plan_id)} />
              ))}
              {plans.length === 0 && (
                <div className="col-span-3 p-12 text-center text-sm text-muted-foreground">
                  No plans configured yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Change requests — shown when activeView is pending/auto_applied/plans ── */}
      {(activeView === "pending" || activeView === "auto_applied" || activeView === "plans") && (
        <div className="rounded-2xl bg-card/50 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SectionLabel index="02">Plan change requests</SectionLabel>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {(["pending", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                  style={
                    statusFilter === f
                      ? { background: G, color: "#fff" }
                      : { background: "#f1f5f9", color: "#475569" }
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {reqQ.isLoading ? (
            <RequestsTableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                    <th className="text-left px-5 py-2.5 font-semibold">Tenant</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Change</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Direction</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                        {r.tenant_admin_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <span className="text-muted-foreground">{r.current_plan ?? "—"}</span>
                        {" → "}
                        <span className="font-semibold text-foreground">{r.requested_plan}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={
                            r.direction === "upgrade"
                              ? { background: GL, color: G }
                              : { background: "rgba(245,158,11,0.1)", color: "#b45309" }
                          }
                        >
                          {r.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.status === "pending" ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                const reason = window.prompt("Reason for rejection?");
                                if (!reason?.trim()) return;
                                decideMut.mutate({
                                  id: r.id,
                                  approve: false,
                                  reason: reason.trim(),
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted/30 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => decideMut.mutate({ id: r.id, approve: true })}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                              style={{ background: G }}
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                        No {statusFilter === "pending" ? "pending " : ""}requests
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Slide-over drawer ───────────────────────────────────────── */}
      <EditDrawer
        plan={editPlan}
        open={!!editPlanId}
        onClose={() => setEditPlanId(null)}
        onSave={(patch) => saveMut.mutate({ plan_id: editPlanId!, ...patch })}
        saving={saveMut.isPending}
      />
    </AdminPageShell>
  );
}
