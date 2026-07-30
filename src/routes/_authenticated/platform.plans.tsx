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
  Users, Database, Warehouse, Package, Cpu, Zap,
  Star, CheckCircle, XCircle, X, Bell, Pencil,
  TrendingUp, TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/plans")({
  component: PlatformPlansPage,
});

type Plan = Awaited<ReturnType<typeof listPlanThresholds>>[number];
type Req  = Awaited<ReturnType<typeof listPlanChangeRequests>>[number];

const G  = "#2FAC0C";
const GL = "rgba(47,172,12,0.10)";

const fmt = (n: number) => new Intl.NumberFormat("en-PK").format(n);

// Per-plan visual identity
const PLAN_THEME: Record<string, {
  accent: string; accentLight: string; accentBorder: string;
  label: string; tagline: string;
}> = {
  starter:      { accent: "#3b82f6", accentLight: "rgba(59,130,246,0.08)",  accentBorder: "#bfdbfe", label: "Starter",      tagline: "For small teams getting started" },
  professional: { accent: "#2FAC0C", accentLight: "rgba(47,172,12,0.08)",   accentBorder: "#bbf7d0", label: "Professional", tagline: "For growing grain businesses" },
  enterprise:   { accent: "#7c3aed", accentLight: "rgba(124,58,237,0.08)",  accentBorder: "#ddd6fe", label: "Enterprise",   tagline: "Unlimited scale for large operations" },
};
const theme = (id: string) =>
  PLAN_THEME[id.toLowerCase()] ?? { accent: "#64748b", accentLight: "#f8fafc", accentBorder: "#e2e8f0", label: id, tagline: "" };

// Feature limit definitions
const LIMITS = [
  { key: "max_users",      icon: Users,     label: "Users",      max: 100 },
  { key: "max_silos",      icon: Database,  label: "Silos",      max: 50  },
  { key: "max_warehouses", icon: Warehouse, label: "Warehouses", max: 20  },
  { key: "max_batches",    icon: Package,   label: "Batches",    max: 500 },
  { key: "max_sensors",    icon: Cpu,       label: "Sensors",    max: 200 },
  { key: "max_actuators",  icon: Zap,       label: "Actuators",  max: 100 },
] as const;

