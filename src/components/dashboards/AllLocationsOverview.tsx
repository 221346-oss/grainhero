/**
 * AllLocationsOverview — the whole account, then the cards that make it up.
 *
 * Location scoping made every page answer "how is this warehouse doing", which
 * is the right question for the daily work and the wrong one for the person who
 * owns four of them. Before this, an admin with sites in several cities had
 * nowhere in the app that added them up: the no-location state was a bare
 * picker, so the only way to see the business whole was to open each city in
 * turn and do the arithmetic by hand.
 *
 * This is that missing view. Totals across every location, then one card per
 * city carrying what it contributed — on one screen, because a roll-up and the
 * rows behind it are read together, and putting a click between them turns the
 * summary into something you have to go and find.
 *
 * It owns the period and the query for both halves. That is the point of the
 * component: the totals and the per-city figures on the cards come from one
 * response, so they cannot drift into showing different months.
 *
 * Four panels in a real reading order — what you have, what it did, what it
 * costs and who is using it, and where it all is — so the numbered eyebrows
 * earn their numbers.
 *
 * Surface kit rules apply: surfaces group by fill and never by outline, labels
 * are the quiet 10px uppercase register, figures are bold and tabular, deltas
 * are chips that vanish at zero, and colour is semantic only.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CreditCard, Users, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { DeltaChip, Panel, Rail, SectionLabel, compact, fmtPKR } from "@/components/app/surface";
import { LocationPicker, utilisationTone } from "@/components/app/location/LocationPicker";
import { getPortfolioSummary, type PortfolioSummary } from "@/lib/portfolio.functions";
import { getAccountUsage, type AccountUsage } from "@/lib/account-usage.functions";
import type { LocationCard, PlanUsage } from "@/lib/locations.functions";
import { RangeChip, type RangeKey } from "./RangeChip";
import { cn } from "@/lib/utils";

/** One figure: a quiet label, a bold number, and an optional delta beside it. */
function Figure({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {value}
          {unit && (
            <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{unit}</span>
          )}
        </span>
        <DeltaChip value={delta} />
      </div>
    </div>
  );
}

/**
 * What the account holds, summed from the location cards already on screen.
 *
 * Every number here is the sum of the tiles below it, and costs no extra
 * request. That is deliberate twice over: an admin who doubts a total can add
 * up the cards and get the same answer, which is the only reason to trust a
 * roll-up at all.
 */
function EstatePanel({ locations }: { locations: LocationCard[] }) {
  const t = useMemo(() => {
    const warehouses = locations.reduce((n, l) => n + l.warehouseCount, 0);
    const silos = locations.reduce((n, l) => n + l.siloCount, 0);
    const capacityKg = locations.reduce((n, l) => n + l.capacityKg, 0);
    const occupancyKg = locations.reduce((n, l) => n + l.occupancyKg, 0);
    return {
      warehouses,
      silos,
      capacityKg,
      occupancyKg,
      openAlerts: locations.reduce((n, l) => n + l.openAlerts, 0),
      criticalAlerts: locations.reduce((n, l) => n + l.criticalAlerts, 0),
      utilisationPct: capacityKg > 0 ? Math.round((occupancyKg / capacityKg) * 100) : null,
    };
  }, [locations]);

  return (
    <Panel className="space-y-5">
      <SectionLabel index="01">Across all locations</SectionLabel>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        <Figure label="Cities" value={String(locations.length)} />
        <Figure label="Warehouses" value={String(t.warehouses)} />
        <Figure label="Silos" value={String(t.silos)} />
        <Figure label="Stored" value={compact(t.occupancyKg)} unit="kg" />
        <Figure label="Capacity" value={compact(t.capacityKg)} unit="kg" />
      </div>

      {t.utilisationPct !== null && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Utilisation
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              {t.utilisationPct}%
            </span>
          </div>
          <Rail pct={t.utilisationPct} tone={utilisationTone(t.utilisationPct)} />
        </div>
      )}

      {t.openAlerts > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold tabular-nums",
            t.criticalAlerts > 0 ? "text-severity-critical" : "text-warning",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t.criticalAlerts > 0
            ? `${t.criticalAlerts} critical of ${t.openAlerts} open, every location`
            : `${t.openAlerts} open ${t.openAlerts === 1 ? "alert" : "alerts"}, every location`}
        </div>
      )}
    </Panel>
  );
}

