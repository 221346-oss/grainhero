import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import { getMySubscription } from "@/lib/billing.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { SectionLabel } from "@/components/app/surface";

/**
 * The in-dashboard renewal prompt for an admin whose plan has lapsed.
 *
 * Deliberately **not** a block. An expired tenant keeps their dashboard and
 * their data; this sits above it and routes them to the upgrade flow, which is
 * the behaviour asked for — a window pointing at buying again rather than a
 * locked door or a forced sign-out.
 *
 * The thin banner covers the same ground in one line; this exists because the
 * banner is easy to scroll past, and once a plan has actually lapsed the route
 * back to paying should be somewhere the eye lands.
 */
export function PlanExpiredPrompt() {
  const { role } = useIsSuperAdmin();
  const fn = useServerFn(getMySubscription);

  const { data } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    enabled: role === "admin",
  });

  const sub = (data as any)?.subscription ?? data;
  const endDate: string | null = sub?.end_date ?? sub?.next_payment_date ?? null;
  if (!endDate || role !== "admin") return null;

  const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (daysLeft >= 0) return null;

  const planName: string = sub?.plan_name ?? "Your plan";
  const daysSince = Math.abs(daysLeft);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <section className="rounded-2xl bg-severity-critical/10 p-5">
        <SectionLabel index="!">Plan expired</SectionLabel>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {planName} lapsed{" "}
              {daysSince === 0 ? "today" : `${daysSince} day${daysSince === 1 ? "" : "s"} ago`}
            </h2>
            <p className="mt-1 max-w-prose text-[13px] text-muted-foreground">
              Your data is still here and nothing has been deleted. Renew or move to another plan to
              restore full access — you can do it from here without signing out.
            </p>
          </div>
          <Link
            to="/plan-management"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-severity-critical px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-severity-critical/90"
          >
            <Clock className="h-3.5 w-3.5" />
            Renew plan
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
