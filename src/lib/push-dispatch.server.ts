/**
 * Phase 24 — FCM v1 push sender (Worker/edge-safe).
 *
 * Signs a service-account JWT with Web Crypto (RS256), exchanges it for a
 * short-lived OAuth2 access token, then POSTs to FCM v1 per device token.
 * Requires the `FCM_SERVICE_ACCOUNT_JSON` secret. When the secret is
 * missing, sendPush() returns { skipped: true } and callers record the
 * delivery as skipped — the app never blocks on push provisioning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type CachedToken = { token: string; exp: number };
let _tokenCache: CachedToken | null = null;

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch { return null; }
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.exp - 60 > now) return _tokenCache.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`fcm-token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = { token: body.access_token, exp: now + body.expires_in };
  return body.access_token;
}

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
  highPriority?: boolean;
  ttlSeconds?: number;
};

export type SendResult =
  | { skipped: true; reason: string }
  | { ok: true; messageId: string | null }
  | { ok: false; error: string; unregistered?: boolean };

export async function sendPush(token: string, msg: PushMessage): Promise<SendResult> {
  const sa = loadServiceAccount();
  if (!sa) return { skipped: true, reason: "not-configured" };
  let accessToken: string;
  try { accessToken = await getAccessToken(sa); }
  catch (e) { return { ok: false, error: `token: ${(e as Error).message}` }; }

  const payload = {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: msg.data ?? {},
      android: {
        priority: msg.highPriority ? "HIGH" : "NORMAL",
        ttl: `${msg.ttlSeconds ?? 3600}s`,
      },
      apns: {
        headers: {
          "apns-priority": msg.highPriority ? "10" : "5",
          "apns-expiration": `${Math.floor(Date.now() / 1000) + (msg.ttlSeconds ?? 3600)}`,
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (res.ok) {
    const j = (await res.json()) as { name?: string };
    return { ok: true, messageId: j.name ?? null };
  }
  const text = await res.text();
  const unregistered = /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/i.test(text);
  return { ok: false, error: `${res.status}: ${text.slice(0, 300)}`, unregistered };
}

/** Fetch all active device tokens for a user (RLS-bypassing via admin client). */
export async function loadUserDevices(sb: SupabaseClient, userId: string) {
  const { data } = await sb
    .from("mobile_devices")
    .select("id, push_token, platform")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .not("push_token", "is", null)
    .limit(20);
  return (data ?? []) as Array<{ id: string; push_token: string; platform: string }>;
}

/** Mark device revoked after unrecoverable push failure. */
export async function markDeviceRevoked(sb: SupabaseClient, deviceId: string, reason: string) {
  await sb.from("mobile_devices").update({
    revoked_at: new Date().toISOString(),
    last_push_error: reason.slice(0, 300),
    last_push_error_at: new Date().toISOString(),
  } as never).eq("id", deviceId);
}

export async function markDeviceSuccess(sb: SupabaseClient, deviceId: string) {
  await sb.from("mobile_devices").update({
    last_push_success_at: new Date().toISOString(),
    last_push_error: null,
    last_push_error_at: null,
  } as never).eq("id", deviceId);
}

export async function markDeviceError(sb: SupabaseClient, deviceId: string, err: string) {
  await sb.from("mobile_devices").update({
    last_push_error: err.slice(0, 300),
    last_push_error_at: new Date().toISOString(),
  } as never).eq("id", deviceId);
}
