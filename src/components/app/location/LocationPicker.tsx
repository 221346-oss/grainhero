/**
 * LocationPicker — the screen an admin lands on after signing in.
 *
 * Two jobs on one page. Above, an optional `summary` slot carries the whole
 * account added up (see PortfolioSummary) — after location scoping this is the
 * only place left that answers "how is the business doing" rather than "how is
 * this warehouse doing". Below, one card per city, which is how you get from
 * that question to a specific site.
 *
 * Keeping both on one screen is the point: the overall figures and the cards
 * that make them up are read together, and an extra click between them turns a
 * roll-up into something you have to go and find.
 *
 * The card is not just navigation — it carries enough live signal (warehouses,
 * silos, how full, what's alerting, what it earned) to work as a daily triage
 * screen, because an admin with a single site sees it on every login and it has
 * to earn that click.
 *
 * Surface kit rules apply — surfaces group by fill and never by outline, labels
 * are the quiet 10px uppercase register, figures are bold and tabular, and
 * colour is semantic only.
 */
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, MapPin, Warehouse } from "lucide-react";
import { Rail, SectionLabel, compact, fmtPKR } from "@/components/app/surface";
import type { LocationCard, LocationWarehouse, PlanUsage } from "@/lib/locations.functions";
import { cn } from "@/lib/utils";

export function utilisationTone(pct: number | null): "success" | "warning" | "critical" {
  if (pct === null) return "success";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "success";
}

export function LocationTile({
  loc,
  revenue,
  onSelect,
}: {
  loc: LocationCard;
  /**
   * What this city earned over the period the summary above is showing.
   *
   * Shown only when there is something to show. A city that earned nothing in
   * the window is indistinguishable, from the card, from one whose figure has
   * not loaded yet — so printing a confident "Rs 0" for both says less than
   * printing neither, and the tile still works as navigation without it.
   */
  revenue?: number;
  onSelect: () => void;
}) {
  const tone = utilisationTone(loc.utilisationPct);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl bg-card/50 p-5 text-left",
        "transition-colors hover:bg-card/80 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-success/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {loc.warehouseCount} {loc.warehouseCount === 1 ? "warehouse" : "warehouses"}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-foreground">{loc.city}</h3>
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Silos
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">{loc.siloCount}</div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Capacity
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {compact(loc.capacityKg)}
            <span className="ml-1 text-[11px] font-semibold text-muted-foreground">kg</span>
          </div>
        </div>
      </div>

      {loc.utilisationPct !== null && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Utilisation
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              {loc.utilisationPct}%
            </span>
          </div>
          <Rail pct={loc.utilisationPct} tone={tone} />
        </div>
      )}

      {revenue !== undefined && revenue > 0 && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue
          </span>
          <span className="text-[13px] font-bold tabular-nums text-success">
            {fmtPKR.format(revenue)}
          </span>
        </div>
      )}

      {loc.openAlerts > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold tabular-nums",
            loc.criticalAlerts > 0 ? "text-severity-critical" : "text-warning",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {loc.criticalAlerts > 0
            ? `${loc.criticalAlerts} critical of ${loc.openAlerts} open`
            : `${loc.openAlerts} open ${loc.openAlerts === 1 ? "alert" : "alerts"}`}
        </div>
      )}
    </button>
  );
}

/**
 * "3 of 5 warehouses" — the plan allowance, shown beside the cards.
 *
 * Rendered only when the plan actually caps warehouses: an unlimited or
 * unconfigured plan has nothing useful to say here, and a bare "3 of -1" would
 * be worse than silence.
 */
function PlanAllowance({ plan }: { plan?: PlanUsage }) {
  if (!plan || plan.warehousesLimit <= 0) return null;
  const pct = Math.round((plan.warehousesUsed / plan.warehousesLimit) * 100);

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Plan
      </span>
      <span
        className={cn(
          "text-[11px] font-semibold tabular-nums",
          plan.atLimit ? "text-warning" : "text-muted-foreground",
        )}
      >
        {plan.warehousesUsed} of {plan.warehousesLimit} warehouses
      </span>
      <span className="h-px w-16 bg-border/60" aria-hidden="true">
        <span
          className={cn("block h-px", plan.atLimit ? "bg-warning" : "bg-success")}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </span>
    </div>
  );
}

