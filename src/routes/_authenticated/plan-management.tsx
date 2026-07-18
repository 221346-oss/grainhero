import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPlanThresholds,
  listPlanChangeRequests,
  requestPlanChange,
  cancelPlanChangeRequest,
  setAutoUpgrade,
} from "@/lib/plan-thresholds.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile } from "@/hooks/useMyProfile";

export const Route = createFileRoute("/_authenticated/plan-management")({
  component: PlanManagementPage,
});

function PlanManagementPage() {
  const qc = useQueryClient();
  const profile = useMyProfile();
  const currentPlan = (profile.data as any)?.subscription_plan ?? "starter";
  const autoUpgrade = (profile.data as any)?.auto_upgrade_enabled === true;

  const [note, setNote] = useState("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const fetchPlans = useServerFn(listPlanThresholds);
  const fetchRequests = useServerFn(listPlanChangeRequests);
  const request = useServerFn(requestPlanChange);
  const cancel = useServerFn(cancelPlanChangeRequest);
  const setAuto = useServerFn(setAutoUpgrade);

  const plansQ = useQuery({ queryKey: ["plan-thresholds"], queryFn: () => fetchPlans() });
  const reqQ = useQuery({
    queryKey: ["my-plan-change-requests"],
    queryFn: () => fetchRequests({ data: { status: "all" } }),
  });

  const plans = plansQ.data ?? [];
  const requests = reqQ.data ?? [];
  const current = plans.find((p: any) => p.plan_id === currentPlan);

  const tiles = useMemo(
    () => [
      { key: "plan", label: "Current plan", value: current?.name ?? currentPlan },
      { key: "price", label: "Monthly", value: current ? `$${(current.price_cents / 100).toFixed(0)}` : "—" },
      { key: "pending", label: "Pending requests", value: requests.filter((r: any) => r.status === "pending").length },
      { key: "auto", label: "Auto-upgrade", value: autoUpgrade ? "On" : "Off" },
    ],
    [current, currentPlan, requests, autoUpgrade],
  );

  const reqMut = useMutation({
    mutationFn: (v: { requested_plan: string }) => request({ data: { ...v, note: note || null } }),
    onSuccess: (res: any) => {
      toast.success(res.auto_applied ? "Upgrade applied automatically" : "Change requested — awaiting super admin");
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-plan-change-requests"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Request cancelled");
      qc.invalidateQueries({ queryKey: ["my-plan-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const autoMut = useMutation({
    mutationFn: (enabled: boolean) => setAuto({ data: { enabled } }),
    onSuccess: () => {
      toast.success("Preference saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  return (
    <AdminPageShell
      title="Plan management"
      subtitle="Compare plans, request an upgrade or downgrade, and manage auto-upgrade."
    >
      <AdminSummaryTiles tiles={tiles} columns={4} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preferences</CardTitle>
          <CardDescription>Auto-approve upgrades so they apply without super-admin review.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-slate-700">Automatically apply upgrade requests</div>
          <Switch checked={autoUpgrade} onCheckedChange={(v) => autoMut.mutate(v)} disabled={autoMut.isPending} />
        </CardContent>
      </Card>

      {/* Pricing section — animated billing toggle + highlighted tier */}
      <div className="py-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Plans that scale with you
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Whether you're just starting out or running silos at scale, there's a plan that fits your operation.
          </p>

          {/* Animated monthly / yearly toggle */}
          <div className="mt-7 inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
            {(["monthly", "yearly"] as const).map((period) => {
              const isActive = billing === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBilling(period)}
                  className={`relative px-5 py-2 text-sm font-semibold rounded-full transition-colors ${
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
                    <span className={`relative z-10 ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-600"
                    }`}>
                      -20%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-6xl mx-auto">
          {plans.map((p: any, idx: number) => {
            const isCurrent = p.plan_id === currentPlan;
            const currentIdx = plans.findIndex((x: any) => x.plan_id === currentPlan);
            const isHighlighted = currentIdx >= 0 && currentIdx < plans.length - 1
              ? idx === currentIdx + 1
              : idx === plans.length - 1;
            const monthly = p.price_cents / 100;
            const shown = billing === "yearly" ? monthly * 0.8 : monthly;
            const features = [
              `${p.max_users} team member${p.max_users === 1 ? "" : "s"}`,
              `${p.max_silos} silo${p.max_silos === 1 ? "" : "s"}`,
              `${p.max_batches} grain batches`,
              `${p.max_sensors} IoT sensors`,
            ];
            return (
              <div
                key={p.plan_id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  isHighlighted
                    ? "border-emerald-500 ring-1 ring-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-card to-card shadow-xl shadow-emerald-500/10 lg:-translate-y-2"
                    : "border-border bg-card shadow-sm hover:shadow-md"
                }`}
              >
                {isHighlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white border-0 px-3 shadow">
                    Popular
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                  {isCurrent && <Badge variant="outline" className="border-emerald-400 text-emerald-600">Current</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {idx === 0 ? "For getting started" : isHighlighted ? "For growing operations" : idx === plans.length - 1 ? "For large-scale operations" : "For most teams"}
                </p>
                <div className="mt-5 flex items-baseline gap-1.5 h-12">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={billing}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-black tracking-tight text-foreground"
                    >
                      ${shown % 1 === 0 ? shown.toFixed(0) : shown.toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm font-medium text-muted-foreground">/month</span>
                </div>
                <div className="h-4 text-[11px] text-muted-foreground">
                  {billing === "yearly" && monthly > 0 && `$${(shown * 12).toFixed(0)} billed annually`}
                </div>
                <ul className="mt-5 space-y-3 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${isHighlighted ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-6 disabled:opacity-50 ${
                    isHighlighted
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-transparent hover:bg-muted text-foreground border border-border"
                  }`}
                  disabled={isCurrent || reqMut.isPending}
                  onClick={() => reqMut.mutate({ requested_plan: p.plan_id })}
                >
                  {isCurrent ? "Current plan" : idx < currentIdx ? "Request downgrade" : "Request upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Note (optional)</CardTitle>
          <CardDescription>Attach a note to your next plan-change request.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you upgrading/downgrading?"
            rows={2}
          />
        </CardContent>
      </Card>

      <AdminDataCard title="Request history" description={`${requests.length} total`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Requested</th>
              <th className="text-left px-2 py-2 font-medium">From → To</th>
              <th className="text-left px-2 py-2 font-medium">Direction</th>
              <th className="text-left px-2 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="">
            {requests.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-2 py-2 text-slate-700">
                  {r.current_plan ?? "—"} → <span className="font-medium">{r.requested_plan}</span>
                </td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className={r.direction === "upgrade" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
                    {r.direction}
                  </Badge>
                </td>
                <td className="px-2 py-2">
                  <Badge variant="outline" className="text-slate-600">{r.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  {r.status === "pending" ? (
                    <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(r.id)}>Cancel</Button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !reqQ.isLoading && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">No requests yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>
    </AdminPageShell>
  );
}