/**
 * What a dispatched batch earned, under the pre-silo dispatch model.
 *
 * Dispatch used to happen per batch and wrote `grain_batches.revenue`; it now
 * happens per silo and writes `grain_dispatches.total_amount`. Both still have
 * to be counted, or an account that straddles the change reports half its
 * revenue — so every screen showing money merges the two, and this is the
 * single definition of the legacy half.
 *
 * It lives on its own because the scoped dashboard and the all-locations
 * summary both compute it, and a figure that two screens derive separately is
 * a figure that will eventually disagree with itself.
 *
 * `revenue` is trusted where present and falls back to price x quantity for
 * rows written before that column existed.
 */
export type LegacyBatchRevenueRow = {
  revenue: number | null;
  purchase_price_per_kg: number | null;
  quantity_kg: number | null;
};

export function legacyBatchRevenue(b: LegacyBatchRevenueRow): number {
  return Number(b.revenue ?? Number(b.purchase_price_per_kg ?? 0) * Number(b.quantity_kg ?? 0));
}
