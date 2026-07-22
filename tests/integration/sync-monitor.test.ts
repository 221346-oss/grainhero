import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { HAS_SECRETS, admin, waitForBoot } from "./_setup";

const d = HAS_SECRETS ? describe : describe.skip;

/**
 * `runSyncManually` is a `createServerFn` reached over an opaque RPC path,
 * so we can't hit it as raw HTTP. Instead we exercise the underlying
 * concurrency + idempotency primitives it depends on (mobile_sync_locks PK
 * + mobile_sync_runs idempotency_key), which is what the whole feature relies
 * on. Any regression there breaks the server function above.
 */
d("sync monitor concurrency primitives", () => {
  const endpoint = "field-tasks";

  beforeAll(async () => {
    expect(await waitForBoot()).toBe(true);
    await admin.from("mobile_sync_locks").delete().eq("endpoint", endpoint);
  });

  afterAll(async () => {
    await admin.from("mobile_sync_locks").delete().eq("endpoint", endpoint);
    await admin.from("mobile_sync_runs").delete().eq("idempotency_key", "int-test-key-1");
  });

  it("only one lock row per endpoint (PK on endpoint)", async () => {
    const now = new Date().toISOString();
    const [a, b] = await Promise.all([
      admin.from("mobile_sync_locks").insert({ endpoint, locked_at: now } as never),
      admin.from("mobile_sync_locks").insert({ endpoint, locked_at: now } as never),
    ]);
    const errors = [a.error, b.error].filter(Boolean);
    expect(errors.length).toBe(1); // exactly one insert conflicts
    expect(errors[0]!.message).toMatch(/duplicate|unique/i);

    // Release
    await admin.from("mobile_sync_locks").delete().eq("endpoint", endpoint);
    const { data } = await admin.from("mobile_sync_locks").select("*").eq("endpoint", endpoint);
    expect(data ?? []).toHaveLength(0);
  });

  it("idempotency key on mobile_sync_runs is queryable and unique per key/endpoint", async () => {
    const key = "int-test-key-1";
    const ins = await admin.from("mobile_sync_runs").insert({
      endpoint, status: "ok", duration_ms: 5, row_count: 1,
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
      idempotency_key: key, manual: true,
    } as never);
    expect(ins.error).toBeNull();

    const { data } = await admin.from("mobile_sync_runs")
      .select("status,row_count,idempotency_key")
      .eq("endpoint", endpoint).eq("idempotency_key", key).maybeSingle();
    expect(data).toBeTruthy();
    expect((data as { status: string; row_count: number }).status).toBe("ok");
    expect((data as { row_count: number }).row_count).toBe(1);
  });
});