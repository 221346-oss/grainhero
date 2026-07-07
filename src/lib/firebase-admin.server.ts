// Server-only helpers for Firebase Realtime DB access via a service account.
// Signs a JWT with RS256, exchanges it for an OAuth access token, caches it.
import { createSign } from "crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

let cached: { token: string; exp: number } | null = null;

function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
  const sa = JSON.parse(raw) as ServiceAccount;
  // Ensure literal \n become real newlines (some env storages keep them escaped).
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function mintAccessToken(): Promise<{ token: string; exp: number }> {
  const sa = parseServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const signInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signInput);
  signer.end();
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${signInput}.${signature}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { token: json.access_token, exp: now + json.expires_in - 60 };
}

export async function getFirebaseAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now) return cached.token;
  cached = await mintAccessToken();
  return cached.token;
}

export async function fetchFirebaseDevices<T = unknown>(
  path = "devices",
): Promise<Record<string, T>> {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl) throw new Error("FIREBASE_DATABASE_URL not set");
  const token = await getFirebaseAccessToken();
  const url = `${dbUrl.replace(/\/$/, "")}/${path}.json`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Firebase RTDB fetch ${res.status}`);
  return ((await res.json()) as Record<string, T>) ?? {};
}