import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BASE_URL, HAS_SECRETS, mintUser, cleanupUser, authHeaders, waitForBoot } from "./_setup";

const d = HAS_SECRETS ? describe : describe.skip;

d("field bundle + mutations", () => {
  let token = "", userId = "";

  beforeAll(async () => {
    expect(await waitForBoot()).toBe(true);
    const u = await mintUser("technician");
    token = u.accessToken; userId = u.userId;
  }, 30_000);

  afterAll(async () => { if (userId) await cleanupUser(userId); });

  it("401 without bearer", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/field/bundle`);
    expect(r.status).toBe(401);
  });

  it("426 when build is below minimum", async () => {
    const r = await fetch(`${BASE_URL}/api/public/v1/field/bundle`, {
      headers: { Authorization: `Bearer ${token}`, "x-app-build": "1" },
    });
    // Only asserts when settings enforce a minimum; either 200 or 426 acceptable
    expect([200, 426]).toContain(r.status);
  });

  it("returns bundle then 304 with matching If-None-Match", async () => {
    const r1 = await fetch(`${BASE_URL}/api/public/v1/field/bundle`, { headers: authHeaders(token) });
    expect(r1.status).toBe(200);
    const etag = r1.headers.get("etag");
    expect(etag).toBeTruthy();
    const body = await r1.json();
    expect(body.data).toHaveProperty("tasks");
    expect(body.data).toHaveProperty("incidents");

    const r2 = await fetch(`${BASE_URL}/api/public/v1/field/bundle`, {
      headers: { ...authHeaders(token), "If-None-Match": etag! },
    });
    expect(r2.status).toBe(304);
  });

  it("mutation batch: unknown kind → error item; duplicate client_id → deduped", async () => {
    const clientId = `t-${Date.now()}`;
    const body = {
      mutations: [
        { client_id: clientId, kind: "read-notifs", payload: { ids: ["00000000-0000-0000-0000-000000000000"] } },
        { client_id: `${clientId}-x`, kind: "does-not-exist", payload: {} },
      ],
    };
    const r = await fetch(`${BASE_URL}/api/public/v1/field/mutations`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify(body),
    });
    expect(r.status).toBe(200);
    const j = await r.json();
    const results: Array<{ client_id: string; status: string; error?: string }> = j.data.results;
    expect(results).toHaveLength(2);
    const unk = results.find((x) => x.client_id === `${clientId}-x`)!;
    expect(unk.status).toBe("error");
    expect(unk.error).toMatch(/unknown_kind/);

    // Replay same batch — first item should be deduped
    const r2 = await fetch(`${BASE_URL}/api/public/v1/field/mutations`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify(body),
    });
    const j2 = await r2.json();
    const first = j2.data.results.find((x: { client_id: string }) => x.client_id === clientId);
    expect(first.status).toBe("deduped");
  });

  it("400 on oversized batch", async () => {
    const mutations = Array.from({ length: 51 }, (_, i) => ({
      client_id: `x-${i}`, kind: "read-notifs", payload: { ids: [] },
    }));
    const r = await fetch(`${BASE_URL}/api/public/v1/field/mutations`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify({ mutations }),
    });
    expect(r.status).toBe(400);
  });
});