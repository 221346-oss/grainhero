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
  cityKey: string | null;
  warehouseIds: string[] | null;
  siloIds: string[] | null;
};

/** The unscoped default — the whole tenant, as before locations existed. */
export const ALL_LOCATIONS: LocationScope = {
  cityKey: null,
  warehouseIds: null,
  siloIds: null,
};

/**
 * Resolve a city key into the warehouses and silos it contains.
 *
 * The city is resolved **server-side from the caller's own warehouses** rather
 * than trusting a list of ids from the client. RLS already stops one tenant
 * reading another's rows, but an admin owns every warehouse in their account —
 * so nothing at the database level would stop a hand-edited `?loc=` widening the
 * view. Deriving here is what makes the scope trustworthy.
 *
 * An unknown or empty city yields {@link ALL_LOCATIONS}: a stale link degrades
 * to the tenant-wide view the user is already entitled to, never to an error
 * and never to another tenant's data.
 */
export async function resolveLocationScope(
  supabase: SupabaseClient,
  cityKey: string | null | undefined,
): Promise<LocationScope> {
  const key = typeof cityKey === "string" ? cityKey.trim() : "";
  if (!key) return ALL_LOCATIONS;

  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, location, location_city, location_address")
    .is("deleted_at", null)
    .limit(500);
  if (error) throw error;

  const { cityKey: normalise, deriveCity } = await import("./location-scope");
  const warehouseIds = (data ?? [])
    .filter((w) => normalise(deriveCity(w)) === key)
    .map((w) => w.id);

  // An unrecognised key must not silently widen the scope to the whole tenant —
  // that is the cross-location bleed this exists to prevent. Return an empty
  // list so the caller shows nothing rather than everything.
  if (warehouseIds.length === 0) {
    return { cityKey: key, warehouseIds: [], siloIds: [] };
  }

  const { data: silos } = await supabase
    .from("silos")
    .select("id")
    .in("warehouse_id", warehouseIds)
    .is("deleted_at", null)
    .limit(2000);

  return {
    cityKey: key,
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
