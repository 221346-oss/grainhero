import { describe, expect, it } from "vitest";
import { ALL_LOCATIONS, resolveLocationScope } from "../../src/lib/page-scope.server";

type Row = Record<string, unknown>;

/**
 * Minimal chainable stand-in for the Supabase query builder.
 *
 * Records the `.in()` filters applied so a test can assert what the silo lookup
 * was actually narrowed to, and resolves to whatever rows the table holds.
 */
function fakeSupabase(tables: Record<string, Row[]>) {
  const calls: Array<{ table: string; in: Record<string, unknown[]> }> = [];

  return {
    calls,
    from(table: string) {
      const record = { table, in: {} as Record<string, unknown[]> };
      calls.push(record);
      const rows = tables[table] ?? [];

      const builder: Record<string, unknown> = {
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: rows, error: null }),
      };
      for (const method of ["select", "is", "limit", "eq", "order"]) {
        builder[method] = () => builder;
      }
      builder.in = (col: string, vals: unknown[]) => {
        record.in[col] = vals;
        return builder;
      };
      return builder;
    },
  };
}

const WAREHOUSES: Row[] = [
  { id: "w-khi-1", name: "Karachi — A", location_city: "Karachi" },
  { id: "w-khi-2", name: "Karachi — B", location: { city: "  karachi " } },
  { id: "w-pindi", name: "Pindi — A", location_city: "Rawalpindi" },
  { id: "w-none", name: "Spare Shed" },
];

const SILOS: Row[] = [{ id: "s-1" }, { id: "s-2" }];

describe("resolveLocationScope", () => {
  it("returns the unscoped default when no city is given", async () => {
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    for (const input of [undefined, null, "", "   "]) {
      const scope = await resolveLocationScope(sb as never, input);
      expect(scope).toEqual(ALL_LOCATIONS);
    }
    // Nothing should have been queried for the unscoped path.
    expect(sb.calls).toHaveLength(0);
  });

  it("resolves a city to its warehouses regardless of how it was spelled", async () => {
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    const scope = await resolveLocationScope(sb as never, "karachi");

    expect(scope.warehouseIds).toEqual(["w-khi-1", "w-khi-2"]);
    expect(scope.cityKey).toBe("karachi");
  });

  it("excludes warehouses from every other city", async () => {
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    const scope = await resolveLocationScope(sb as never, "karachi");

    // The bleed this whole feature exists to prevent.
    expect(scope.warehouseIds).not.toContain("w-pindi");
    expect(scope.warehouseIds).not.toContain("w-none");
  });

  it("narrows the silo lookup to the resolved warehouses", async () => {
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    const scope = await resolveLocationScope(sb as never, "rawalpindi");

    expect(scope.warehouseIds).toEqual(["w-pindi"]);
    expect(scope.siloIds).toEqual(["s-1", "s-2"]);

    const siloQuery = sb.calls.find((c) => c.table === "silos");
    expect(siloQuery?.in.warehouse_id).toEqual(["w-pindi"]);
  });

  it("returns an EMPTY scope for an unknown city, never the whole tenant", async () => {
    // The important safety property. A stale or hand-edited `?loc=` must show
    // nothing rather than silently widening to every warehouse the admin owns —
    // RLS would not catch that, because the admin does own them all.
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    const scope = await resolveLocationScope(sb as never, "atlantis");

    expect(scope.warehouseIds).toEqual([]);
    expect(scope.siloIds).toEqual([]);
    expect(scope.warehouseIds).not.toBeNull();
  });

  it("groups warehouses with no usable city under the unassigned bucket", async () => {
    const sb = fakeSupabase({ warehouses: WAREHOUSES, silos: SILOS });
    const scope = await resolveLocationScope(sb as never, "unassigned");

    expect(scope.warehouseIds).toEqual(["w-none"]);
  });
});
