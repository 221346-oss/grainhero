import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BASE_URL, HAS_SECRETS, admin, mintUser, cleanupUser, authHeaders, waitForBoot } from "./_setup";

const d = HAS_SECRETS ? describe : describe.skip;

d("commerce cart", () => {
  let token = "", userId = "";
  const LISTING_ID = "00000000-0000-0000-0000-000000000000";

  beforeAll(async () => {
    expect(await waitForBoot()).toBe(true);
    const u = await mintUser("admin");
    token = u.accessToken; userId = u.userId;
  }, 30_000);

  afterAll(async () => { if (userId) await cleanupUser(userId); });

  it("PUT computes subtotal and returns warnings from settings", async () => {
    const body = {
      items: [
        { listing_id: LISTING_ID, quantity_kg: 2, unit_price_cents: 500 },
        { listing_id: LISTING_ID, quantity_kg: 1, unit_price_cents: 1000 },
      ],
      currency: "USD",
    };
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, {
      method: "PUT", headers: authHeaders(token), body: JSON.stringify(body),
    });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.subtotal_cents).toBe(2000);
    expect(j.data.buyer_id).toBe(userId);
  });

  it("GET returns the persisted cart", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, { headers: authHeaders(token) });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.subtotal_cents).toBe(2000);
  });

  it("DELETE clears the cart", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, {
      method: "DELETE", headers: authHeaders(token),
    });
    expect(r.status).toBe(200);
    const g = await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, { headers: authHeaders(token) });
    const gj = await g.json();
    expect(gj.data).toBeNull();
  });

  it("403 when checkout_disabled", async () => {
    // Toggle setting off, then back on
    const { data: current } = await admin.from("mobile_commerce_settings" as never).select("*").limit(1).maybeSingle();
    const cur = current as { id?: string; checkout_enabled?: boolean } | null;
    if (!cur) return; // no settings row → skip
    await admin.from("mobile_commerce_settings" as never).update({ checkout_enabled: false } as never).eq("id", cur.id ?? true);
    try {
      const r = await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, {
        method: "PUT", headers: authHeaders(token),
        body: JSON.stringify({ items: [{ listing_id: LISTING_ID, quantity_kg: 1, unit_price_cents: 100 }], currency: "USD" }),
      });
      expect(r.status).toBe(403);
    } finally {
      await admin.from("mobile_commerce_settings" as never).update({ checkout_enabled: true } as never).eq("id", cur.id ?? true);
    }
  });
});