// ── Skeleton Components ──────────────────────────────────────────────────────
function SkeletonPulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
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
    <div className="divide-y divide-slate-50">
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
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
      {/* Coloured top stripe */}
      <div className="h-1.5 w-full" style={{ background: t.accent }} />

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base font-bold text-[#252d26]">{plan.name}</span>
              {plan.is_popular && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  <Star className="w-2.5 h-2.5" /> Popular
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{t.tagline}</p>
          </div>
          {plan.is_active ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: GL, color: G }}>
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
              <XCircle className="w-3 h-3" /> Inactive
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-4 mb-5">
          <span className="text-3xl font-bold text-[#252d26] tabular-nums">
            PKR {fmt(price)}
          </span>
          <span className="text-sm text-slate-400 ml-1">/ month</span>
        </div>

        {/* Feature limit meters */}
        <div className="space-y-3 flex-1">
          {LIMITS.map(({ key, icon: Icon, label, max }) => {
            const val = Number((plan as any)[key] ?? 0);
            const pct = Math.min(100, Math.round((val / max) * 100));
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs text-[#404F44]">
                    <Icon className="w-3 h-3 text-slate-400" />
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-[#252d26] tabular-nums">{val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors"
          style={{ background: t.accentLight, color: t.accent }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.accentBorder)}
          onMouseLeave={(e) => (e.currentTarget.style.background = t.accentLight)}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit plan
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
        name:           plan.name,
        price_cents:    plan.price_cents,
        max_users:      plan.max_users,
        max_silos:      plan.max_silos,
        max_warehouses: (plan as any).max_warehouses ?? 0,
        max_batches:    plan.max_batches,
        max_sensors:    plan.max_sensors,
        max_actuators:  plan.max_actuators,
        is_active:      plan.is_active,
        is_popular:     plan.is_popular,
      });
    }
  }, [plan?.plan_id]);

  if (!plan || !form) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const origPrice = Math.round(plan.price_cents / 100);
  const newPrice  = Math.round(form.price_cents / 100);

  const limitKeys = ["max_users","max_silos","max_warehouses","max_batches","max_sensors","max_actuators"];
  const changedCount =
    (newPrice !== origPrice ? 1 : 0) +
    limitKeys.filter((k) => form[k] !== ((plan as any)[k] ?? 0)).length;

  const t = theme(plan.plan_id);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="h-1.5 w-full" style={{ background: t.accent }} />
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#252d26]">Edit — {plan.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{plan.plan_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Price */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
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
                <div className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${newPrice > origPrice ? "text-[#2FAC0C]" : "text-red-500"}`}>
                  {newPrice > origPrice ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  was {fmt(origPrice)}
                </div>
              )}
            </div>
          </div>

          {/* Feature limits */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              Feature Limits
            </label>
            <div className="space-y-3">
              {LIMITS.map(({ key, icon: Icon, label, max }) => {
                const orig = Number((plan as any)[key] ?? 0);
                const cur  = Number(form[key] ?? 0);
                const diff = cur - orig;
                const pct  = Math.min(100, Math.round((cur / max) * 100));
                return (
                  <div key={key} className="rounded-lg border border-slate-100 p-3 space-y-2"
                    style={diff !== 0 ? { borderColor: diff > 0 ? "#bbf7d0" : "#fecaca", background: diff > 0 ? "rgba(47,172,12,0.03)" : "rgba(239,68,68,0.03)" } : {}}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-medium text-[#404F44]">
                        <Icon className="w-3.5 h-3.5 text-slate-400" /> {label}
                      </span>
                      <div className="flex items-center gap-2">
                        {diff !== 0 && (
                          <span className={`text-[10px] font-bold ${diff > 0 ? "text-[#2FAC0C]" : "text-red-500"}`}>
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
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: diff > 0 ? G : diff < 0 ? "#ef4444" : t.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
              Settings
            </label>
            <div className="space-y-2">
              {([
                { k: "is_active",  label: "Plan is active",    sub: "Visible and purchasable by tenants" },
                { k: "is_popular", label: "Mark as popular",   sub: "Highlights this plan on the pricing page" },
              ] as const).map(({ k, label, sub }) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-[#252d26]">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  <Switch checked={!!form[k]} onCheckedChange={(v) => set(k, v)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          {changedCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Bell className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">{changedCount} change{changedCount !== 1 ? "s" : ""}</span> — all tenants on this plan will be updated and notified.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
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
  const [editPlanId,   setEditPlanId]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("pending");

  const fetchPlans    = useServerFn(listPlanThresholds);
  const fetchRequests = useServerFn(listPlanChangeRequests);
  const savePlan      = useServerFn(updatePlanThreshold);
  const decide        = useServerFn(decidePlanChangeRequest);

  const plansQ = useQuery({ queryKey: ["plan-thresholds"], queryFn: () => fetchPlans() });
  const reqQ   = useQuery({
    queryKey: ["plan-change-requests", statusFilter],
    queryFn:  () => fetchRequests({ data: { status: statusFilter } }),
  });

  const plans: Plan[]   = plansQ.data ?? [];
  const requests: Req[] = reqQ.data   ?? [];
  const editPlan        = plans.find((p) => p.plan_id === editPlanId) ?? null;
  const pendingCount    = requests.filter((r) => r.status === "pending").length;

  const saveMut = useMutation({
    mutationFn: (v: any) => savePlan({ data: v }),
    onSuccess: () => {
      toast.success("Plan updated — affected tenants have been notified");
      qc.invalidateQueries({ queryKey: ["plan-thresholds"] });
      setEditPlanId(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string | null }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["plan-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  // ── Stats strip ────────────────────────────────────────────────────────────
  const StatStrip = () => (
    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 min-w-max sm:min-w-0">
        {plansQ.isLoading ? (
          [1,2,3,4].map((i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <SkeletonPulse className="h-7 w-10" />
              <SkeletonPulse className="h-3 w-20" />
            </div>
          ))
        ) : (
          [
            { label: "Total Plans",      value: plans.length },
            { label: "Active",           value: plans.filter((p) => p.is_active).length },
            { label: "Pending Requests", value: pendingCount, warn: pendingCount > 0 },
            { label: "Auto-applied",     value: requests.filter((r) => r.status === "auto_applied").length },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <div className={`text-2xl font-bold tabular-nums ${s.warn ? "text-amber-600" : "text-[#252d26]"}`}>
                {s.value}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AdminPageShell
      title="Plans & Thresholds"
      subtitle="Configure plan limits — changes propagate to all tenants on that plan instantly."
    >
      <StatStrip />

      {/* ── Plan cards ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Plan Tiers — click "Edit plan" to configure limits
        </p>
        {plansQ.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <PlanCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <PlanCard key={p.plan_id} plan={p} onEdit={() => setEditPlanId(p.plan_id)} />
            ))}
            {plans.length === 0 && (
              <div className="col-span-3 rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
                No plans configured yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Change requests ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Plan Change Requests
            </span>
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
                style={statusFilter === f
                  ? { background: G, color: "#fff" }
                  : { background: "#f1f5f9", color: "#475569" }}
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
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Change</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Direction</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {r.tenant_admin_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3.5 text-[#404F44]">
                      <span className="text-slate-400">{r.current_plan ?? "—"}</span>
                      {" → "}
                      <span className="font-semibold text-[#252d26]">{r.requested_plan}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={r.direction === "upgrade"
                          ? { background: GL, color: G }
                          : { background: "rgba(245,158,11,0.1)", color: "#b45309" }}
                      >
                        {r.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
                              decideMut.mutate({ id: r.id, approve: false, reason: reason.trim() });
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
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
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-10 text-sm">
                      No {statusFilter === "pending" ? "pending " : ""}requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