/** Twelve months of revenue behind the headline figure. */
function RevenueSpark({ series, positive }: { series: number[]; positive: boolean }) {
  if (series.length < 2 || series.every((v) => v === 0)) return null;
  // Tokens are complete oklch() colours, so they are used bare — wrapping one
  // in hsl() yields an invalid colour and silently draws nothing.
  const stroke = positive ? "var(--success)" : "var(--severity-critical)";

  return (
    <div className="h-12" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={series.map((v) => ({ v }))}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="allLocationsRevSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.5}
            fill="url(#allLocationsRevSpark)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** What the account did over the selected period. The only half that fetches. */
function PerformancePanel({
  data,
  loading,
  range,
  onRange,
}: {
  data?: PortfolioSummary;
  loading: boolean;
  range: RangeKey;
  onRange: (v: RangeKey) => void;
}) {
  const positive = (data?.revenueDeltaPct ?? 0) >= 0;

  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel index="02">Performance</SectionLabel>
        <RangeChip value={range} onChange={onRange} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3 w-3 shrink-0" />
            Revenue
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "text-3xl font-bold tabular-nums transition-colors",
                loading ? "text-muted-foreground/40" : "text-success",
              )}
            >
              {fmtPKR.format(data?.revenue ?? 0)}
            </span>
            <DeltaChip value={data?.revenueDeltaPct} />
          </div>
          <RevenueSpark series={data?.revenueSpark ?? []} positive={positive} />
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
          <Figure
            label="Received"
            value={compact(data?.receivedKg ?? 0)}
            unit="kg"
            delta={data?.receivedDeltaPct}
          />
          <Figure
            label="Dispatched"
            value={compact(data?.dispatchedKg ?? 0)}
            unit="kg"
            delta={data?.dispatchedDeltaPct}
          />
          <Figure
            label="Sales"
            value={String(data?.dispatchCount ?? 0)}
            delta={data?.dispatchCountDeltaPct}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Every location added together, and each delta against the period before it. Open a city
        below for the same figures on one site.
      </p>
    </Panel>
  );
}

