import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BASE_URL, HAS_SECRETS, admin, mintUser, cleanupUser, authHeaders, waitForBoot } from "./_setup";

const d = HAS_SECRETS ? describe : describe.skip;

type CreatedIds = {
  adminUser?: string;
  buyerUser?: string;
  buyerToken?: string;
  addressId?: string;
  listingId?: string;
  batchId?: string;
  siloId?: string;
  warehouseId?: string;
  orderIds: string[];
  savedAllowedMethods?: string[];
  cfgId?: string;
};

d("commerce checkout", () => {
  const ids: CreatedIds = { orderIds: [] };

  beforeAll(async () => {
    expect(await waitForBoot()).toBe(true);

    // Seller + buyer users
    const seller = await mintUser("admin"); ids.adminUser = seller.userId;
    const buyer = await mintUser("admin"); ids.buyerUser = buyer.userId; ids.buyerToken = buyer.accessToken;

    // Seed warehouse + silo + batch owned by seller so a listing can reference batch_id (NOT NULL)
    const wh = await admin.from("warehouses").insert({
      warehouse_id: `WH-${Date.now()}`, name: "Integ WH",
      admin_id: ids.adminUser!, created_by: ids.adminUser!,
    } as never).select("id").single();
    if (wh.error) throw wh.error;
    const whId = (wh.data as { id: string }).id;
    ids.warehouseId = whId;

    const silo = await admin.from("silos").insert({
      silo_id: `SL-${Date.now()}`, name: "Integ Silo",
      admin_id: ids.adminUser!, warehouse_id: whId, capacity_kg: 100000,
      created_by: ids.adminUser!,
    } as never).select("id").single();
    if (silo.error) throw silo.error;
    ids.siloId = (silo.data as { id: string }).id;

    const batch = await admin.from("grain_batches").insert({
      batch_id: `B-${Date.now()}`, admin_id: ids.adminUser!,
      silo_id: ids.siloId!, warehouse_id: whId,
      grain_type: "Wheat", quantity_kg: 5000, created_by: ids.adminUser!,
    } as never).select("id").single();
    if (batch.error) throw batch.error;
    ids.batchId = (batch.data as { id: string }).id;

    const { data: listing, error: lErr } = await admin.from("grain_listings").insert({
      admin_id: ids.adminUser!, created_by: ids.adminUser!,
      batch_id: ids.batchId,
      title: "IntegTest Wheat", description: "test",
      price_per_kg: 1.5, currency: "USD",
      available_kg: 1000, min_order_kg: 1,
      visibility: "public", status: "active",
    } as never).select("id, batch_id").single();
    if (lErr) throw lErr;
    ids.listingId = (listing as { id: string }).id;

    // Address for buyer
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses`, {
      method: "POST", headers: authHeaders(ids.buyerToken!),
      body: JSON.stringify({
        label: "Home", recipient: "Buyer Test", phone: "+15550000000",
        line1: "1 Test St", city: "Testville", country: "US", is_default: true,
      }),
    });
    const rj = await r.json();
    ids.addressId = rj.data.id;

    // Ensure commerce settings allow card + cod
    const { data: cfg } = await admin.from("mobile_commerce_settings").select("*").limit(1).maybeSingle();
    ids.cfgId = (cfg as { id: string } | null)?.id;
    ids.savedAllowedMethods = (cfg as { allowed_payment_methods?: string[] } | null)?.allowed_payment_methods;
    if (ids.cfgId) {
      await admin.from("mobile_commerce_settings").update({
        checkout_enabled: true,
        allowed_payment_methods: ["card", "cod"],
        min_order_cents: 1,
        cod_max_cents: 100_000_000,
      } as never).eq("id", ids.cfgId);
    }
  }, 45_000);

  afterAll(async () => {
    for (const oid of ids.orderIds) {
      await admin.from("buyer_payment_intents").delete().eq("order_id", oid);
      await admin.from("buyer_order_events").delete().eq("order_id", oid);
      await admin.from("buyer_orders").delete().eq("id", oid);
    }
    if (ids.listingId) await admin.from("grain_listings").delete().eq("id", ids.listingId);
    if (ids.batchId) await admin.from("grain_batches").delete().eq("id", ids.batchId);
    if (ids.siloId) await admin.from("silos").delete().eq("id", ids.siloId);
    if (ids.warehouseId) await admin.from("warehouses").delete().eq("id", ids.warehouseId);
    if (ids.buyerUser) {
      await admin.from("mobile_idempotency_keys").delete().eq("user_id", ids.buyerUser);
      await cleanupUser(ids.buyerUser);
    }
    if (ids.adminUser) await cleanupUser(ids.adminUser);
    if (ids.cfgId && ids.savedAllowedMethods) {
      await admin.from("mobile_commerce_settings").update({
        allowed_payment_methods: ids.savedAllowedMethods,
      } as never).eq("id", ids.cfgId);
    }
  });

  it("quote returns positive totals with server-authoritative pricing", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/quote`, {
      method: "POST", headers: authHeaders(ids.buyerToken!),
      body: JSON.stringify({
        items: [{ listing_id: ids.listingId, quantity_kg: 2, unit_price_cents: 1 /* bad price */ }],
        address_id: ids.addressId,
      }),
    });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.subtotal_cents).toBe(300); // 2 kg × 150¢
    expect(j.data.total_cents).toBeGreaterThanOrEqual(300);
    expect(j.data.warnings).toContain(`price_updated:${ids.listingId}`);
  });

  it("checkout requires a non-empty cart", async () => {
    // Ensure cart is empty
    await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, { method: "DELETE", headers: authHeaders(ids.buyerToken!) });
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/checkout`, {
      method: "POST", headers: authHeaders(ids.buyerToken!),
      body: JSON.stringify({ address_id: ids.addressId, payment_method: "cod", idempotency_key: "empty-cart-key-1234" }),
    });
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe("cart_empty");
  });

  it("cod checkout creates a confirmed order and is idempotent", async () => {
    // Seed cart
    await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, {
      method: "PUT", headers: authHeaders(ids.buyerToken!),
      body: JSON.stringify({
        items: [{ listing_id: ids.listingId, quantity_kg: 3, unit_price_cents: 150 }],
        currency: "USD",
      }),
    });

    const key = `cod-key-${Date.now()}`;
    const body = JSON.stringify({ address_id: ids.addressId, payment_method: "cod", idempotency_key: key });
    const r1 = await fetch(`${BASE_URL}/api/public/v1/commerce/checkout`, {
      method: "POST", headers: authHeaders(ids.buyerToken!), body,
    });
    if (r1.status !== 200) throw new Error("checkout body: " + (await r1.clone().text()));
    expect(r1.status).toBe(200);
    const j1 = await r1.json();
    expect(j1.data.orders).toHaveLength(1);
    expect(j1.data.orders[0].status).toBe("confirmed");
    expect(j1.data.orders[0].client_secret).toBeUndefined();
    ids.orderIds.push(j1.data.orders[0].order_id);

    // Idempotent replay
    const r2 = await fetch(`${BASE_URL}/api/public/v1/commerce/checkout`, {
      method: "POST", headers: authHeaders(ids.buyerToken!), body,
    });
    const j2 = await r2.json();
    expect(j2.meta.replayed).toBe(true);
    expect(j2.data.orders[0].order_id).toBe(j1.data.orders[0].order_id);
  });

  it("cod rejected when payment method not allowed", async () => {
    if (!ids.cfgId) return;
    await admin.from("mobile_commerce_settings").update({
      allowed_payment_methods: ["card"],
    } as never).eq("id", ids.cfgId);
    try {
      // Re-seed cart (previous checkout cleared it)
      await fetch(`${BASE_URL}/api/public/v1/commerce/cart`, {
        method: "PUT", headers: authHeaders(ids.buyerToken!),
        body: JSON.stringify({
          items: [{ listing_id: ids.listingId, quantity_kg: 1, unit_price_cents: 150 }],
          currency: "USD",
        }),
      });
      const r = await fetch(`${BASE_URL}/api/public/v1/commerce/checkout`, {
        method: "POST", headers: authHeaders(ids.buyerToken!),
        body: JSON.stringify({ address_id: ids.addressId, payment_method: "cod", idempotency_key: `cod-blocked-${Date.now()}` }),
      });
      expect(r.status).toBe(403);
      const j = await r.json();
      expect(j.error).toBe("payment_method_not_allowed");
    } finally {
      await admin.from("mobile_commerce_settings").update({
        allowed_payment_methods: ["card", "cod"],
      } as never).eq("id", ids.cfgId);
    }
  });

  it("orders list is scoped to the caller and returns the placed order", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/orders?limit=20`, { headers: authHeaders(ids.buyerToken!) });
    expect(r.status).toBe(200);
    const j = await r.json();
    const list = j.data as Array<{ id: string }>;
    expect(list.some((o) => ids.orderIds.includes(o.id))).toBe(true);
  });

  it("order detail returns events + payments + shipments arrays", async () => {
    const oid = ids.orderIds[0];
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/orders/${oid}`, { headers: authHeaders(ids.buyerToken!) });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.order.id).toBe(oid);
    expect(Array.isArray(j.data.events)).toBe(true);
    expect(j.data.events.length).toBeGreaterThan(0);
    expect(Array.isArray(j.data.shipments)).toBe(true);
    expect(Array.isArray(j.data.payments)).toBe(true);
  });

  it("order detail is forbidden for another buyer", async () => {
    const other = await mintUser("admin");
    try {
      const oid = ids.orderIds[0];
      const r = await fetch(`${BASE_URL}/api/public/v1/commerce/orders/${oid}`, { headers: authHeaders(other.accessToken) });
      expect(r.status).toBe(403);
    } finally { await cleanupUser(other.userId); }
  });
});