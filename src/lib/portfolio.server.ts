/**
 * Portfolio summary — the whole account at once, across every location.
 *
 * The rest of the app narrows to one warehouse: that is the point of location
 * scoping, and it is right for the daily work. But an admin holding sites in
 * four cities also has to be able to ask "how is the business doing" without
 * opening four dashboards and adding them up in their head, and after scoping
 * there was nowhere left in the app that answered that.
 *
 * So this is **deliberately unscoped by location** — the one place in the
 * codebase where that is the intent rather than an oversight. It is still
 * scoped to the tenant, explicitly and server-side, exactly as
 * `resolveLocationScope` is: the caller's own warehouses are resolved here and
 * everything filters to them, so "no location filter" never widens into
 * another tenant's rows.
 *
 * Figures are broken down per city as well as totalled, so the location cards
 * can carry what each site contributed rather than leaving the total a black
 * box the admin has to take on trust.
 *
 * Kept apart from the server function that exposes it, and importing only by
 * relative path, so the arithmetic can be tested without a Supabase client —
 * the same split `page-scope.server.ts` uses.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { cityKey, deriveCity } from "./location-scope";
import { rangeToWindow, type Range } from "./date-window";
import { legacyBatchRevenue } from "./revenue";

/** What one city contributed over the selected window. */
export type PortfolioCity = {
  /** Normalised city key — matches `LocationCard.key`, so cards can join on it. */
  key: string;
  revenue: number;
  receivedKg: number;
  dispatchedKg: number;
};

export type PortfolioSummary = {
  range: Range;
  /** Revenue over the window, and how it moved against the window before it. */
  revenue: number;
  revenueDeltaPct: number;
  /** Twelve months of revenue, oldest first — the shape behind the figure. */
  revenueSpark: number[];
  /** Grain taken in over the window. */
  receivedKg: number;
  receivedDeltaPct: number;
  /** Grain dispatched out over the window. */
  dispatchedKg: number;
  dispatchedDeltaPct: number;
  /** How many dispatches — the count of sales, as distinct from their value. */
  dispatchCount: number;
  dispatchCountDeltaPct: number;
  byCity: PortfolioCity[];
};

