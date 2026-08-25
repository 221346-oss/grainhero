import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveRole } from "./rbac.server";
import type { AppRole } from "./roles.functions";

export type PageScope =
  | { scope: "platform"; adminId: null; role: AppRole }
  | { scope: "tenant"; adminId: string; role: AppRole };

/**
 * Decide which lens a shared page should render for the current user.
 * - super_admin → platform (aggregate across all tenants, read-only).
 * - super_admin impersonating → tenant (as the impersonated admin).
 * - everyone else → tenant, filtered by their tenant's admin_id.
 *
 * Tenant admin_id resolution: profiles.admin_id when present, else the
 * user's own id (they ARE the tenant admin). Mirrors get_tenant_admin_id().
 */
export async function resolvePageScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<PageScope> {
  const role = await getEffectiveRole(supabase, userId);

  // Platform pages (/platform/*) always show platform scope for super_admins
  // regardless of impersonation - impersonation only affects tenant pages
  if (role === "super_admin") {
    // Check for active impersonation session
    const { data: impersonationSession } = await supabase
      .from("activity_logs")
      .select("entity_ref")
      .eq("user_id", userId)
      .eq("category", "impersonation")
      .eq("action", "active_session")
      .single();

    if (impersonationSession) {
      // When impersonating, return tenant scope for the impersonated user
      return { scope: "tenant", adminId: impersonationSession.entity_ref, role: "admin" };
    }
    // Not impersonating, return platform scope
    return { scope: "platform", adminId: null, role };
  }

  // For non-super-admins, resolve their tenant scope
  const { data, error } = await supabase
    .from("profiles")
    .select("id, admin_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const adminId = (data?.admin_id ?? data?.id ?? userId) as string;
  return { scope: "tenant", adminId, role };
}

/**
 * Location scope — which of the tenant's warehouses a request may read.
 *
 * `warehouseIds: null` means "every warehouse in the tenant" and is the
 * behaviour every caller had before locations existed. A non-null list narrows
 * the request to one city.
 *
 * `siloIds` is carried alongside because a few tables (`actuators`) key only on
 * `silo_id` and cannot be filtered by warehouse directly.
 */
export type LocationScope = {
  /** Normalised city key, when the scope came from a city. */
  cityKey: string | null;
  /** The single warehouse in scope, when one was selected. */
  warehouseId: string | null;
  /**
   * Warehouses the request may read. `null` means every warehouse in the
   * tenant — the behaviour before locations existed.
   */
  warehouseIds: string[] | null;
  /** Silos in those warehouses, for tables keyed only on `silo_id`. */
  siloIds: string[] | null;
};

/** The unscoped default — the whole tenant, as before locations existed. */
export const ALL_LOCATIONS: LocationScope = {
  cityKey: null,
  warehouseId: null,
  warehouseIds: null,
  siloIds: null,
};

/**
 * Resolve the active scope from a warehouse id, a city key, or neither.
 *
 * The **warehouse is the primary unit** — it is what every location-dependent
 * table keys on, and what model performance is reported against, because two
 * warehouses in the same city can hold very different numbers of silos and so
 * produce genuinely different datasets. A city key is accepted as the
 * intermediate level of the picker and resolves to the warehouses within it.
 *
 * Resolution happens **server-side from the caller's own warehouses** rather
 * than trusting ids from the client. RLS already stops one tenant reading
 * another's rows, but an admin owns every warehouse in their account — so
 * nothing at the database level would stop a hand-edited query string widening
 * the view, or naming a warehouse in a city they are not currently viewing.
 *
 * An unknown warehouse or city yields an **empty** scope, never the tenant-wide
 * one: a stale link must show nothing rather than everything.
 */
export async function resolveLocationScope(
  supabase: SupabaseClient,
  cityKey?: string | null,
  warehouseId?: string | null,
): Promise<LocationScope> {
  const city = typeof cityKey === "string" ? cityKey.trim() : "";
  const wh = typeof warehouseId === "string" ? warehouseId.trim() : "";
  if (!city && !wh) return ALL_LOCATIONS;

  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, location, location_city, location_address")
    .is("deleted_at", null)
    .limit(500);
  if (error) throw error;
  const owned = data ?? [];

  let warehouseIds: string[];
  let resolvedCity: string | null = city || null;

  if (wh) {
    // Warehouse-level scope. Confirm the caller actually owns it — an id from
    // the client is a request, not a permission.
    const match = owned.find((w) => w.id === wh);
    warehouseIds = match ? [match.id] : [];
    if (match) {
      const { cityKey: normalise, deriveCity } = await import("./location-scope");
      resolvedCity = normalise(deriveCity(match));
    }
  } else {
    const { cityKey: normalise, deriveCity } = await import("./location-scope");
    warehouseIds = owned.filter((w) => normalise(deriveCity(w)) === city).map((w) => w.id);
  }

  if (warehouseIds.length === 0) {
    return { cityKey: resolvedCity, warehouseId: wh || null, warehouseIds: [], siloIds: [] };
  }

  const { data: silos } = await supabase
    .from("silos")
    .select("id")
    .in("warehouse_id", warehouseIds)
    .is("deleted_at", null)
    .limit(2000);

  return {
    cityKey: resolvedCity,
    warehouseId: wh || null,
    warehouseIds,
    siloIds: (silos ?? []).map((s) => s.id),
  };
}

/**
 * Narrow a query to the active location, on a table keyed by `warehouse_id`.
 *
 * A null `warehouseIds` leaves the query untouched — the tenant-wide behaviour
 * every caller had before locations existed, still correct for managers,
 * technicians, super admins and the "all locations" view.
 *
 * Rows with a null warehouse are excluded once a location is active:
 * unattributed data belongs to no city, and surfacing it under one would be
 * exactly the mixing this feature forbids.
 */
export function byWarehouse<Q extends { in: (col: string, vals: string[]) => Q }>(
  q: Q,
  scope: LocationScope,
): Q {
  if (!scope.warehouseIds) return q;
  return q.in("warehouse_id", scope.warehouseIds);
}

/** As {@link byWarehouse}, for tables that key only on `silo_id`. */
export function bySilo<Q extends { in: (col: string, vals: string[]) => Q }>(
  q: Q,
  scope: LocationScope,
): Q {
  if (!scope.siloIds) return q;
  return q.in("silo_id", scope.siloIds);
}
