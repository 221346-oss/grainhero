/**
 * LocationPicker — the card grid an admin lands on after signing in.
 *
 * One card per city. The card is not just navigation: it carries enough live
 * signal (warehouses, silos, how full, what's alerting) to work as a daily
 * triage screen, because an admin with a single site sees it on every login and
 * it has to earn that click.
 *
 * Surface kit rules apply — surfaces group by fill and never by outline, labels
 * are the quiet 10px uppercase register, figures are bold and tabular, and
 * colour is semantic only.
 */
import { AlertTriangle, ArrowRight, MapPin, Warehouse } from "lucide-react";
import { Rail, SectionLabel, compact } from "@/components/app/surface";
import type { LocationCard, PlanUsage } from "@/lib/locations.functions";
import { cn } from "@/lib/utils";

function utilisationTone(pct: number | null): "success" | "warning" | "critical" {
  if (pct === null) return "success";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "success";
}

function LocationTile({ loc, onSelect }: { loc: LocationCard; onSelect: () => void }) {
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

export function LocationPicker({
  locations,
  name,
  plan,
  onSelect,
}: {
  locations: LocationCard[];
  name?: string;
  plan?: PlanUsage;
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
          <SectionLabel index="01">Your locations</SectionLabel>
          <PlanAllowance plan={plan} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>
        <p className="max-w-prose text-[13px] text-muted-foreground">
          Pick a location to open its dashboard. Each one is kept separate — you&apos;ll only see
          the silos and warehouses that belong to the city you choose.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <LocationTile key={loc.key} loc={loc} onSelect={() => onSelect(loc.key)} />
        ))}
      </div>
    </div>
  );
}
