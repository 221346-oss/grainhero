import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, RotateCcw, XCircle, MoreHorizontal } from "lucide-react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { SubscriptionSkeleton } from "@/components/app/skeletons";
import { getAllSubscriptions } from "@/lib/platform-no-admin.functions";
import { getMyRole } from "@/lib/roles.functions";
import { adminChangeUserPlan, adminCancelSubscription, adminResumeSubscription, adminSyncSubscription, adminReconcileAllSubscriptions } from "@/lib/admin-subscriptions.functions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import pricingData from "@/lib/pricing-data";

export const Route = createFileRoute("/_authenticated/platform/subscriptions")({
  head: () => ({
    meta: [
      { title: "Platform · Subscriptions — Grain Hero" },
      { name: "description", content: "Platform · Subscriptions workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Subscriptions — Grain Hero" },
      { property: "og:description", content: "Platform · Subscriptions workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformSubscriptionsPage,
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

function PlatformSubscriptionsPage() {
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => useServerFn(getMyRole)() });
  const allSubsFn = useServerFn(getAllSubscriptions);
  const adminChangeFn = useServerFn(adminChangeUserPlan);
  const adminCancelFn = useServerFn(adminCancelSubscription);
  const adminResumeFn = useServerFn(adminResumeSubscription);
  const adminSyncFn = useServerFn(adminSyncSubscription);
  const adminReconcileFn = useServerFn(adminReconcileAllSubscriptions);
  const qc = useQueryClient();
  
  const role = roleQ.data?.role ?? "pending";
  const isSuperAdmin = role === "super_admin";

  const { data: allSubs = [], isLoading } = useQuery({ 
    queryKey: ["all-subscriptions"], 
    queryFn: () => allSubsFn(),
    enabled: isSuperAdmin
  });

  async function runAdmin(op: () => Promise<any>, successMsg: string) {
    try { 
      await op(); 
      toast.success(successMsg); 
      qc.invalidateQueries({ queryKey: ["all-subscriptions"] }); 
    }
    catch (e: any) { 
      toast.error(e?.message ?? "Action failed"); 
    }
  }

  if (!isSuperAdmin) {
    return (
      <AdminPageShell title="Subscriptions" subtitle="Access restricted">
        <div className="p-8 text-center text-sm text-muted-foreground">Subscriptions workspace is available to super admins only.</div>
      </AdminPageShell>
    );
  }

  if (isLoading) return <AdminPageShell title="Subscriptions" subtitle="Platform subscriptions"><SubscriptionSkeleton /></AdminPageShell>;

  return (
    <AdminPageShell 
      title="Subscriptions" 
      subtitle="Platform subscriptions and billing"
      actions={
        <Button variant="outline" size="sm" onClick={() => runAdmin(() => adminReconcileFn(), "Reconciled from Stripe")}>
          <RotateCcw className="h-4 w-4 mr-2" /> Sync all from Stripe
        </Button>
      }
    >
      <AdminDataCard title="All subscriptions" description={`${allSubs.length} subscription${allSubs.length === 1 ? "" : "s"} · manage plans, cancel or resume from here`}>
        {allSubs.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No tenant subscriptions yet.</div>
        )}
        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Expires</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allSubs.map((s: any) => {
                const daysLeft = s.next_payment_date ? Math.ceil((new Date(s.next_payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const expiryText = daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : "Expired") : "N/A";
                const expiryColor = daysLeft !== null && daysLeft <= 7 ? "text-red-600" : daysLeft !== null && daysLeft <= 30 ? "text-amber-600" : "text-slate-500";
                return (
                  <tr key={s.id} className="border-b hover:bg-slate-50 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.user_name}</div>
                      <div className="text-xs text-slate-500">{s.user_email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{s.plan_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusBadge(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{s.currency ?? "PKR"} {Number(s.monthly_price ?? 0).toFixed(0)}<span className="text-xs text-slate-500">/mo</span></td>
                    <td className={`px-4 py-3 text-[10px] font-medium ${expiryColor}`}>{expiryText}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-[11px]">Change plan</DropdownMenuLabel>
                          {pricingData.map((p: any) => (
                            <DropdownMenuItem key={p.id} onClick={() => runAdmin(() => adminChangeFn({ data: { subscriptionId: s.id, planId: p.id } }), `Moved ${s.user_name} to ${p.name}`)}>
                              <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> {p.name} — {p.currency ?? "PKR"} {p.price}/mo
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => runAdmin(() => adminCancelFn({ data: { subscriptionId: s.id, immediate: false } }), "Will cancel at period end")}>
                            Cancel at period end
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => runAdmin(() => adminResumeFn({ data: { subscriptionId: s.id } }), "Subscription resumed")}>
                            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Resume
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => runAdmin(() => adminCancelFn({ data: { subscriptionId: s.id, immediate: true } }), "Subscription cancelled")}>
                            <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel immediately
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => runAdmin(() => adminSyncFn({ data: { subscriptionId: s.id } }), "Synced from Stripe")}>
                            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Sync from Stripe
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminDataCard>
    </AdminPageShell>
  );
}
