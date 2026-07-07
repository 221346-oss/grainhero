import { createFileRoute, Link } from "@tanstack/react-router";
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
import { CreditCard, Package, Warehouse, Users, Cpu, Sparkles, XCircle, Calendar } from "lucide-react";
import { getMySubscription, cancelMySubscription } from "@/lib/billing.functions";
import { createStripeBillingPortalSession } from "@/lib/stripe-checkout.functions";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
});

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

function SubscriptionPage() {
  const fn = useServerFn(getMySubscription);
  const cancelFn = useServerFn(cancelMySubscription);
  const portalFn = useServerFn(createStripeBillingPortalSession);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-subscription"], queryFn: () => fn() });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");

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

  const role = data?.role ?? "pending";
  const sub = data?.subscription;
  const usage = data?.usage ?? { batches: 0, warehouses: 0, silos: 0, devices: 0, users: 0 };
  const invoices = data?.invoices ?? [];

  const canManage = ["super_admin", "admin"].includes(role);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CreditCard className="h-6 w-6 text-emerald-600" /> My Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your plan, usage and billing history.</p>
        </div>
        <div className="flex gap-2">
          {sub && (
            <Button variant="outline" onClick={() => portalM.mutate()} disabled={portalM.isPending}>
              {portalM.isPending ? "Opening…" : "Manage billing"}
            </Button>
          )}
          <Button asChild variant="outline"><Link to="/plans">Browse plans</Link></Button>
        </div>
      </div>

      {!sub && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Sparkles className="h-10 w-10 text-emerald-600 mx-auto" />
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
              <div><div className="text-xs uppercase text-slate-500 font-semibold">Price</div><div className="text-lg font-bold">{sub.currency ?? "USD"} {Number(sub.price_per_month).toFixed(2)}<span className="text-xs text-slate-500">/mo</span></div></div>
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
                      <span className="font-semibold">{inv.currency ?? "USD"} {Number(inv.amount).toFixed(2)}</span>
                      <Badge className={statusBadge(inv.status)}>{inv.status ?? "pending"}</Badge>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No invoices yet.</div>}
              </div>
            </CardContent>
          </Card>

          {canManage && sub.status !== "cancelled" && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" /> Cancel subscription
              </Button>
            </div>
          )}
        </>
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
    </div>
  );
}