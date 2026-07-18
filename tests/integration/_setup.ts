import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";

export const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:8080";
export const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const PUB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const HAS_SECRETS = Boolean(SUPABASE_URL && SERVICE_KEY && PUB_KEY);

export const admin = HAS_SECRETS
  ? createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as SupabaseClient<Database>);

function stripBearer(key: string) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) && h.get("Authorization") === `Bearer ${key}`) {
      h.delete("Authorization");
    }
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
}

/** Mint an auth.users user, assign role, sign in with password, return token. */
export async function mintUser(role: "admin" | "manager" | "technician" | "super_admin" = "admin") {
  const email = `int-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@grainhero.test`;
  const password = `Int-Test-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`createUser: ${created.error?.message}`);
  const userId = created.data.user.id;

  // Assign role (upsert; handle_new_user trigger may have inserted 'admin' already)
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error: rErr } = await admin.from("user_roles").insert({ user_id: userId, role } as never);
  if (rErr) throw new Error(`role insert: ${rErr.message}`);

  // Sign in with publishable key client to get access token
  const auth = createClient<Database>(SUPABASE_URL, PUB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: stripBearer(PUB_KEY) },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn: ${error?.message}`);
  return { userId, email, accessToken: data.session.access_token };
}

export async function cleanupUser(userId: string) {
  await admin.from("buyer_carts").delete().eq("buyer_id", userId);
  await admin.from("buyer_addresses").delete().eq("buyer_id", userId);
  await admin.from("mobile_field_bundles").delete().eq("user_id", userId);
  await admin.from("field_incidents").delete().eq("reported_by", userId);
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

export function authHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-app-build": "999999",
    ...(extra ?? {}),
  };
}

export async function waitForBoot(): Promise<boolean> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE_URL}/api/public/v1/commerce/config`);
      if (r.status < 500) return true;
    } catch { /* keep polling */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}