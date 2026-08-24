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
import type { LocationCard, PlanUsage } from "@/lib/locations.functions";

export type LocationScopeValue = {
  /**
   * False while the location list is still loading.
   *
   * Callers must not treat an empty list as "this admin has no locations"
   * until this is true — doing so renders the unscoped view for a moment on
   * every page load, showing every city's data merged.
   */
  ready: boolean;
  /** Normalised key of the active city, or null when none is chosen yet. */
  scopeKey: string | null;
  /** The active location, or null while unresolved. */
  active: LocationCard | null;
  /** Warehouse ids in scope. Empty when nothing is selected — never "all". */
  warehouseIds: string[];
  /** Every location available to this user. */
  locations: LocationCard[];
  /** The account's warehouse allowance, when the plan caps it. */
  plan?: PlanUsage;
  select: (key: string | null) => void;
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
  const search = useSearch({ strict: false }) as { loc?: string };
  const requested = typeof search.loc === "string" ? search.loc : null;

  // Only honour a key that actually resolves. A stale or hand-edited `?loc=`
  // must fall back to the picker rather than silently showing everything.
  const active = useMemo(
    () => (requested ? (locations.find((l) => l.key === requested) ?? null) : null),
    [locations, requested],
  );

  const select = useCallback(
    (key: string | null) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, loc: key ?? undefined }),
        replace: false,
      });
    },
    [navigate],
  );

  const clear = useCallback(() => select(null), [select]);

  const value = useMemo<LocationScopeValue>(
    () => ({
      ready,
      scopeKey: active?.key ?? null,
      active,
      warehouseIds: active ? active.warehouses.map((w) => w.id) : [],
      locations,
      plan,
      select,
      clear,
    }),
    [ready, active, locations, plan, select, clear],
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
