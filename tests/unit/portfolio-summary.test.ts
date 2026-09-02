import { describe, expect, it } from "vitest";
import { buildPortfolioSummary } from "../../src/lib/portfolio.server";

type Row = Record<string, unknown>;

/**
 * Minimal chainable stand-in for the Supabase query builder.
 *
 * Only the methods the portfolio queries actually use are modelled. `gte` is
 * recorded rather than applied: the summary is expected to window rows itself,
 * and a fake that pre-filtered them would hide the bug where it does not.
 */
function fakeSupabase(tables: Record<string, Row[]>, role: string = "admin") {
  const calls: Array<{
    table: string;
    in: Record<string, unknown[]>;
    gte: Record<string, unknown>;
  }> = [];

  return {
    calls,
    rpc: async () => ({ data: role, error: null }),
    from(table: string) {
      const record = {
        table,
        in: {} as Record<string, unknown[]>,
        gte: {} as Record<string, unknown>,
      };
      calls.push(record);
      const rows = tables[table] ?? [];

      const builder: Record<string, unknown> = {
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: rows, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({ data: rows[0] ?? null, error: null }),
      };
      for (const method of ["select", "is", "limit", "order", "eq"]) {
        builder[method] = () => builder;
      }
      builder.in = (col: string, vals: unknown[]) => {
        record.in[col] = vals;
        return builder;
      };
      builder.gte = (col: string, val: unknown) => {
        record.gte[col] = val;
        return builder;
      };
      return builder;
    },
  };
}

const USER = "u-admin";
const PROFILES: Row[] = [{ id: USER, admin_id: null }];

const WAREHOUSES: Row[] = [
  { id: "w-khi", name: "Karachi — A", location_city: "Karachi" },
  { id: "w-lhr", name: "Lahore — A", location_city: "Lahore" },
];

/** Now, and a date inside the current month — the default `mtd` window. */
const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12).toISOString();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12).toISOString();

function tablesFor(extra: Record<string, Row[]> = {}) {
  return { profiles: PROFILES, activity_logs: [], warehouses: WAREHOUSES, ...extra };
}

