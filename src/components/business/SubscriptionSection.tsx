import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Package, Warehouse, Users, Cpu, XCircle, Calendar, ArrowUpRight, RotateCcw, Loader2 } from "lucide-react";
import { getMySubscription, cancelMySubscription } from "@/lib/billing.functions";
import { createStripeBillingPortalSession } from "@/lib/stripe-checkout.functions";
import { changeMyPlan, cancelAtPeriodEnd, resumeSubscription } from "@/lib/subscription-management.functions";
import { getAllSubscriptions } from "@/lib/platform-no-admin.functions";
import { getMyRole } from "@/lib/roles.functions";
import pricingData from "@/lib/pricing-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { SubscriptionSkeleton } from "@/components/app/skeletons";

function statusBadge(s: string | null | undefined) {
  switch (s) {
    case "active": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "trial": return "bg-blue-100 text-blue-800 border-blue-200";
    case "cancelled": return "bg-red-100 text-red-800 border-red-200";
    case "expired": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function UsageRow({ icon: Icon, label, used, max }: { icon: any; label: string; used: number; max: number | null }) {
  const limit = max ?? 0;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-2 text-slate-700"><Icon className="h-4 w-4" />{label}</span>
        <span className="font-medium text-slate-900">{used}{limit > 0 ? ` / ${limit}` : ""}</span>
      </div>
      {limit > 0 && <Progress value={pct} className="h-2" />}
    </div>
  );
}

export function SubscriptionSection() {
  const fn = useServerFn(getMySubscription);
  const cancelFn = useServerFn(cancelMySubscription);
  const portalFn = useServerFn(createStripeBillingPortalSession);
  const changeFn = useServerFn(changeMyPlan);
  const cancelPeriodFn = useServerFn(cancelAtPeriodEnd);
  const resumeFn = useServerFn(resumeSubscription);
  const roleFn = useServerFn(getMyRole);
  const allSubsFn = useServerFn(getAllSubscriptions);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-subscription"], queryFn: () => fn() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });

  const isSuperAdmin = (roleData?.role ?? data?.role ?? "pending") === "super_admin";

  // Fetch all subscriptions if super admin
  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => allSubsFn(),
    enabled: isSuperAdmin
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<"basic" | "intermediate" | "pro">("intermediate");

  const cancelM = useMutation({
    mutationFn: () => cancelFn({ data: { reason: reason || undefined } }),
    onSuccess: () => { toast.success("Subscription cancelled"); setConfirmOpen(false); qc.invalidateQueries({ queryKey: ["my-subscription"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to cancel"),
  });

  const portalM = useMutation({
    mutationFn: () => portalFn(),
    onSuccess: ({ url }: { url: string }) => { window.location.href = url; },
    onError: (e: any) => toast.error(e.message ?? "Could not open billing portal"),
  });

  const changeM = useMutation({
    mutationFn: () => changeFn({ data: { planId: newPlan } }),
    onSuccess: () => { toast.success("Plan updated"); setChangeOpen(false); qc.invalidateQueries({ queryKey: ["my-subscription"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to change plan"),
  });
  const cancelPeriodM = useMutation({
    mutationFn: () => cancelPeriodFn(),
    onSuccess: () => { toast.success("Will cancel at period end"); qc.invalidateQueries({ queryKey: ["my-subscription"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const resumeM = useMutation({
    mutationFn: () => resumeFn(),
    onSuccess: () => { toast.success("Subscription resumed"); qc.invalidateQueries({ queryKey: ["my-subscription"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const role = data?.role ?? "pending";
  const sub = data?.subscription;
  const usage = data?.usage ?? { batches: 0, warehouses: 0, silos: 0, devices: 0, users: 0 };
  const invoices = data?.invoices ?? [];

  const canManage = ["super_admin", "admin"].includes(role);

  if (isLoading) return <SubscriptionSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Manage your plan, usage and billing history.</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sub && (
            <Button variant="outline" size="sm" onClick={() => portalM.mutate()} disabled={portalM.isPending}>
              {portalM.isPending ? "Opening…" : "Manage billing"}
            </Button>
          )}
          {sub && canManage && sub.status !== "cancelled" && (
            <Button variant="outline" size="sm" onClick={() => { setNewPlan((sub.plan_name?.toLowerCase().includes("pro") ? "pro" : sub.plan_name?.toLowerCase().includes("inter") ? "intermediate" : "basic") as any); setChangeOpen(true); }}>
              <ArrowUpRight className="h-4 w-4 mr-2" /> Change plan
            </Button>
          )}
          <Button asChild variant="outline" size="sm"><Link to="/plans">Browse plans</Link></Button>
        </div>
      </div>

      {!sub && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-lg font-semibold text-slate-900">No active subscription</div>
            <p className="text-sm text-slate-500 max-w-md mx-auto">You&apos;re not on a paid plan yet. Pick one to unlock warehouses, silos and AI predictions at scale.</p>
            <Button asChild><Link to="/plans">Choose a plan</Link></Button>
          </CardContent>
        </Card>
      )}

      {sub && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-xl">{sub.plan_name}</CardTitle>
                  <CardDescription className="mt-1">{sub.plan_description ?? "Your current plan"}</CardDescription>
                </div>
                <Badge className={statusBadge(sub.status)}>{sub.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
              <div><div className="text-xs uppercase text-slate-500 font-semibold">Price</div><div className="text-lg font-bold">{sub.currency ?? "PKR"} {Number(sub.price_per_month).toFixed(2)}<span className="text-xs text-slate-500">/mo</span></div></div>
              <div><div className="text-xs uppercase text-slate-500 font-semibold">Billing cycle</div><div className="text-lg font-bold capitalize">{sub.billing_cycle ?? "monthly"}</div></div>
              <div><div className="text-xs uppercase text-slate-500 font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" />Renews</div><div className="text-lg font-bold">{sub.next_payment_date ? new Date(sub.next_payment_date).toLocaleDateString() : "—"}</div></div>
              <div><div className="text-xs uppercase text-slate-500 font-semibold">Auto-renew</div><div className="text-lg font-bold">{sub.auto_renew ? "On" : "Off"}</div></div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Usage</CardTitle><CardDescription>Current consumption vs plan limits</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <UsageRow icon={Package} label="Batches" used={usage.batches} max={sub.max_batches} />
                <UsageRow icon={Warehouse} label="Silos" used={usage.silos} max={null} />
                <UsageRow icon={Cpu} label="Devices" used={usage.devices} max={sub.max_devices} />
                <UsageRow icon={Users} label="Team members" used={usage.users} max={sub.max_users} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Included features</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["AI features", sub.ai_features],
                  ["Advanced analytics", sub.advanced_analytics],
                  ["Priority support", sub.priority_support],
                  ["Custom integrations", sub.custom_integrations],
                ].map(([label, on]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-slate-700">{label as string}</span>
                    <Badge variant="outline" className={on ? "border-emerald-200 text-emerald-700" : "text-slate-500"}>{on ? "Enabled" : "—"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Billing history</CardTitle><CardDescription>{invoices.length} recent invoice(s)</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{inv.invoice_number ?? inv.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">{inv.billing_date ? new Date(inv.billing_date).toLocaleDateString() : "—"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{inv.currency ?? "PKR"} {Number(inv.amount).toFixed(2)}</span>
                      <Badge className={statusBadge(inv.status)}>{inv.status ?? "pending"}</Badge>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No invoices yet.</div>}
              </div>
            </CardContent>
          </Card>

          {canManage && sub.status !== "cancelled" && (
            <div className="flex justify-end gap-2">
              {(sub as any).cancel_at_period_end ? (
                <Button variant="outline" onClick={() => resumeM.mutate()} disabled={resumeM.isPending}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Resume subscription
                </Button>
              ) : (
                <Button variant="outline" onClick={() => cancelPeriodM.mutate()} disabled={cancelPeriodM.isPending}>
                  <Calendar className="h-4 w-4 mr-2" /> Cancel at period end
                </Button>
              )}
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancel now
              </Button>
            </div>
          )}
        </>
      )}

      {/* Super Admin: Show all subscriptions */}
      {isSuperAdmin && allSubs.length > 0 && (
        <AdminDataCard title="All platform subscriptions" description={`${allSubs.length} subscriptions`}>
          <div className="divide-y divide-slate-100">
            {allSubs.map((s: any) => {
              const daysLeft = s.next_payment_date ? Math.ceil((new Date(s.next_payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              const expiryText = daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : "Expired") : "N/A";
              const expiryColor = daysLeft !== null && daysLeft <= 7 ? "text-red-600" : daysLeft !== null && daysLeft <= 30 ? "text-amber-600" : "text-slate-500";
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{s.user_name}</div>
                    <div className="text-xs text-slate-500 truncate">{s.user_email} · {s.business_type}</div>
                  </div>
                  <Badge variant="outline" className={statusBadge(s.status)}>{s.status}</Badge>
                  <span className="text-sm font-medium text-slate-700">{s.plan_name}</span>
                  <div className="flex flex-col items-end gap-0.5 min-w-[110px]">
                    <span className="text-sm font-bold text-slate-900">{s.currency ?? "PKR"} {Number(s.monthly_price ?? 0).toFixed(0)}<span className="text-xs text-slate-500">/mo</span></span>
                    <div className={`text-[10px] font-medium ${expiryColor}`}>Expires: {expiryText}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminDataCard>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>Your plan will stay active until the end of the current period. Optionally tell us why:</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep plan</Button>
            <Button variant="destructive" onClick={() => cancelM.mutate()} disabled={cancelM.isPending}>Confirm cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>The change applies immediately with prorated billing on your next invoice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newPlan} onValueChange={(v) => setNewPlan(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {pricingData.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.currency ?? "PKR"} {p.price}/mo</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>Cancel</Button>
            <Button onClick={() => changeM.mutate()} disabled={changeM.isPending}>
              {changeM.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
