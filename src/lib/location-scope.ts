/**
 * Location scope — shared helpers for grouping an admin's warehouses by city.
 *
 * A single admin may hold warehouses across several cities. The dashboard is
 * scoped to one city at a time, and data from one city must never appear in
 * another's view. These helpers are the single source of truth for deriving
 * that city, so the picker, the switcher and the server all group identically.
 *
 * City derivation mirrors the SQL in
 * `20260817000000_region_aware_warehouse_dedup.sql`, which matches on
 * `location->>'description'` OR `location->>'city'`, compares case-insensitively
 * with whitespace trimmed, and also recognises the `"City — XXX"` name prefix
 * written by `hardware_order_provision_silo()`. Deriving it differently here
 * would split one city into several cards.
 */

/** The em-dash separator used by the provisioning trigger's `"City — XXX"` names. */
const NAME_PREFIX = /^\s*([^—]+?)\s*—\s*\S/;

export const UNASSIGNED_CITY = "Unassigned";

export type WarehouseLocation = {
  city?: string | null;
  address?: string | null;
  description?: string | null;
} | null;

export type WarehouseLike = {
  name?: string | null;
  location?: WarehouseLocation | unknown;
  location_city?: string | null;
  location_address?: string | null;
};

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Derive a display city for a warehouse.
 *
 * Order matters — it runs most-explicit to least:
 *   1. `location_city` column (backfilled from the install order)
 *   2. `location->>'city'`
 *   3. `location->>'description'` (the SQL dedup treats this as a city label)
 *   4. the `"City — XXX"` prefix in the warehouse name
 *   5. the first segment of an address
 *
 * Returns {@link UNASSIGNED_CITY} when nothing usable is present, so those
 * warehouses collect in one bucket rather than each forming a card of its own.
 */
export function deriveCity(w: WarehouseLike): string {
  const loc = (w.location ?? null) as WarehouseLocation;

  const direct = clean(w.location_city) || clean(loc?.city) || clean(loc?.description);
  if (direct) return direct;

  const fromName = NAME_PREFIX.exec(clean(w.name));
  if (fromName?.[1]) return fromName[1].trim();

  // Addresses are free text. The first comma-separated segment is the least
  // bad guess; anything cleverer misreads as often as it helps.
  const address = clean(w.location_address) || clean(loc?.address);
  if (address) {
    const first = address.split(",")[0]?.trim();
    if (first) return first;
  }

  return UNASSIGNED_CITY;
}

/**
 * Case- and whitespace-insensitive key for a city.
 *
 * "karachi ", "Karachi" and "KARACHI" must land in the same group — the SQL
 * dedup already compares this way, and inconsistent casing in the data is the
 * reason that migration exists.
 */
export function cityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Sort cities alphabetically, with the unassigned bucket pinned last. */
export function compareCities(a: string, b: string): number {
  if (cityKey(a) === cityKey(UNASSIGNED_CITY)) return 1;
  if (cityKey(b) === cityKey(UNASSIGNED_CITY)) return -1;
  return a.localeCompare(b);
}

/**
 * Group warehouses into cities.
 *
 * The first spelling encountered wins as the display label, so the group shows
 * a real name rather than the normalised key.
 */
export function groupByCity<T extends WarehouseLike>(
  warehouses: readonly T[],
): Array<{ key: string; city: string; warehouses: T[] }> {
  const groups = new Map<string, { key: string; city: string; warehouses: T[] }>();

  for (const w of warehouses) {
    const city = deriveCity(w);
    const key = cityKey(city);
    const existing = groups.get(key);
    if (existing) existing.warehouses.push(w);
    else groups.set(key, { key, city, warehouses: [w] });
  }

  return [...groups.values()].sort((a, b) => compareCities(a.city, b.city));
}
