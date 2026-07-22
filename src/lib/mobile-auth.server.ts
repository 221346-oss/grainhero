/**
 * Phase 23 — Mobile public API auth helper.
 *
 * Server-only. Builds a Supabase client scoped to the caller's bearer token
 * (same JWT the Flutter app receives from Supabase Auth). Also loads the
 * super-admin configurable `mobile` settings block and enforces min-build.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type MobileSettings = {
  min_build: number;
  latest_build: number;
  force_update_below: number;
  sync_page_size: number;
  max_sync_page_size: number;
  heartbeat_interval_seconds: number;
  uploads: Record<string, { bucket: string; max_mb: number; allowed_mime: string[] }>;
  feature_flags: Record<string, boolean>;
  deep_link: { scheme: string; universal_host: string };
};

const DEFAULTS: MobileSettings = {
  min_build: 1,
  latest_build: 1,
  force_update_below: 0,
  sync_page_size: 200,
  max_sync_page_size: 1000,
  heartbeat_interval_seconds: 300,
  uploads: {},
  feature_flags: {},
  deep_link: { scheme: "grainhero", universal_host: "app.grainhero.com" },
};

function stripBearer(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
        headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export type MobileContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  settings: MobileSettings;
};

function bad(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

export async function authenticateMobile(request: Request): Promise<MobileContext | Response> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return bad(500, "server_misconfigured");

  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return bad(401, "missing_bearer");
  const token = auth.slice(7).trim();
  if (!token || token.split(".").length !== 3) return bad(401, "invalid_token");

  const supabase = createClient<Database>(url, key, {
    global: { fetch: stripBearer(key), headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return bad(401, "invalid_token");

  const settings = await getMobileSettings(supabase);

  const build = Number(request.headers.get("x-app-build") ?? "0");
  if (build && build < settings.min_build) {
    return bad(426, "upgrade_required", { min_build: settings.min_build, latest_build: settings.latest_build });
  }

  return { supabase, userId: data.claims.sub, settings };
}

export async function getMobileSettings(supabase: SupabaseClient<Database>): Promise<MobileSettings> {
  const { data } = await supabase
    .from("platform_settings")
    .select("config")
    .eq("id", "singleton")
    .maybeSingle();
  const cfg = ((data?.config ?? {}) as Record<string, unknown>).mobile as Partial<MobileSettings> | undefined;
  return { ...DEFAULTS, ...(cfg ?? {}) } as MobileSettings;
}

export function meta(cursor?: string | null) {
  return { server_time: new Date().toISOString(), cursor: cursor ?? null, version: "v1" };
}

export function ok<T>(data: T, extra?: Record<string, unknown>) {
  return Response.json({ data, meta: { ...meta(), ...(extra ?? {}) } });
}

export function parseSince(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Idempotency: look up prior response for (user_id, key). Returns cached
 * response or null. Caller should insert the response after successful work.
 */
export async function getIdempotent(
  supabase: SupabaseClient<Database>,
  userId: string,
  key: string | null,
  endpoint: string,
): Promise<unknown | null> {
  if (!key) return null;
  const { data } = await supabase
    .from("mobile_idempotency_keys")
    .select("response")
    .eq("user_id", userId)
    .eq("key", key)
    .eq("endpoint", endpoint)
    .maybeSingle();
  return (data?.response as unknown) ?? null;
}

export async function saveIdempotent(
  supabase: SupabaseClient<Database>,
  userId: string,
  key: string | null,
  endpoint: string,
  response: unknown,
): Promise<void> {
  if (!key) return;
  await supabase.from("mobile_idempotency_keys").upsert({
    user_id: userId,
    key,
    endpoint,
    response: response as never,
  });
}