/**
 * A single warehouse inside a city.
 *
 * The warehouse is the unit everything actually runs on — two warehouses in one
 * city can hold very different numbers of silos, so their data and their model
 * performance genuinely differ. Picking a city is only the way to reach one.
 */
export function WarehouseTile({ wh, onSelect }: { wh: LocationWarehouse; onSelect: () => void }) {
  const pct = wh.capacityKg > 0 ? Math.round((wh.occupancyKg / wh.capacityKg) * 100) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl bg-card/50 p-4 text-left",
        "transition-colors hover:bg-card/80 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-success/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Warehouse className="h-3 w-3 shrink-0" />
            <span className="truncate">{wh.warehouse_id}</span>
          </div>
          <h4 className="mt-1 truncate text-sm font-semibold text-foreground">{wh.name}</h4>
        </div>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Silos
          </div>
          <div className="text-xl font-bold tabular-nums text-foreground">{wh.siloCount}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Capacity
          </div>
          <div className="text-xl font-bold tabular-nums text-foreground">
            {compact(wh.capacityKg)}
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground">kg</span>
          </div>
        </div>
      </div>

      {pct !== null && <Rail pct={pct} tone={utilisationTone(pct)} />}
    </button>
  );
}

/** Second level — the warehouses inside one city. */
export function WarehousePicker({
  location,
  onSelect,
  onBack,
}: {
  location: LocationCard;
  onSelect: (warehouseId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          All locations
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{location.city}</h1>
        <p className="max-w-prose text-[13px] text-muted-foreground">
          {location.warehouseCount} warehouses here. Each one is kept separate — its silos, its
          data, and its model performance are its own.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {location.warehouses.map((wh) => (
          <WarehouseTile key={wh.id} wh={wh} onSelect={() => onSelect(wh.id)} />
        ))}
      </div>
    </div>
  );
}

export function LocationPicker({
  locations,
  name,
  plan,
  summary,
  revenueByCity,
  onSelect,
}: {
  locations: LocationCard[];
  name?: string;
  plan?: PlanUsage;
  /**
   * The account-wide roll-up, rendered above the cards.
   *
   * Passed in rather than fetched here so this component stays the presentation
   * of a list of locations — the summary needs a range, a query and a loading
   * state of its own, none of which the card grid should have to know about.
   */
  summary?: ReactNode;
  /** Per-city revenue for the same period as `summary`, keyed by `LocationCard.key`. */
  revenueByCity?: Record<string, number>;
  onSelect: (key: string) => void;
}) {
  // An admin whose plan allows warehouses but who has provisioned none yet.
  if (locations.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-card/50">
          <Warehouse className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-foreground">No locations yet</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Once a hardware order is installed and provisioned, its warehouse appears here as a
          location you can open.
        </p>
        {plan && plan.warehousesLimit > 0 && (
          <p className="mt-4 text-[11px] font-semibold tabular-nums text-muted-foreground">
            Your plan covers {plan.warehousesLimit}{" "}
            {plan.warehousesLimit === 1 ? "warehouse" : "warehouses"}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {/* Unnumbered: the numbered eyebrows below index the blocks in their
              reading order, and the page title is not one of them. */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overview
          </span>
          <PlanAllowance plan={plan} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>
        <p className="max-w-prose text-[13px] text-muted-foreground">
          Everything you own, added up below, then one card per city. Open a location to work in it
          — inside, each one is kept separate, and you&apos;ll only see the silos and warehouses
          that belong to the city you chose.
        </p>
      </header>

      {summary && <div className="mb-8">{summary}</div>}

      <div className="mb-4">
        <SectionLabel index={summary ? "03" : "01"}>Your locations</SectionLabel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <LocationTile
            key={loc.key}
            loc={loc}
            revenue={revenueByCity?.[loc.key]}
            onSelect={() => onSelect(loc.key)}
          />
        ))}
      </div>
    </div>
  );
}
