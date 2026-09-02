/**
 * Cross-location isolation, against a real database.
 *
 * This is what S15 asked for and what §11 never actually established: the unit
 * tests prove the scope resolver's logic against a fake query builder, and the
 * by-hand check in §11 turned out to be reading platform data. Neither shows
 * that a scoped query returns disjoint rows from a real table.
 *
 * Deliberately driven by a **service-role** client, which bypasses RLS. That is
 * the point rather than a shortcut: the requirement is application-layer
 * segregation (S10), so the filtering has to hold with the database's own
 * row-level protection switched off. If these pass under service role, they
 * pass for every caller.
 *
 * Read-only. Nothing here writes, and the fixtures are discovered from whatever
 * the database already holds — so the suite skips rather than fails when the
 * data it needs is absent.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { byWarehouse, resolveLocationScope } from "../../src/lib/page-scope.server";

/** `.env.local` is gitignored, so CI supplies these through the environment. */
function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = { ...(process.env as Record<string, string>) };
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return merged;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const at = line.indexOf("=");
    if (at < 0 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, at).trim();
    if (!merged[key]) merged[key] = line.slice(at + 1).trim();
  }
  return merged;
}

const env = loadEnv();
const URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

type Warehouse = { id: string; admin_id: string; name: string | null };

/** Two populated warehouses owned by one tenant, plus one owned by another. */
type Fixture = {
  adminId: string;
  own: [Warehouse, Warehouse];
  foreign: Warehouse;
};

let sb: SupabaseClient;
let fixture: Fixture | null = null;
let skipReason = "";

beforeAll(async () => {
  if (!URL || !KEY) {
    skipReason = "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set";
    return;
  }
  sb = createClient(URL, KEY, { auth: { persistSession: false } });

  const { data: warehouses, error } = await sb
    .from("warehouses")
    .select("id, admin_id, name")
    .is("deleted_at", null)
    .limit(500);
  if (error) throw error;

  const { data: silos } = await sb
    .from("silos")
    .select("id, warehouse_id")
    .is("deleted_at", null)
    .limit(5000);

  const populated = new Set((silos ?? []).map((s) => s.warehouse_id as string));

  const byTenant = new Map<string, Warehouse[]>();
  for (const w of (warehouses ?? []) as Warehouse[]) {
    if (!populated.has(w.id)) continue;
    if (!byTenant.has(w.admin_id)) byTenant.set(w.admin_id, []);
    byTenant.get(w.admin_id)!.push(w);
  }

  for (const [adminId, own] of byTenant) {
    if (own.length < 2) continue;
    const foreign = ((warehouses ?? []) as Warehouse[]).find((w) => w.admin_id !== adminId);
    if (!foreign) continue;
    fixture = { adminId, own: [own[0], own[1]], foreign };
    break;
  }

  if (!fixture) {
    skipReason = "no tenant with two populated warehouses alongside another tenant";
  }
});

/** Ids a scoped query returns from one warehouse-keyed table. */
async function idsIn(table: string, warehouseId: string, adminId: string): Promise<string[]> {
  const scope = await resolveLocationScope(sb, adminId, null, warehouseId);
  const { data } = await byWarehouse(sb.from(table).select("id"), scope).limit(5000);
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

describe("cross-location isolation", () => {
  it("discovered the fixtures it needs", (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    // Named so a passing run says which warehouses actually carried the proof —
    // a green suite that silently tested nothing is worse than a red one.
    console.info(
      `[fixture] tenant ${fixture.adminId} — "${fixture.own[0].name}" vs "${fixture.own[1].name}", foreign "${fixture.foreign.name}"`,
    );
    expect(fixture.own[0].id).not.toBe(fixture.own[1].id);
    expect(fixture.foreign.admin_id).not.toBe(fixture.adminId);
  });

  it("returns disjoint silos for two warehouses of the same tenant", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    const [a, b] = fixture.own;
    const sa = await resolveLocationScope(sb, fixture.adminId, null, a.id);
    const sbScope = await resolveLocationScope(sb, fixture.adminId, null, b.id);

    expect(sa.warehouseIds).toEqual([a.id]);
    expect(sbScope.warehouseIds).toEqual([b.id]);

    // The property the feature exists for. A silo belongs to one warehouse, so
    // any overlap means a scope resolved wider than it claimed.
    const overlap = (sa.siloIds ?? []).filter((id) => (sbScope.siloIds ?? []).includes(id));
    expect(overlap).toEqual([]);
  });

  it("returns disjoint rows from every warehouse-keyed table", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    const [a, b] = fixture.own;

    for (const table of ["grain_batches", "grain_alerts", "grain_dispatches"]) {
      const inA = await idsIn(table, a.id, fixture.adminId);
      const inB = await idsIn(table, b.id, fixture.adminId);
      const overlap = inA.filter((id) => inB.includes(id));
      expect(overlap, `${table} bled between two warehouses`).toEqual([]);
    }
  });

  it("never returns more than the tenant-wide total", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    const [a, b] = fixture.own;

    // A scope that widened instead of narrowing would show up here as a part
    // exceeding the whole.
    const { data: all } = await sb
      .from("grain_batches")
      .select("id, warehouse_id")
      .is("deleted_at", null)
      .limit(5000);
    const tenantWarehouses = new Set([a.id, b.id]);
    const tenantTotal = ((all ?? []) as Array<{ warehouse_id: string }>).filter((r) =>
      tenantWarehouses.has(r.warehouse_id),
    ).length;

    const inA = await idsIn("grain_batches", a.id, fixture.adminId);
    const inB = await idsIn("grain_batches", b.id, fixture.adminId);
    expect(inA.length + inB.length).toBeLessThanOrEqual(tenantTotal);
  });

  it("refuses a warehouse belonging to another tenant", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    // An id from the client is a request, not a permission — and RLS is off in
    // this suite, so only the application-layer filter can reject it.
    const scope = await resolveLocationScope(sb, fixture.adminId, null, fixture.foreign.id);

    expect(scope.warehouseIds).toEqual([]);
    expect(scope.siloIds).toEqual([]);
  });

  it("fails closed on an unknown warehouse, rather than widening", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    const scope = await resolveLocationScope(
      sb,
      fixture.adminId,
      null,
      "00000000-0000-0000-0000-000000000000",
    );

    // Empty, never null. Null would mean "every warehouse in the tenant", which
    // is exactly the widening a stale `?loc=` must not cause.
    expect(scope.warehouseIds).toEqual([]);
    expect(scope.warehouseIds).not.toBeNull();
  });

  it("scopes a table that keys on silo_id, not warehouse_id", async (ctx) => {
    if (!fixture) return ctx.skip(skipReason);
    const [a, b] = fixture.own;
    const sa = await resolveLocationScope(sb, fixture.adminId, null, a.id);
    const sbScope = await resolveLocationScope(sb, fixture.adminId, null, b.id);

    const actuatorsFor = async (siloIds: string[] | null) => {
      if (!siloIds?.length) return [];
      const { data } = await sb.from("actuators").select("id").in("silo_id", siloIds).limit(5000);
      return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
    };

    const inA = await actuatorsFor(sa.siloIds);
    const inB = await actuatorsFor(sbScope.siloIds);
    expect(inA.filter((id) => inB.includes(id))).toEqual([]);
  });
});
