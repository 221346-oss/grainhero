import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, X } from "lucide-react";
import { getMySubscription } from "@/lib/billing.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

/**
 * In-app "popup" half of the Batch 5 plan-expiry spec (7-day + 1-day
 * warnings) — the email/push half is already handled server-side by
 * runExpiryReminders (src/lib/expiry-reminders.server.ts). This just
 * computes days-left live from the tenant's own subscription on every
 * render, so unlike email/push there's no "already sent" state to track:
 * it simply shows whenever the plan is within the window and hides once
 * it isn't (or once renewed).
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

  if (!endDate || dismissed || role !== "admin") return null;

  const daysLeft = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / 86_400_000,
  );

  if (daysLeft > 7 || daysLeft < 0) return null;

  const urgent = daysLeft <= 1;

  return (
    <div
      className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium z-40 ${
        urgent ? "bg-red-600 text-white" : "bg-amber-500 text-white"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {urgent
            ? `⚠️ Your ${planName} expires today! Renew now to avoid losing access.`
            : `Your ${planName} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep your access.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/plan-management"
          className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        >
          Manage plan
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="h-6 w-6 grid place-items-center rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
