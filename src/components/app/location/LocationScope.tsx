/**
 * Location scope — which city's data the app is currently showing.
 *
 * An admin holding warehouses in several cities picks one before the dashboard
 * opens, and everything below this provider is scoped to that choice. Two rules
 * shape the design:
 *
 *   - Data from one location must never appear in another's view. Every query
 *     that depends on the scope must include `scopeKey` in its cache key, or
 *     React Query will happily serve Karachi's rows on the Pindi dashboard with
 *     no server-side bug to find.
 *   - Switching must be immediate and must not discard what was already loaded.
 *     Scoped cache keys give us both: each location's results coexist in the
 *     cache instead of overwriting each other, so switching back is instant.
 *
 * The active city lives in the URL (`?loc=`) so a scoped dashboard is
 * linkable, survives a refresh, and gets back/forward for free.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { LocationCard, LocationWarehouse, PlanUsage } from "@/lib/locations.functions";

export type LocationScopeValue = {
  /**
   * False while the location list is still loading.
   *
   * Callers must not treat an empty list as "this admin has no locations"
   * until this is true — doing so renders the unscoped view for a moment on
   * every page load, showing every city's data merged.
   */
  ready: boolean;
  /**
   * Cache-key fragment for the active scope. Fold this into every query key
   * whose results depend on the location — omitting it is the cross-location
   * bleed this exists to prevent.
   */
  scopeKey: string | null;
  /** Parameters to send with a scoped request. */
  scopeParams: { loc?: string; wh?: string };
  /** The active city, or null while none is chosen. */
  active: LocationCard | null;
  /**
   * The single warehouse in scope, when one is selected.
   *
   * The warehouse is the primary unit: it is what every location-dependent
   * table keys on, and what model performance is measured against — two
   * warehouses in one city can hold very different numbers of silos.
   */
  activeWarehouse: LocationWarehouse | null;
  /** Warehouse ids in scope. Empty when nothing is selected — never "all". */
  warehouseIds: string[];
  /** Every location available to this user. */
  locations: LocationCard[];
  /** The account's warehouse allowance, when the plan caps it. */
  plan?: PlanUsage;
  /** Enter a city (the intermediate level of the picker). */
  select: (key: string | null) => void;
  /** Enter a single warehouse — the scope the dashboard actually runs on. */
  selectWarehouse: (warehouseId: string | null) => void;
  /** Back to the city grid. */
  clear: () => void;
};

const Ctx = createContext<LocationScopeValue | null>(null);

export function LocationScopeProvider({
  locations,
  plan,
  ready = true,
  children,
}: {
  locations: LocationCard[];
  plan?: PlanUsage;
  ready?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { loc?: string; wh?: string };
  const requested = typeof search.loc === "string" ? search.loc : null;
  const requestedWh = typeof search.wh === "string" ? search.wh : null;

  // Only honour a key that actually resolves. A stale or hand-edited `?loc=`
  // must fall back to the picker rather than silently showing everything.
  const active = useMemo(
    () => (requested ? (locations.find((l) => l.key === requested) ?? null) : null),
    [locations, requested],
  );

  // A warehouse id resolves against every location, not just the active city —
  // a direct link may name a warehouse without naming its city.
  const activeWarehouse = useMemo(() => {
    if (!requestedWh) return null;
    for (const l of locations) {
      const w = l.warehouses.find((x) => x.id === requestedWh);
      if (w) return w;
    }
    return null;
  }, [locations, requestedWh]);

  const select = useCallback(
    (key: string | null) => {
      void navigate({
        to: ".",
        // Entering a city clears any warehouse — otherwise a stale `wh` from
        // the previous city would survive the move and scope to the wrong site.
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          loc: key ?? undefined,
          wh: undefined,
        }),
        replace: false,
      });
    },
    [navigate],
  );

  const selectWarehouse = useCallback(
    (warehouseId: string | null) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, wh: warehouseId ?? undefined }),
        replace: false,
      });
    },
    [navigate],
  );

  const clear = useCallback(() => select(null), [select]);

  const value = useMemo<LocationScopeValue>(
    () => ({
      ready,
      // The warehouse wins when both are present — it is the narrower scope.
      scopeKey: activeWarehouse?.id ?? active?.key ?? null,
      scopeParams: activeWarehouse ? { wh: activeWarehouse.id } : active ? { loc: active.key } : {},
      active,
      activeWarehouse,
      warehouseIds: activeWarehouse
        ? [activeWarehouse.id]
        : active
          ? active.warehouses.map((w) => w.id)
          : [],
      locations,
      plan,
      select,
      selectWarehouse,
      clear,
    }),
    [ready, active, activeWarehouse, locations, plan, select, selectWarehouse, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Read the active location scope.
 *
 * Returns null outside a provider — manager, technician and super-admin views
 * are not location-scoped and must keep working untouched.
 */
export function useLocationScope(): LocationScopeValue | null {
  return useContext(Ctx);
}

/**
 * The scope fragment to fold into a React Query key.
 *
 * Use this in every query whose results depend on the active location:
 *
 * ```ts
 * queryKey: ["silos", useLocationScopeKey()]
 * ```
 *
 * Omitting it is the cross-location bleed this feature exists to prevent.
 */
export function useLocationScopeKey(): string | null {
  return useContext(Ctx)?.scopeKey ?? null;
}

/**
 * Everything a scoped query needs: the cache-key fragment and the request
 * parameters.
 *
 * ```ts
 * const { key, params } = useLocationScopeQuery();
 * useQuery({ queryKey: ["silos", key], queryFn: () => listSilos({ data: params }) });
 * ```
 *
 * The key and the params must move together. Sending the scope without keying
 * by it serves one location's cached rows for another; keying by it without
 * sending it just refetches identical data.
 */
export function useLocationScopeQuery(): {
  key: string | null;
  params: { loc?: string; wh?: string };
} {
  const ctx = useContext(Ctx);
  return { key: ctx?.scopeKey ?? null, params: ctx?.scopeParams ?? {} };
}