/** Month and year — enough to date a renewal without pretending to a time. */
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "8 months" / "12 days" — a duration a person reads without doing division. */
function humanDuration(days: number | null): string {
  if (days === null || days < 0) return "—";
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months`;
  return `${Math.floor(days / 365)} years`;
}

/**
 * What the account costs, who is on it, and how long it has been running.
 *
 * The half of the picture the performance figures do not cover: a renewal date
 * matters at the end of a term, not at the start of a shift, and it is the
 * thing an owner cannot find anywhere else once every page is scoped to one
 * warehouse. A plan is bought per tenant and the team belongs to the account,
 * so none of this is location-scoped — correctly.
 */
function AccountPanel({ data, loading }: { data?: AccountUsage; loading: boolean }) {
  const plan = data?.plan;
  const people = data?.people;

  // Expiry is the only thing here that is ever urgent, so it is the only thing
  // allowed to take a colour. Fourteen days is the point at which a renewal
  // stops being a date and starts being a task.
  const days = plan?.daysRemaining ?? null;
  const expiryTone =
    days === null ? null : days < 0 ? "text-severity-critical" : days <= 14 ? "text-warning" : null;

  const seats = people?.seatLimit ?? null;
  const seatPct = seats && people ? Math.min(100, Math.round((people.total / seats) * 100)) : null;

  return (
    <Panel className="space-y-5">
      <SectionLabel index="03">Plan and usage</SectionLabel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CreditCard className="h-3 w-3 shrink-0" />
            Plan
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className={cn(
                "text-2xl font-bold capitalize",
                loading ? "text-muted-foreground/40" : "text-foreground",
              )}
            >
              {/* "No active plan" is a finding, not a placeholder. Showing it
                  while the answer is still in flight tells an admin on a paid
                  plan that they are on none. */}
              {loading ? "—" : (plan?.name ?? "No active plan")}
            </span>
            {plan?.status && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {plan.status}
              </span>
            )}
          </div>
          {plan && plan.pricePerMonth > 0 && (
            <div className="text-[13px] font-semibold tabular-nums text-muted-foreground">
              {fmtPKR.format(plan.pricePerMonth)}
              <span className="ml-1 text-[11px] font-normal">per month</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {days !== null && days < 0 ? "Expired" : "Renews"}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={cn(
                  "text-[15px] font-bold tabular-nums",
                  expiryTone ?? "text-foreground",
                )}
              >
                {shortDate(plan?.nextPaymentDate ?? plan?.endDate ?? null)}
              </span>
              {days !== null && days >= 0 && (
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    expiryTone ?? "text-muted-foreground",
                  )}
                >
                  in {humanDuration(days)}
                </span>
              )}
            </div>
          </div>

          <Figure label="On GrainHero" value={humanDuration(data?.daysOnPlatform ?? null)} />

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" />
              People
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  loading ? "text-muted-foreground/40" : "text-foreground",
                )}
              >
                {loading ? "—" : (people?.total ?? 0)}
              </span>
              {seats && (
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  of {seats} seats
                </span>
              )}
            </div>
            {seatPct !== null && (
              <Rail pct={seatPct} tone={seatPct >= 100 ? "warning" : "success"} />
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {people && (
          <>
            {people.activeLast30d} of {people.total} active in the last 30 days,{" "}
            {people.totalLogins.toLocaleString()} sign-ins in total.{" "}
          </>
        )}
        Your plan and your team belong to the account, so these are the same on every location.
      </p>
    </Panel>
  );
}

export function AllLocationsOverview({
  locations,
  plan,
  name,
  onSelect,
}: {
  locations: LocationCard[];
  plan?: PlanUsage;
  name?: string;
  onSelect: (key: string) => void;
}) {
  // The period is local state. The URL already carries the location, and a
  // range is a way of looking rather than a place worth linking to.
  const [range, setRange] = useState<RangeKey>("mtd");

  const fn = useServerFn(getPortfolioSummary);
  const { data, isPending } = useQuery({
    queryKey: ["portfolio-summary", range],
    queryFn: () => fn({ data: { range } }),
    staleTime: 30_000,
  });

  // Kept out of the range-keyed query on purpose: a plan and a team do not
  // change with the period being looked at, and refetching them on every range
  // switch would be work that can only return the same answer.
  const usageFn = useServerFn(getAccountUsage);
  const { data: usage, isPending: usagePending } = useQuery({
    queryKey: ["account-usage"],
    queryFn: () => usageFn(),
    staleTime: 5 * 60_000,
  });

  // The same response feeds the totals and the cards, so a card can never show
  // one month while the figure above it shows another.
  const revenueByCity = useMemo(
    () => Object.fromEntries((data?.byCity ?? []).map((c) => [c.key, c.revenue])),
    [data],
  );

  return (
    <LocationPicker
      locations={locations}
      name={name}
      plan={plan}
      revenueByCity={revenueByCity}
      onSelect={onSelect}
      summary={
        <div className="space-y-3">
          <EstatePanel locations={locations} />
          <PerformancePanel data={data} loading={isPending} range={range} onRange={setRange} />
          <AccountPanel data={usage} loading={usagePending} />
        </div>
      }
    />
  );
}
