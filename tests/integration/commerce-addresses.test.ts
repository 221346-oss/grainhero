import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BASE_URL, HAS_SECRETS, mintUser, cleanupUser, authHeaders, waitForBoot } from "./_setup";

const d = HAS_SECRETS ? describe : describe.skip;

d("commerce addresses", () => {
  let tokenA = "", userA = "", tokenB = "", userB = "";
  let addressId = "";

  beforeAll(async () => {
    expect(await waitForBoot()).toBe(true);
    const a = await mintUser("admin"); tokenA = a.accessToken; userA = a.userId;
    const b = await mintUser("admin"); tokenB = b.accessToken; userB = b.userId;
  }, 30_000);

  afterAll(async () => {
    if (userA) await cleanupUser(userA);
    if (userB) await cleanupUser(userB);
  });

  it("POST creates address", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses`, {
      method: "POST", headers: authHeaders(tokenA),
      body: JSON.stringify({
        label: "Home", recipient: "Test User", phone: "+15550000000",
        line1: "1 Test St", city: "Testville", country: "US", is_default: true,
      }),
    });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.buyer_id).toBe(userA);
    expect(j.data.is_default).toBe(true);
    addressId = j.data.id;
  });

  it("new default clears the previous one", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses`, {
      method: "POST", headers: authHeaders(tokenA),
      body: JSON.stringify({
        label: "Office", recipient: "Test User", phone: "+15550000000",
        line1: "2 Test Ave", city: "Testville", country: "US", is_default: true,
      }),
    });
    expect(r.status).toBe(200);
    const g = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses`, { headers: authHeaders(tokenA) });
    const gj = await g.json();
    const defaults = (gj.data as Array<{ is_default: boolean }>).filter((x) => x.is_default);
    expect(defaults.length).toBe(1);
  });

  it("cross-buyer DELETE is a no-op (RLS)", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses?id=${addressId}`, {
      method: "DELETE", headers: authHeaders(tokenB),
    });
    expect(r.status).toBe(200);
    // Address should still exist for userA
    const g = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses`, { headers: authHeaders(tokenA) });
    const gj = await g.json();
    expect((gj.data as Array<{ id: string }>).some((a) => a.id === addressId)).toBe(true);
  });

  it("owner DELETE removes it", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/commerce/addresses?id=${addressId}`, {
      method: "DELETE", headers: authHeaders(tokenA),
    });
    expect(r.status).toBe(200);
  });
});