function pctDelta(cur: number, prev: number): number {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

type BatchRow = {
  created_at: string;
  quantity_kg: number | null;
  warehouse_id: string | null;
  status: string | null;
  revenue: number | null;
  purchase_price_per_kg: number | null;
};

type DispatchRow = {
  created_at: string;
  total_qty_kg: number | null;
  total_amount: number | null;
  warehouse_id: string | null;
};

/**
 * Build the summary. Split from the server function so it can be called
 * directly from a test against a real database.
 */
export async function buildPortfolioSummary(
  sb: SupabaseClient,
  userId: string,
  range: Range,
): Promise<PortfolioSummary> {
  const { resolveTenantAdminId } = await import("./page-scope.server");
  const { startISO, priorStartISO, priorEndISO } = rangeToWindow(range);

  const now = new Date();
  const twelveMoAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
  // A year-to-date comparison reaches back to January of *last* year, which is
  // further than the twelve-month sparkline. Fetch from whichever is older, or
  // the prior-period deltas silently read as zero for most of every January.
  const fromISO = priorStartISO < twelveMoAgo ? priorStartISO : twelveMoAgo;

  const empty: PortfolioSummary = {
    range,
    revenue: 0,
    revenueDeltaPct: 0,
    revenueSpark: [],
    receivedKg: 0,
    receivedDeltaPct: 0,
    dispatchedKg: 0,
    dispatchedDeltaPct: 0,
    dispatchCount: 0,
    dispatchCountDeltaPct: 0,
    byCity: [],
  };

  // Resolve the tenant's own warehouses first. Everything below filters on
  // these ids rather than leaning on RLS, for the same reason
  // resolveLocationScope does: an unscoped query is only safe when the scope it
  // is missing is the location one and nothing else.
  const adminId = await resolveTenantAdminId(sb, userId);
  let whQuery = sb
    .from("warehouses")
    .select("id, name, location, location_city, location_address")
    .is("deleted_at", null)
    .limit(500);
  if (adminId) whQuery = whQuery.eq("admin_id", adminId);
  const { data: warehouses, error: whError } = await whQuery;
  if (whError) throw whError;

  const owned = warehouses ?? [];
  const warehouseIds = owned.map((w) => w.id as string);
  if (warehouseIds.length === 0) return empty;

  const cityOf = new Map<string, string>(
    owned.map((w) => [w.id as string, cityKey(deriveCity(w))]),
  );

  const [batchesRes, dispatchesRes] = await Promise.all([
    sb
      .from("grain_batches")
      .select("created_at, quantity_kg, warehouse_id, status, revenue, purchase_price_per_kg")
      .in("warehouse_id", warehouseIds)
      .gte("created_at", fromISO)
      .limit(10000),
    sb
      .from("grain_dispatches")
      .select("created_at, total_qty_kg, total_amount, warehouse_id")
      .in("warehouse_id", warehouseIds)
      .gte("created_at", fromISO)
      .limit(10000),
  ]);
  if (batchesRes.error) throw batchesRes.error;
  if (dispatchesRes.error) throw dispatchesRes.error;

  const batches = (batchesRes.data ?? []) as BatchRow[];
  const dispatches = (dispatchesRes.data ?? []) as DispatchRow[];

  // ISO-8601 strings from the same column sort the same way as the instants
  // they encode, so a string comparison is a date comparison here.
  const inWindow = (iso: string) => iso >= startISO;
  const inPrior = (iso: string) => iso >= priorStartISO && iso < priorEndISO;

  const totals = {
    revenue: 0,
    revenuePrior: 0,
    receivedKg: 0,
    receivedKgPrior: 0,
    dispatchedKg: 0,
    dispatchedKgPrior: 0,
    dispatchCount: 0,
    dispatchCountPrior: 0,
  };

  const byCity = new Map<string, PortfolioCity>();
  /** The city row for a warehouse, created on first use. Null if unattributed. */
  const cityRow = (warehouseId: string | null): PortfolioCity | null => {
    const key = warehouseId ? cityOf.get(warehouseId) : undefined;
    if (!key) return null;
    let row = byCity.get(key);
    if (!row) {
      row = { key, revenue: 0, receivedKg: 0, dispatchedKg: 0 };
      byCity.set(key, row);
    }
    return row;
  };

  // Twelve monthly buckets, oldest first, so the sparkline reads left to right.
  const buckets = new Map<string, number>();
  const bucketKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    bucketKeys.push(key);
    buckets.set(key, 0);
  }
  const addToBucket = (iso: string, value: number) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + value);
  };

  for (const b of batches) {
    const kg = Number(b.quantity_kg ?? 0);
    if (inWindow(b.created_at)) {
      totals.receivedKg += kg;
      const row = cityRow(b.warehouse_id);
      if (row) row.receivedKg += kg;
    } else if (inPrior(b.created_at)) {
      totals.receivedKgPrior += kg;
    }

    // Only a dispatched batch ever carried legacy revenue; the rest is grain
    // sitting in a silo, which is stock rather than a sale.
    if (b.status !== "dispatched") continue;
    const value = legacyBatchRevenue(b);
    if (inWindow(b.created_at)) {
      totals.revenue += value;
      const row = cityRow(b.warehouse_id);
      if (row) row.revenue += value;
    } else if (inPrior(b.created_at)) {
      totals.revenuePrior += value;
    }
    addToBucket(b.created_at, value);
  }

  for (const d of dispatches) {
    const kg = Number(d.total_qty_kg ?? 0);
    const value = Number(d.total_amount ?? 0);
    if (inWindow(d.created_at)) {
      totals.dispatchedKg += kg;
      totals.dispatchCount += 1;
      totals.revenue += value;
      const row = cityRow(d.warehouse_id);
      if (row) {
        row.dispatchedKg += kg;
        row.revenue += value;
      }
    } else if (inPrior(d.created_at)) {
      totals.dispatchedKgPrior += kg;
      totals.dispatchCountPrior += 1;
      totals.revenuePrior += value;
    }
    addToBucket(d.created_at, value);
  }

  return {
    range,
    revenue: totals.revenue,
    revenueDeltaPct: pctDelta(totals.revenue, totals.revenuePrior),
    revenueSpark: bucketKeys.map((k) => buckets.get(k) ?? 0),
    receivedKg: totals.receivedKg,
    receivedDeltaPct: pctDelta(totals.receivedKg, totals.receivedKgPrior),
    dispatchedKg: totals.dispatchedKg,
    dispatchedDeltaPct: pctDelta(totals.dispatchedKg, totals.dispatchedKgPrior),
    dispatchCount: totals.dispatchCount,
    dispatchCountDeltaPct: pctDelta(totals.dispatchCount, totals.dispatchCountPrior),
    byCity: [...byCity.values()],
  };
}
