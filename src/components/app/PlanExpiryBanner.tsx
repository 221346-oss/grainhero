import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { getMySubscription } from "@/lib/billing.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

/**
 * In-app "popup" half of the Batch 5 plan-expiry spec (7-day + 1-day
 * warnings) — the email/push half is already handled server-side by
 * runExpiryReminders (src/lib/expiry-reminders.server.ts). Days-left is
 * computed live from the tenant's own subscription on every render, so unlike
 * email/push there's no "already sent" state to track: it shows whenever the
 * plan is within the window and hides once it isn't, or once renewed.
 *
 * Once the plan has actually expired the banner changes character. It stops
 * being a dismissable warning and becomes a persistent route to the upgrade
 * flow, because an expired tenant that dismisses the notice is left with no
 * way back to paying. The user is deliberately **not** logged out or blocked —
 * they stay in the dashboard and are pointed at plan upgrade from inside it.
 */
export function PlanExpiryBanner() {
  const { role } = useIsSuperAdmin();
  const fn = useServerFn(getMySubscription);
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    enabled: role === "admin",
  });

  const sub = (data as any)?.subscription ?? data;
  const endDate: string | null = sub?.end_date ?? sub?.next_payment_date ?? null;
  const planName: string = sub?.plan_name ?? "your plan";

  if (!endDate || role !== "admin") return null;

  const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  const expired = daysLeft < 0;

  // Expired banners are not dismissable — see the note above.
  if (dismissed && !expired) return null;
  if (!expired && daysLeft > 7) return null;

  const urgent = expired || daysLeft <= 1;
  const daysSince = Math.abs(daysLeft);

  const message = expired
    ? `Your ${planName} expired ${daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`}. Renew to restore full access.`
    : daysLeft <= 1
      ? `Your ${planName} expires today. Renew now to avoid losing access.`
      : `Your ${planName} expires in ${daysLeft} days. Renew to keep your access.`;

  return (
    <div
      role={expired ? "alert" : "status"}
      className={`z-40 flex w-full items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-white ${
        urgent ? "bg-red-600" : "bg-amber-500"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/plan-management"
          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          {expired ? "Renew plan" : "Manage plan"}
          {expired && <ArrowRight className="h-3 w-3" />}
        </Link>
        {!expired && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
