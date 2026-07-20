import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Loader2, AlertTriangle, Clock, Sparkles, TrendingUp, Users, Boxes, Cpu,
  ShieldCheck, Zap, Flame, HeartHandshake, ArrowRight, CreditCard, ExternalLink,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyPlanState,
  previewPlanChange,
  initiatePlanChange,
  cancelScheduledPlanChange,
  acceptRetentionOffer,
  openBillingPortal,
} from "@/lib/plan-upgrade.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

export const Route = createFileRoute("/_authenticated/plan-management")({
  component: PlanManagementPage,
});

type Cycle = "monthly" | "yearly";
const PLAN_ORDER = ["basic", "intermediate", "pro"] as const;
const PLAN_RANK: Record<string, number> = { basic: 1, intermediate: 2, pro: 3 };

const DOWNGRADE_REASONS = [
  { id: "too_expensive", label: "Too expensive right now" },
  { id: "not_using_features", label: "I'm not using the extra features" },
  { id: "seasonal_slowdown", label: "Seasonal slowdown — will come back" },
  { id: "switching_provider", label: "Switching to another provider" },
  { id: "technical_issues", label: "Ran into technical issues" },
  { id: "other", label: "Other" },
] as const;

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
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<string>("too_expensive");
  const [reasonDetails, setReasonDetails] = useState("");

  const fetchState = useServerFn(getMyPlanState);
  const fetchPreview = useServerFn(previewPlanChange);
  const initiate = useServerFn(initiatePlanChange);
  const cancelScheduled = useServerFn(cancelScheduledPlanChange);
  const acceptOffer = useServerFn(acceptRetentionOffer);
  const openPortal = useServerFn(openBillingPortal);

  const portalMut = useMutation({
    mutationFn: () => openPortal(),
    onSuccess: (res: any) => {
      if (res?.url) window.open(res.url, "_blank");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not open billing portal"),
  });

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
    mutationFn: (v: {
      requested_plan: string; billing_cycle: Cycle;
      downgrade_reason?: string; downgrade_reason_details?: string;
      retention_offer_declined?: boolean;
    }) =>
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
      setReasonOpen(false);
      setReasonDetails("");
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

  const acceptMut = useMutation({
    mutationFn: () => acceptOffer(),
    onSuccess: (res: any) => {
      toast.success(`Saved! ${res.discount_pct}% off applied to your next 3 cycles.`);
      qc.invalidateQueries({ queryKey: ["my-plan-state"] });
      setRetentionOpen(false);
      setSelected(null);
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
  const usage = state?.usage ?? { silos: 0, users: 0, sensors: 0, actuators: 0 };
  const retention = state?.retention ?? { discount_pct: 0, active_until: null, offer_used_at: null, offer_available: true };

  // Recommend a plan when usage is >= 70% of current limits on any dimension.
  const recommendedPlanId = useMemo(() => {
    if (!currentPlanRow) return null;
    const l = currentPlanRow.limits;
    const pct = (used: number, cap: number) => (cap > 0 ? used / cap : 0);
    const hot =
      pct(usage.silos, l.silos) >= 0.7 ||
      pct(usage.users, l.users) >= 0.7 ||
      pct(usage.sensors, l.sensors) >= 0.7;
    if (!hot) return null;
    const idx = PLAN_ORDER.indexOf(currentPlan as any);
    const next = idx >= 0 && idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
    return next;
  }, [currentPlanRow, usage, currentPlan]);

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

  // What the user just clicked — used to intercept downgrades.
  const selectedRank = selected ? (PLAN_RANK[selected] ?? 0) : 0;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const isDowngradeIntent = !!selected && selectedRank < currentRank;

  const openIntent = (planId: string) => {
    setSelected(planId);
    const nextRank = PLAN_RANK[planId] ?? 0;
    if (nextRank < currentRank) {
      // Downgrade — offer retention first if available
      if (retention.offer_available) setRetentionOpen(true);
      else setReasonOpen(true);
    }
  };

  const confirmDowngradeWithReason = () => {
    if (!selected) return;
    initiateMut.mutate({
      requested_plan: selected,
      billing_cycle: billing,
      downgrade_reason: reason,
      downgrade_reason_details: reasonDetails || undefined,
      retention_offer_declined: true,
    });
  };

  return (
    <AdminPageShell
      title="Grow with GrainHero"
      subtitle="See exactly how much capacity you're using, what unlocks at each tier, and get an instant prorated upgrade."
    >
      {/* Hero + usage snapshot */}
      <HeroBanner
        planName={currentPlanRow?.name ?? currentPlan}
        cycle={currentCycle}
        periodEnd={state?.current_period_end ?? null}
        billing={billing}
        setBilling={setBilling}
        retention={retention}
        onManageBilling={() => portalMut.mutate()}
        portalLoading={portalMut.isPending}
      />

      {currentPlanRow && (
        <UsageStrip
          limits={currentPlanRow.limits}
          usage={usage}
          hasRecommendation={!!recommendedPlanId}
        />
      )}

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
          const isRecommended = recommendedPlanId === p.plan_id;
          const rank = PLAN_RANK[p.plan_id] ?? 0;
          const isDowngrade = rank < currentRank;
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
                isRecommended
                  ? "border-emerald-500 ring-2 ring-emerald-500/50 bg-gradient-to-b from-emerald-500/15 via-card to-card shadow-lg"
                  : isCurrent
                  ? "border-emerald-500 ring-1 ring-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-card to-card shadow-md"
                  : "border-border bg-card hover:shadow-md"
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 shadow-md">
                    <Sparkles className="h-3 w-3" /> Best for you
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {p.name}
                  {p.plan_id === "pro" && <Flame className="h-3.5 w-3.5 text-amber-500" />}
                </h3>
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
                    : isDowngrade
                    ? "bg-card border border-border text-foreground hover:bg-muted"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                variant={isDowngrade ? "outline" : "default"}
                disabled={isCurrent}
                onClick={() => openIntent(p.plan_id)}
              >
                {isCurrent ? "Current plan" : isDowngrade ? "Downgrade" : (
                  <span className="inline-flex items-center gap-1.5">
                    Upgrade now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Preview / confirmation panel — only for upgrades / cycle changes */}
      {selected && !isDowngradeIntent && (
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

      {/* ROI + comparison + social proof */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RoiCalculator currentPlan={currentPlan} />
        <ValueMatrix plans={plans} currentPlanId={currentPlan} />
      </div>

      <SocialProofStrip />

      {/* Retention save-offer dialog */}
      <Dialog open={retentionOpen} onOpenChange={setRetentionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">Wait — a gift before you go</DialogTitle>
            <DialogDescription className="text-center">
              Stay on <b>{currentPlanRow?.name ?? currentPlan}</b> and we'll take{" "}
              <span className="text-emerald-600 font-bold">20% off</span> your next{" "}
              <b>3 billing cycles</b>. One tap. No card change.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-foreground/80">
            <div className="flex items-center justify-between">
              <span>Your next {currentCycle} bill</span>
              <span className="text-right">
                <span className="line-through text-muted-foreground mr-2">
                  {fmtPKR(currentCycle === "yearly" ? (currentPlanRow?.price_yearly_pkr ?? 0) : (currentPlanRow?.price_monthly_pkr ?? 0))}
                </span>
                <b className="text-emerald-600">
                  {fmtPKR((currentCycle === "yearly" ? (currentPlanRow?.price_yearly_pkr ?? 0) : (currentPlanRow?.price_monthly_pkr ?? 0)) * 0.8)}
                </b>
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={() => acceptMut.mutate()}
              disabled={acceptMut.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {acceptMut.isPending ? "Applying…" : "Yes, keep my plan & save 20%"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => { setRetentionOpen(false); setReasonOpen(true); }}
            >
              No thanks, continue downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason capture dialog */}
      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Help us do better</DialogTitle>
            <DialogDescription>
              Quick — what's the main reason for downgrading? This shapes what we build next.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {DOWNGRADE_REASONS.map((r) => (
              <label
                key={r.id}
                htmlFor={`r-${r.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem id={`r-${r.id}`} value={r.id} />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="reason-details" className="text-xs text-muted-foreground">
              Anything else? (optional)
            </Label>
            <Textarea
              id="reason-details"
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="What would have made you stay?"
              rows={3}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReasonOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDowngradeWithReason}
              disabled={initiateMut.isPending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {initiateMut.isPending ? "Scheduling…" : "Schedule downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

/* ------------------------- Hero + Usage + Persuasion ------------------------- */

function HeroBanner({
  planName, cycle, periodEnd, billing, setBilling, retention, onManageBilling, portalLoading,
}: {
  planName: string; cycle: Cycle; periodEnd: string | null;
  billing: Cycle; setBilling: (c: Cycle) => void;
  retention: { discount_pct: number; active_until: string | null; offer_used_at: string | null; offer_available: boolean };
  onManageBilling: () => void; portalLoading: boolean;
}) {
  const hasDiscount = retention.discount_pct > 0 && retention.active_until && new Date(retention.active_until) > new Date();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 md:p-6">
      <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
            <ShieldCheck className="h-3 w-3" /> Your current plan
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {planName} <span className="text-muted-foreground font-medium">·</span>{" "}
            <span className="capitalize text-emerald-600">{cycle}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {periodEnd
              ? `Renews on ${new Date(periodEnd).toLocaleDateString()}`
              : "First cycle starts on your next change."}
            {hasDiscount && (
              <> · <span className="text-emerald-600 font-semibold">{retention.discount_pct}% loyalty discount active</span> until {new Date(retention.active_until!).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
            <Zap className="h-3 w-3" /> Limited: 2 months free on yearly
          </div>
          <BillingToggle billing={billing} setBilling={setBilling} />
          <button
            type="button"
            onClick={onManageBilling}
            disabled={portalLoading}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-50"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {portalLoading ? "Opening…" : "Manage billing & invoices"}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageStrip({
  limits, usage, hasRecommendation,
}: {
  limits: { users: number; silos: number; batches: number; sensors: number };
  usage: { silos: number; users: number; sensors: number; actuators: number };
  hasRecommendation: boolean;
}) {
  const items = [
    { icon: Boxes, label: "Silos", used: usage.silos, cap: limits.silos },
    { icon: Users, label: "Team members", used: usage.users, cap: limits.users },
    { icon: Cpu, label: "IoT sensors", used: usage.sensors, cap: limits.sensors },
  ];
  return (
    <Card className={hasRecommendation ? "border-amber-400/40" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            Where you are on your plan
          </CardTitle>
          {hasRecommendation && (
            <Badge className="bg-amber-500 text-white border-0 gap-1">
              <TrendingUp className="h-3 w-3" /> Nearing limits
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((it) => {
            const pct = it.cap > 0 ? Math.min(100, Math.round((it.used / it.cap) * 100)) : 0;
            const hot = pct >= 70;
            const critical = pct >= 90;
            return (
              <div key={it.label} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <it.icon className="h-3.5 w-3.5" />
                    {it.label}
                  </span>
                  <span className={`font-bold ${critical ? "text-red-600" : hot ? "text-amber-600" : "text-foreground"}`}>
                    {it.used} / {it.cap === 999 || it.cap === 9999 ? "∞" : it.cap}
                  </span>
                </div>
                <Progress
                  value={pct}
                  className={`mt-2 h-2 ${critical ? "[&>div]:bg-red-500" : hot ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`}
                />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {critical ? "You're about to hit the ceiling" : hot ? "Getting close — upgrade unlocks more" : "Plenty of room"}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RoiCalculator({ currentPlan }: { currentPlan: string }) {
  // A simple, honest ROI card — spoilage prevention alone typically pays back the upgrade.
  const spoilagePctSavings = currentPlan === "basic" ? 1.5 : currentPlan === "intermediate" ? 0.75 : 0.25;
  return (
    <Card className="md:col-span-1 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> Estimated upside
        </CardTitle>
        <CardDescription className="text-xs">If you upgrade to the next tier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Extra silos monitored" value="+2 to +5" />
        <Row label="Sensor coverage" value="+50%" />
        <Row
          label="Est. spoilage reduction"
          value={<span className="text-emerald-600 font-bold">~{spoilagePctSavings}% of stock value</span>}
        />
        <div className="rounded-md border border-dashed border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[11px] text-foreground/80">
          For a mid-size operator, that's typically <b className="text-emerald-600">10×</b> the upgrade cost recovered each month.
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ValueMatrix({ plans, currentPlanId }: { plans: any[]; currentPlanId: string }) {
  const rows: { label: string; key: keyof any; format?: (n: number) => string }[] = [
    { label: "Team members", key: "users", format: (n) => (n >= 999 ? "Unlimited" : String(n)) },
    { label: "Silos", key: "silos" },
    { label: "Grain batches", key: "batches", format: (n) => (n >= 9999 ? "Unlimited" : String(n)) },
    { label: "IoT sensors", key: "sensors", format: (n) => (n >= 999 ? "Unlimited" : String(n)) },
  ];
  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">What you unlock at each tier</CardTitle>
        <CardDescription className="text-xs">Side-by-side so there's no guessing.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-medium py-2 pr-2">Capability</th>
              {plans.map((p) => (
                <th key={p.plan_id} className="text-right font-semibold py-2 px-2">
                  <span className={p.plan_id === currentPlanId ? "text-emerald-600" : "text-foreground"}>
                    {p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="py-2 pr-2 text-foreground/80">{r.label}</td>
                {plans.map((p) => {
                  const raw = p.limits?.[r.key as string] as number;
                  const text = r.format ? r.format(raw ?? 0) : String(raw ?? 0);
                  return (
                    <td
                      key={p.plan_id}
                      className={`py-2 px-2 text-right font-semibold ${
                        p.plan_id === currentPlanId ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="py-2 pr-2 text-foreground/80">Priority support</td>
              <td className="py-2 px-2 text-right text-muted-foreground">Email</td>
              <td className="py-2 px-2 text-right font-semibold">Chat + Email</td>
              <td className="py-2 px-2 text-right font-semibold text-emerald-600">24×7 + SLA</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SocialProofStrip() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex -space-x-2">
            {["A", "R", "M", "K"].map((c, i) => (
              <div
                key={i}
                className="h-7 w-7 rounded-full ring-2 ring-card bg-emerald-500/20 text-emerald-700 grid place-items-center text-[11px] font-bold"
              >
                {c}
              </div>
            ))}
          </div>
          <div>
            <div className="font-semibold text-foreground">Trusted by 120+ grain operators</div>
            <div className="text-xs text-muted-foreground">Across Punjab, Sindh, and KP</div>
          </div>
        </div>
        <div className="hidden md:block h-8 w-px bg-border" />
        <blockquote className="text-sm text-foreground/80 italic">
          "Upgrading to Professional paid for itself in the first month — we caught two moisture spikes before they became losses."
          <span className="not-italic text-xs text-muted-foreground block mt-0.5">— Farm operator, Multan</span>
        </blockquote>
      </div>
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
