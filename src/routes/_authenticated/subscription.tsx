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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Package,
  Warehouse,
  Users,
  Cpu,
  XCircle,
  Calendar,
  ArrowUpRight,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { getMySubscription, cancelMySubscription } from "@/lib/billing.functions";
import { createStripeBillingPortalSession } from "@/lib/stripe-checkout.functions";
import {
  changeMyPlan,
  cancelAtPeriodEnd,
  resumeSubscription,
} from "@/lib/subscription-management.functions";
import { getAllSubscriptions } from "@/lib/platform-no-admin.functions";
import {
  adminChangeUserPlan,
  adminCancelSubscription,
  adminResumeSubscription,
  adminSyncSubscription,
  adminReconcileAllSubscriptions,
} from "@/lib/admin-subscriptions.functions";
import { getMyRole } from "@/lib/roles.functions";
import pricingData from "@/lib/pricing-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { SubscriptionSkeleton } from "@/components/app/skeletons";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — Grain Hero" },
      {
        name: "description",
        content: "Subscription workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Subscription — Grain Hero" },
      { property: "og:description", content: "Subscription workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SubscriptionPage,
});

function statusBadge(s: string | null | undefined) {
  switch (s) {
    case "active":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "trial":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    case "expired":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function UsageRow({
  icon: Icon,
  label,
  used,
  max,
}: {
  icon: any;
  label: string;
  used: number;
  max: number | null;
}) {
  const limit = max ?? 0;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="flex items-center gap-2 text-slate-700">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-medium text-slate-900">
          {used}
          {limit > 0 ? ` / ${limit}` : ""}
        </span>
      </div>
      {limit > 0 && <Progress value={pct} className="h-2" />}
    </div>
  );
}

function SubscriptionPage() {
  const { t } = useTranslation();
  const fn = useServerFn(getMySubscription);
  const cancelFn = useServerFn(cancelMySubscription);
  const portalFn = useServerFn(createStripeBillingPortalSession);
  const changeFn = useServerFn(changeMyPlan);
  const cancelPeriodFn = useServerFn(cancelAtPeriodEnd);
  const resumeFn = useServerFn(resumeSubscription);
  const roleFn = useServerFn(getMyRole);
  const allSubsFn = useServerFn(getAllSubscriptions);
  const adminChangeFn = useServerFn(adminChangeUserPlan);
  const adminCancelFn = useServerFn(adminCancelSubscription);
  const adminResumeFn = useServerFn(adminResumeSubscription);
  const adminSyncFn = useServerFn(adminSyncSubscription);
  const adminReconcileFn = useServerFn(adminReconcileAllSubscriptions);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-subscription"], queryFn: () => fn() });
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn() });

  const isSuperAdmin = (roleData?.role ?? data?.role ?? "pending") === "super_admin";

  // Fetch all subscriptions if super admin
  const { data: allSubs = [] } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => allSubsFn(),
    enabled: isSuperAdmin,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<"basic" | "intermediate" | "pro">("intermediate");
  async function runAdmin(op: () => Promise<any>, successMsg: string) {
    try {
      await op();
      toast.success(successMsg);
      qc.invalidateQueries({ queryKey: ["all-subscriptions"] });
    } catch (e: any) {
      toast.error(e?.message ?? t("subscription.actionFailed"));
    }
  }

  const cancelM = useMutation({
    mutationFn: () => cancelFn({ data: { reason: reason || undefined } }),
    onSuccess: () => {
      toast.success(t("subscription.cancelledToast"));
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e.message ?? t("subscription.failedToCancel")),
  });

  const portalM = useMutation({
    mutationFn: () => portalFn(),
    onSuccess: ({ url }: { url: string }) => {
      window.location.href = url;
    },
    onError: (e: any) => toast.error(e.message ?? t("subscription.couldNotOpenPortal")),
  });

  const changeM = useMutation({
    mutationFn: () => changeFn({ data: { planId: newPlan } }),
    onSuccess: () => {
      toast.success(t("subscription.planUpdatedToast"));
      setChangeOpen(false);
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e.message ?? t("subscription.failedToChangePlan")),
  });
  const cancelPeriodM = useMutation({
    mutationFn: () => cancelPeriodFn(),
    onSuccess: () => {
      toast.success(t("subscription.willCancelToast"));
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e.message ?? t("subscription.actionFailed")),
  });
  const resumeM = useMutation({
    mutationFn: () => resumeFn(),
    onSuccess: () => {
      toast.success(t("subscription.resumedToast"));
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e.message ?? t("subscription.actionFailed")),
  });

  const role = data?.role ?? "pending";
  const sub = data?.subscription;
  const usage = data?.usage ?? { batches: 0, warehouses: 0, silos: 0, devices: 0, users: 0 };
  const invoices = data?.invoices ?? [];

  const canManage = ["super_admin", "admin"].includes(role);

  if (isLoading) return <SubscriptionSkeleton />;

  return (
    <AdminPageShell
      title={t("subscription.title")}
      subtitle={t("subscription.subtitle")}
      actions={
        <>
          {sub && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => portalM.mutate()}
              disabled={portalM.isPending}
            >
              {portalM.isPending ? t("subscription.opening") : t("subscription.manageBilling")}
            </Button>
          )}
          {sub && canManage && sub.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewPlan(
                  (sub.plan_name?.toLowerCase().includes("pro")
                    ? "pro"
                    : sub.plan_name?.toLowerCase().includes("inter")
                      ? "intermediate"
                      : "basic") as any,
                );
                setChangeOpen(true);
              }}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" /> {t("subscription.changePlan")}
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                runAdmin(() => adminReconcileFn(), t("subscription.reconciledToast"))
              }
            >
              <RotateCcw className="h-4 w-4 mr-2" /> {t("subscription.syncAll")}
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/plans">{t("subscription.browsePlans")}</Link>
          </Button>
        </>
      }
    >
      {!sub && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-lg font-semibold text-slate-900">
              {t("subscription.noActiveSubscription")}
            </div>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t("subscription.noSubDesc")}
            </p>
            <Button asChild>
              <Link to="/plans">{t("subscription.choosePlan")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {sub && (
        <>
          {(sub as any).cancel_at && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Calendar className="h-4 w-4" />
                {t("subscription.scheduledToCancel", {
                  date: new Date((sub as any).cancel_at).toLocaleDateString(),
                })}
              </div>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resumeM.mutate()}
                  disabled={resumeM.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> {t("subscription.resume")}
                </Button>
              )}
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-xl">{sub.plan_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {sub.plan_description ?? t("subscription.yourCurrentPlan")}
                  </CardDescription>
                </div>
                <Badge className={statusBadge(sub.status)}>{sub.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold">{t("subscription.price")}</div>
                <div className="text-lg font-bold">
                  {sub.currency ?? "PKR"} {Number(sub.price_per_month).toFixed(2)}
                  <span className="text-xs text-slate-500">{t("subscription.perMonth")}</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold">{t("subscription.billingCycle")}</div>
                <div className="text-lg font-bold capitalize">{sub.billing_cycle ?? "monthly"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t("subscription.renews")}
                </div>
                <div className="text-lg font-bold">
                  {sub.next_payment_date
                    ? new Date(sub.next_payment_date).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold">{t("subscription.autoRenew")}</div>
                <div className="text-lg font-bold">
                  {sub.auto_renew ? t("subscription.on") : t("subscription.off")}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("subscription.usage")}</CardTitle>
                <CardDescription>{t("subscription.usageDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageRow
                  icon={Package}
                  label={t("subscription.batches")}
                  used={usage.batches}
                  max={sub.max_batches}
                />
                <UsageRow icon={Warehouse} label={t("subscription.silos")} used={usage.silos} max={null} />
                <UsageRow icon={Cpu} label={t("subscription.devices")} used={usage.devices} max={sub.max_devices} />
                <UsageRow
                  icon={Users}
                  label={t("subscription.teamMembers")}
                  used={usage.users}
                  max={sub.max_users}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("subscription.includedFeatures")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  [t("subscription.featAi"), sub.ai_features],
                  [t("subscription.featAnalytics"), sub.advanced_analytics],
                  [t("subscription.featSupport"), sub.priority_support],
                  [t("subscription.featIntegrations"), sub.custom_integrations],
                ].map(([label, on]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-slate-700">{label as string}</span>
                    <Badge
                      variant="outline"
                      className={on ? "border-emerald-200 text-emerald-700" : "text-slate-500"}
                    >
                      {on ? t("subscription.enabled") : "—"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>                <CardTitle>{t("subscription.billingHistory")}</CardTitle>
              <CardDescription>
                {t("subscription.recentInvoices", { count: invoices.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{inv.invoice_number ?? inv.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">
                        {inv.billing_date ? new Date(inv.billing_date).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {inv.currency ?? "PKR"} {Number(inv.amount).toFixed(2)}
                      </span>
                      <Badge className={statusBadge(inv.status)}>{inv.status ?? "pending"}</Badge>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {t("subscription.noInvoices")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {canManage && sub.status !== "cancelled" && (
            <div className="flex justify-end gap-2">
              {(sub as any).cancel_at ? (
                <Button
                  variant="outline"
                  onClick={() => resumeM.mutate()}
                  disabled={resumeM.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> {t("subscription.resumeSubscription")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => cancelPeriodM.mutate()}
                  disabled={cancelPeriodM.isPending}
                >
                  <Calendar className="h-4 w-4 mr-2" /> {t("subscription.cancelAtPeriodEnd")}
                </Button>
              )}
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" /> {t("subscription.cancelNow")}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Super Admin: Show all subscriptions */}
      {isSuperAdmin && (
        <AdminDataCard
          title={t("subscription.allPlatformSubscriptions")}
          description={t("subscription.subsCount", { count: allSubs.length })}
        >
          {allSubs.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              {t("subscription.noTenantSubs")}
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {allSubs.map((s: any) => {
              const daysLeft = s.next_payment_date
                ? Math.ceil(
                    (new Date(s.next_payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  )
                : null;
              const expiryText =
                daysLeft !== null
                  ? daysLeft > 0
                    ? t("subscription.days", { count: daysLeft })
                    : t("subscription.expired")
                  : "N/A";
              const expiryColor =
                daysLeft !== null && daysLeft <= 7
                  ? "text-red-600"
                  : daysLeft !== null && daysLeft <= 30
                    ? "text-amber-600"
                    : "text-slate-500";
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{s.user_name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.user_email} · {s.business_type}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(s.status)}>
                    {s.status}
                  </Badge>
                  <span className="text-sm font-medium text-slate-700">{s.plan_name}</span>
                  <div className="flex flex-col items-end gap-0.5 min-w-[110px]">
                    <span className="text-sm font-bold text-slate-900">
                      {s.currency ?? "PKR"} {Number(s.monthly_price ?? 0).toFixed(0)}
                      <span className="text-xs text-slate-500">/mo</span>
                    </span>
                    <div className={`text-[10px] font-medium ${expiryColor}`}>
                      {t("subscription.expires", { text: expiryText })}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-[11px]">
                        {t("subscription.changePlan")}
                      </DropdownMenuLabel>
                      {pricingData.map((p: any) => (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() =>
                            runAdmin(
                              () => adminChangeFn({ data: { subscriptionId: s.id, planId: p.id } }),
                              t("subscription.movedTo", { name: s.user_name, plan: p.name }),
                            )
                          }
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> {p.name} —{" "}
                          {p.currency ?? "PKR"} {p.price}
                          {t("subscription.perMonth")}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          runAdmin(
                            () =>
                              adminCancelFn({ data: { subscriptionId: s.id, immediate: false } }),
                            t("subscription.willCancelToast"),
                          )
                        }
                      >
                        <Calendar className="h-3.5 w-3.5 mr-2" /> {t("subscription.cancelAtPeriodEnd")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          runAdmin(
                            () => adminResumeFn({ data: { subscriptionId: s.id } }),
                            t("subscription.resumedToast"),
                          )
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2" /> {t("subscription.resume")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() =>
                          runAdmin(
                            () =>
                              adminCancelFn({ data: { subscriptionId: s.id, immediate: true } }),
                            t("subscription.cancelledToast"),
                          )
                        }
                      >
                        <XCircle className="h-3.5 w-3.5 mr-2" /> {t("subscription.cancelImmediately")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          runAdmin(
                            () => adminSyncFn({ data: { subscriptionId: s.id } }),
                            t("subscription.syncedToast"),
                          )
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2" /> {t("subscription.syncFromStripe")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </AdminDataCard>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscription.cancelSubscriptionTitle")}</DialogTitle>
            <DialogDescription>
              {t("subscription.cancelSubscriptionDesc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("subscription.reasonPlaceholder")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("subscription.keepPlan")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelM.mutate()}
              disabled={cancelM.isPending}
            >
              {t("subscription.confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("subscription.changePlan")}</DialogTitle>
            <DialogDescription>
              {t("subscription.changePlanDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newPlan} onValueChange={(v) => setNewPlan(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pricingData.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.currency ?? "PKR"} {p.price}
                    {t("subscription.perMonth")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => changeM.mutate()} disabled={changeM.isPending}>
              {changeM.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("subscription.confirmChange")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