describe("buildPortfolioSummary", () => {
  it("returns an empty summary when the tenant holds no warehouses", async () => {
    const sb = fakeSupabase({ profiles: PROFILES, activity_logs: [], warehouses: [] });
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    expect(s.revenue).toBe(0);
    expect(s.byCity).toEqual([]);
    // No point querying batches for an account with nowhere to put grain.
    expect(sb.calls.some((c) => c.table === "grain_batches")).toBe(false);
  });

  it("narrows every query to the tenant's own warehouses", async () => {
    const sb = fakeSupabase(tablesFor({ grain_batches: [], grain_dispatches: [] }));
    await buildPortfolioSummary(sb as never, USER, "mtd");

    for (const table of ["grain_batches", "grain_dispatches"]) {
      const call = sb.calls.find((c) => c.table === table);
      expect(call?.in.warehouse_id).toEqual(["w-khi", "w-lhr"]);
    }
  });

  it("adds live dispatch revenue to legacy per-batch revenue", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [
          // Legacy dispatched batch — carries its own revenue.
          {
            created_at: thisMonth,
            quantity_kg: 100,
            warehouse_id: "w-khi",
            status: "dispatched",
            revenue: 5000,
            purchase_price_per_kg: null,
          },
        ],
        grain_dispatches: [
          { created_at: thisMonth, total_qty_kg: 40, total_amount: 2000, warehouse_id: "w-khi" },
        ],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    // Both models counted, so an account straddling the change does not halve.
    expect(s.revenue).toBe(7000);
  });

  it("falls back to price x quantity for a legacy batch with no revenue column", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [
          {
            created_at: thisMonth,
            quantity_kg: 200,
            warehouse_id: "w-khi",
            status: "dispatched",
            revenue: null,
            purchase_price_per_kg: 3,
          },
        ],
        grain_dispatches: [],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");
    expect(s.revenue).toBe(600);
  });

  it("counts grain in from batches and grain out from dispatches", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [
          {
            created_at: thisMonth,
            quantity_kg: 500,
            warehouse_id: "w-khi",
            status: "stored",
            revenue: null,
            purchase_price_per_kg: null,
          },
        ],
        grain_dispatches: [
          { created_at: thisMonth, total_qty_kg: 120, total_amount: 900, warehouse_id: "w-khi" },
          { created_at: thisMonth, total_qty_kg: 80, total_amount: 700, warehouse_id: "w-lhr" },
        ],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    expect(s.receivedKg).toBe(500);
    expect(s.dispatchedKg).toBe(200);
    expect(s.dispatchCount).toBe(2);
  });

  it("stored grain is not a sale — an undispatched batch earns nothing", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [
          {
            created_at: thisMonth,
            quantity_kg: 500,
            warehouse_id: "w-khi",
            status: "stored",
            revenue: 99999,
            purchase_price_per_kg: null,
          },
        ],
        grain_dispatches: [],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");
    expect(s.revenue).toBe(0);
  });

  it("measures the prior period separately and reports the move", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [],
        grain_dispatches: [
          { created_at: thisMonth, total_qty_kg: 10, total_amount: 150, warehouse_id: "w-khi" },
          { created_at: lastMonth, total_qty_kg: 10, total_amount: 100, warehouse_id: "w-khi" },
        ],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    // Only the current window counts towards the headline.
    expect(s.revenue).toBe(150);
    expect(s.revenueDeltaPct).toBe(50);
  });

  it("attributes figures to the city of the warehouse they came from", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [
          {
            created_at: thisMonth,
            quantity_kg: 300,
            warehouse_id: "w-lhr",
            status: "stored",
            revenue: null,
            purchase_price_per_kg: null,
          },
        ],
        grain_dispatches: [
          { created_at: thisMonth, total_qty_kg: 10, total_amount: 1000, warehouse_id: "w-khi" },
          { created_at: thisMonth, total_qty_kg: 20, total_amount: 2000, warehouse_id: "w-lhr" },
        ],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    const khi = s.byCity.find((c) => c.key === "karachi");
    const lhr = s.byCity.find((c) => c.key === "lahore");
    expect(khi).toMatchObject({ revenue: 1000, dispatchedKg: 10, receivedKg: 0 });
    expect(lhr).toMatchObject({ revenue: 2000, dispatchedKg: 20, receivedKg: 300 });

    // The roll-up is exactly the sum of the cards under it — an admin who
    // doubts the total can add up the tiles and get the same answer.
    expect(s.byCity.reduce((n, c) => n + c.revenue, 0)).toBe(s.revenue);
    expect(s.byCity.reduce((n, c) => n + c.dispatchedKg, 0)).toBe(s.dispatchedKg);
  });

  it("ignores a row whose warehouse the tenant does not own", async () => {
    const sb = fakeSupabase(
      tablesFor({
        grain_batches: [],
        grain_dispatches: [
          { created_at: thisMonth, total_qty_kg: 10, total_amount: 1000, warehouse_id: "w-khi" },
          // Unattributed rows exist in real data (legacy pre-multi-warehouse
          // rows have a null warehouse_id) and belong to no city.
          { created_at: thisMonth, total_qty_kg: 99, total_amount: 9999, warehouse_id: null },
        ],
      }),
    );
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");

    expect(s.byCity).toHaveLength(1);
    expect(s.byCity[0].revenue).toBe(1000);
  });

  it("fetches far enough back for a year-to-date comparison", async () => {
    const sb = fakeSupabase(tablesFor({ grain_batches: [], grain_dispatches: [] }));
    await buildPortfolioSummary(sb as never, USER, "ytd");

    // The prior year-to-date window starts in January of last year, which is
    // further back than the twelve-month sparkline — fetching only twelve
    // months would silently zero the delta.
    const from = String(sb.calls.find((c) => c.table === "grain_dispatches")?.gte.created_at);
    expect(new Date(from).getFullYear()).toBe(now.getFullYear() - 1);
    expect(new Date(from).getMonth()).toBe(0);
  });

  it("gives the sparkline one point per month", async () => {
    const sb = fakeSupabase(tablesFor({ grain_batches: [], grain_dispatches: [] }));
    const s = await buildPortfolioSummary(sb as never, USER, "mtd");
    expect(s.revenueSpark).toHaveLength(12);
  });
});
