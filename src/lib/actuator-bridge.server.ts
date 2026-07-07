// Server-only helper to publish actuator commands to Firebase RTDB.
// Path: /devices/{actuator_id}/commands/{cmdId}
import { getFirebaseAccessToken } from "./firebase-admin.server";

export interface DeviceCommand {
  action: string;
  value?: number | null;
  by: string;
  at: string;
  ack?: boolean;
}

export async function publishActuatorCommand(
  actuatorCode: string,
  cmd: DeviceCommand,
): Promise<{ ok: boolean; path: string; skipped?: boolean }> {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl) return { ok: false, path: "", skipped: true };
  try {
    const token = await getFirebaseAccessToken();
    const cmdId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `devices/${encodeURIComponent(actuatorCode)}/commands/${cmdId}.json`;
    const url = `${dbUrl.replace(/\/$/, "")}/${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...cmd, ack: false }),
    });
    if (!res.ok) throw new Error(`Firebase RTDB PUT ${res.status}`);
    return { ok: true, path };
  } catch (e) {
    console.error("publishActuatorCommand failed", e);
    return { ok: false, path: "", skipped: true };
  }
}