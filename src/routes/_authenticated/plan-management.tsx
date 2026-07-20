import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertTriangle, Clock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyPlanState,
  previewPlanChange,
  initiatePlanChange,
  cancelScheduledPlanChange,
} from "@/lib/plan-upgrade.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

export const Route = createFileRoute("/_authenticated/plan-management")({
  component: PlanManagementPage,
});

type Cycle = "monthly" | "yearly";

function fmtPKR(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-PK")}`;
}

function PlanManagementPage() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading } = useIsSuperAdmin();

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") {
      navigate({ to: "/dashboard" });
    }
  }, [role, roleLoading, navigate]);

  const qc = useQueryClient();
  const [billing, setBilling] = useState<Cycle>("monthly");
  const [selected, setSelected] = useState<string | null>(null);

  const fetchState = useServerFn(getMyPlanState);
  const fetchPreview = useServerFn(previewPlanChange);
  const initiate = useServerFn(initiatePlanChange);
  const cancelScheduled = useServerFn(cancelScheduledPlanChange);

  const stateQ = useQuery({
    queryKey: ["my-plan-state"],
    queryFn: () => fetchState(),
    enabled: role === "admin",
  });

  const state = stateQ.data;
  const currentPlan = state?.current_plan ?? "basic";
  const currentCycle = (state?.current_cycle ?? "monthly") as Cycle;

  useEffect(() => {
    if (state) setBilling(state.current_cycle as Cycle);
  }, [state?.current_cycle]);

  const previewQ = useQuery({
    queryKey: ["plan-preview", selected, billing],
    enabled: !!selected && role === "admin",
    queryFn: () =>
      fetchPreview({ data: { requested_plan: selected as any, billing_cycle: billing } }),
  });

  const initiateMut = useMutation({
    mutationFn: (v: { requested_plan: string; billing_cycle: Cycle }) =>
      initiate({ data: v as any }),
    onSuccess: (res: any) => {
      if (res?.url) {
        toast.success("Redirecting to Stripe checkout…");
        window.open(res.url, "_blank");
      } else if (res?.scheduled) {
        toast.success(`Scheduled for ${new Date(res.apply_at).toLocaleDateString()}`);
      } else {
        toast.success("Plan updated");
      }
      qc.invalidateQueries({ queryKey: ["my-plan-state"] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelScheduled({ data: { id } }),
    onSuccess: () => {
      toast.success("Scheduled change cancelled");
      qc.invalidateQueries({ queryKey: ["my-plan-state"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  // Reflect Stripe redirect (?upgrade=success|cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("upgrade");
    if (s === "success") {
      toast.success("Payment received — your plan is being upgraded");
      qc.invalidateQueries({ queryKey: ["my-plan-state"] });
    } else if (s === "cancel") {
      toast.info("Upgrade cancelled");
    }
    if (s) {
      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      window.history.replaceState({}, "", url.toString());
    }
  }, [qc]);

  const plans = state?.plans ?? [];
  const currentPlanRow = useMemo(
    () => plans.find((p) => p.plan_id === currentPlan),
    [plans, currentPlan],
  );
  const pending = state?.pending ?? null;

  if (roleLoading || (role === "admin" && stateQ.isLoading)) {
    return (
      <AdminPageShell title="Plan management">
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminPageShell>
    );
  }

  if (role !== "admin") return null;

  return (
    <AdminPageShell
      title="Plan management"
      subtitle="Upgrade instantly with prorated PKR billing, or schedule a downgrade for the end of your current cycle."
    >
      {/* Current plan summary + billing toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                Current plan:{" "}
                <span className="text-emerald-600">
                  {currentPlanRow?.name ?? currentPlan}
                </span>{" "}
                <Badge variant="outline" className="ml-1 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                  {currentCycle}
                </Badge>
              </CardTitle>
              <CardDescription>
                {state?.current_period_end
                  ? `Renews / cycles at ${new Date(state.current_period_end).toLocaleDateString()}`
                  : "No active billing cycle recorded — next change will start a fresh cycle."}
              </CardDescription>
            </div>
            <BillingToggle billing={billing} setBilling={setBilling} />
          </div>
        </CardHeader>
      </Card>

      {/* Pending scheduled / pending payment banner */}
      {pending && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/10 text-amber-900 dark:text-amber-200 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              {pending.status === "scheduled" ? "Scheduled plan change" : "Awaiting Stripe payment"}
            </div>
            <div>
              {pending.current_plan ?? currentPlan} → <b>{pending.requested_plan}</b>{" "}
              ({pending.billing_cycle ?? "monthly"})
              {pending.apply_at ? ` — applies on ${new Date(pending.apply_at).toLocaleDateString()}` : ""}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(pending.id)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.plan_id === currentPlan && billing === currentCycle;
          const price = billing === "yearly" ? p.price_yearly_pkr : p.price_monthly_pkr;
          const monthlyEquiv = billing === "yearly" ? Math.round(price / 12) : price;
          const features = [
            `${p.limits.users === 999 ? "Unlimited" : p.limits.users} team members`,
            `${p.limits.silos} silos`,
            `${p.limits.batches === 9999 ? "Unlimited" : p.limits.batches} grain batches`,
            `${p.limits.sensors === 999 ? "Unlimited" : p.limits.sensors} IoT sensors`,
          ];
          return (
            <div
              key={p.plan_id}
              className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                isCurrent
                  ? "border-emerald-500 ring-1 ring-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-card to-card shadow-md"
                  : "border-border bg-card hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                {isCurrent && (
                  <Badge className="bg-emerald-600 text-white border-0">Current</Badge>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5 h-10">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={billing}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-3xl font-black tracking-tight text-foreground"
                  >
                    {fmtPKR(price)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs font-medium text-muted-foreground">
                  /{billing === "yearly" ? "yr" : "mo"}
                </span>
              </div>
              <div className="h-4 text-[11px] text-muted-foreground">
                {billing === "yearly" && `≈ ${fmtPKR(monthlyEquiv)}/mo · 2 months free`}
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-500">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full mt-5 ${
                  isCurrent
                    ? "bg-muted text-muted-foreground pointer-events-none"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                disabled={isCurrent}
                onClick={() => setSelected(p.plan_id)}
              >
                {isCurrent ? "Current plan" : "Change to this plan"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Preview / confirmation panel */}
      {selected && (
        <PreviewPanel
          loading={previewQ.isLoading}
          preview={previewQ.data}
          onCancel={() => setSelected(null)}
          onConfirm={() =>
            initiateMut.mutate({ requested_plan: selected, billing_cycle: billing })
          }
          pending={initiateMut.isPending}
        />
      )}
    </AdminPageShell>
  );
}

function BillingToggle({ billing, setBilling }: { billing: Cycle; setBilling: (c: Cycle) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
      {(["monthly", "yearly"] as const).map((period) => {
        const isActive = billing === period;
        return (
          <button
            key={period}
            type="button"
            onClick={() => setBilling(period)}
            className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="billing-pill"
                className="absolute inset-0 rounded-full bg-emerald-600"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 capitalize">{period}</span>
            {period === "yearly" && (
              <span className={`relative z-10 ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-600"
              }`}>
                2 MOS FREE
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PreviewPanel({
  loading, preview, onCancel, onConfirm, pending,
}: {
  loading: boolean;
  preview: any;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Card className="border-emerald-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Confirm plan change</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || !preview ? (
          <div className="py-6 flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculating prorated amount…
          </div>
        ) : preview.direction === "same" ? (
          <div className="text-sm text-muted-foreground">Already on this plan and cycle.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryTile label="From" value={`${preview.current_plan} (${preview.current_cycle})`} />
              <SummaryTile label="To" value={`${preview.new_plan} (${preview.new_cycle})`} />
              <SummaryTile
                label="Days remaining"
                value={`${preview.days_remaining} day${preview.days_remaining === 1 ? "" : "s"}`}
              />
            </div>
            {preview.apply_now ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
                  Charged today (prorated)
                </div>
                <div className="text-3xl font-black text-foreground mt-1">
                  {fmtPKR(preview.prorated_charge_pkr)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Full {preview.new_cycle} price {fmtPKR(preview.new_price_pkr)} · credit for unused days in current cycle applied.
                </div>
                <Button
                  onClick={onConfirm}
                  disabled={pending}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {pending ? "Preparing Stripe…" : `Pay ${fmtPKR(preview.prorated_charge_pkr)} now`}
                </Button>
                <Button variant="outline" onClick={onCancel} className="mt-4 ml-2">Cancel</Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/5 p-4">
                <div className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Scheduled at period end
                </div>
                <div className="text-sm text-foreground mt-1">
                  This is a {preview.direction}. It will apply on{" "}
                  <b>{new Date(preview.current_period_end).toLocaleDateString()}</b>.
                  You keep your current plan features until then, and no refund is issued.
                </div>
                <Button
                  onClick={onConfirm}
                  disabled={pending}
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {pending ? "Scheduling…" : "Schedule at period end"}
                </Button>
                <Button variant="outline" onClick={onCancel} className="mt-4 ml-2">Cancel</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
