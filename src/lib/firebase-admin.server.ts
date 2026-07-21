export async function getFirebaseAccessToken(): Promise<string> {
  const secret = process.env.FIREBASE_SECRET_KEY;
  if (!secret) throw new Error("FIREBASE_SECRET_KEY not set");
  return secret;
}

export async function fetchFirebaseDevices<T = unknown>(
  path = "devices",
): Promise<Record<string, T>> {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl) throw new Error("FIREBASE_DATABASE_URL not set");
  const token = await getFirebaseAccessToken();
  const url = `${dbUrl.replace(/\/$/, "")}/${path}.json?auth=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firebase RTDB fetch ${res.status}`);
  return ((await res.json()) as Record<string, T>) ?? {};
}

// ─── fetchFirebaseNode ────────────────────────────────────────────────────────
// Read an arbitrary RTDB path and return its value (or null if absent).
export async function fetchFirebaseNode<T = unknown>(path: string): Promise<T | null> {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl) throw new Error("FIREBASE_DATABASE_URL not set");
  const token = await getFirebaseAccessToken();
  const url = `${dbUrl.replace(/\/$/, "")}/${path}.json?auth=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firebase RTDB fetch ${path}: ${res.status}`);
  const json = await res.json();
  return (json as T) ?? null;
}

// ─── fetchLivePayload ─────────────────────────────────────────────────────────
// Read the live sensor payload for a single device with automatic path fallback.
//
// GH2 expected path:  /devices/{deviceId}/live
// GH1 legacy path:    /sensor_data/{deviceId}/latest
//
// Strategy: try the GH2 path first. If it is null/empty, fall back to the GH1
// legacy path. This preserves full backward compatibility with deployed ESP32
// firmware that still writes to /sensor_data/{id}/latest without requiring any
// firmware update.
export async function fetchLivePayload(
  deviceId: string,
): Promise<Record<string, unknown> | null> {
  // Try GH2 path: /devices/{deviceId}/live
  try {
    const primary = await fetchFirebaseNode<Record<string, unknown>>(
      `devices/${deviceId}/live`,
    );
    if (primary && typeof primary === "object" && Object.keys(primary).length > 0) {
      return primary;
    }
  } catch {
    // primary path failed — fall through to legacy
  }

  // Fall back to GH1 legacy path: /sensor_data/{deviceId}/latest
  try {
    const legacy = await fetchFirebaseNode<Record<string, unknown>>(
      `sensor_data/${deviceId}/latest`,
    );
    if (legacy && typeof legacy === "object" && Object.keys(legacy).length > 0) {
      return legacy;
    }
  } catch {
    // both paths failed
  }

  return null;
}

// ─── fetchAllDevicePayloads ───────────────────────────────────────────────────
// Read live payloads for all known devices, merging both RTDB tree structures.
//
// GH2 tree:  /devices/{id}/live   → { temperature, humidity, … }
// GH1 tree:  /sensor_data/{id}/latest → { temperature, humidity, … }
//
// Returns a map keyed by device_id with a unified live payload.
// Devices present in both trees are merged (GH2 path wins on conflicts).
export async function fetchAllDevicePayloads(): Promise<
  Record<string, Record<string, unknown>>
> {
  const result: Record<string, Record<string, unknown>> = {};

  // 1. Read GH1 legacy tree: /sensor_data
  try {
    const legacy = await fetchFirebaseDevices<{ latest?: Record<string, unknown> }>(
      "sensor_data",
    );
    for (const [deviceId, node] of Object.entries(legacy)) {
      const payload = node?.latest ?? (node as Record<string, unknown>);
      if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
        result[deviceId] = payload as Record<string, unknown>;
      }
    }
  } catch {
    // legacy tree absent or inaccessible — proceed
  }

  // 2. Read GH2 tree: /devices — overlays on top of legacy (GH2 wins)
  try {
    const modern = await fetchFirebaseDevices<{ live?: Record<string, unknown> }>(
      "devices",
    );
    for (const [deviceId, node] of Object.entries(modern)) {
      const payload = node?.live;
      if (payload && typeof payload === "object" && Object.keys(payload).length > 0) {
        // GH2 data wins: merge over whatever legacy provided
        result[deviceId] = { ...(result[deviceId] ?? {}), ...payload };
      }
    }
  } catch {
    // GH2 tree absent — legacy-only result still valid
  }

  return result;
}