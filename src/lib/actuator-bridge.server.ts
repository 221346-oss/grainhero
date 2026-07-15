// Server-only helper to publish actuator commands to Firebase RTDB.
// Path: /control/{actuator_id}
import { getFirebaseAccessToken } from "./firebase-admin.server";

// ─── writeFirebaseControl ────────────────────────────────────────────────────
// Direct-state write to /control/{deviceId} using GH1's flat field names.
// Used by the Firebase sync cron for ML-driven auto-actuation.
// Mirrors GH1 firebaseRealtimeService.writeControlState() exactly.
export interface ControlState {
  human_requested_fan?: boolean;
  ml_requested_fan?: boolean;
  target_fan_speed?: number;
  ml_decision?: string;
  led2?: boolean;
  led3?: boolean;
  led4?: boolean;
  alarm?: boolean;
  servo?: boolean;
}

export async function writeFirebaseControl(
  deviceId: string,
  state: ControlState,
): Promise<void> {
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl) return;

  const token = await getFirebaseAccessToken();
  const url = `${dbUrl.replace(/\/$/, "")}/control/${encodeURIComponent(deviceId)}.json`;

  // Build the update object with dual field names (snake_case + camelCase)
  // so both old and new ESP32 firmware revisions can read the commands.
  const updates: Record<string, unknown> = {
    lastControlUpdate: { ".sv": "timestamp" },
  };

  if (state.human_requested_fan !== undefined) {
    updates.human_requested_fan = !!state.human_requested_fan; // snake_case for new firmware
    updates.humanRequestedFan   = !!state.human_requested_fan; // camelCase for old firmware
    // Servo (lid) follows fan intent — matches GH1 behaviour
    updates.servo = !!state.human_requested_fan;
  }
  if (state.ml_requested_fan !== undefined) {
    updates.ml_requested_fan = !!state.ml_requested_fan;
    updates.mlRequestedFan   = !!state.ml_requested_fan;
  }
  if (state.target_fan_speed !== undefined) {
    updates.target_fan_speed = state.target_fan_speed ?? 0;
    updates.targetFanSpeed   = state.target_fan_speed ?? 0;
    updates.pwm              = state.target_fan_speed ?? 0; // backward compat for old firmware
  }
  if (state.ml_decision !== undefined) {
    updates.ml_decision = state.ml_decision ?? "idle";
    updates.mlDecision  = state.ml_decision ?? "idle";
  }
  if (state.led2 !== undefined) updates.led2 = !!state.led2;
  if (state.led3 !== undefined) updates.led3 = !!state.led3;
  if (state.led4 !== undefined) updates.led4 = !!state.led4;
  if (state.alarm !== undefined) updates.alarm = !!state.alarm;
  if (state.servo !== undefined) updates.servo = !!state.servo;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firebase RTDB PATCH /control/${deviceId}: ${res.status} ${text}`);
  }
}

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

  const token = await getFirebaseAccessToken();
  const path = `control/${encodeURIComponent(actuatorCode)}.json`;
  const url = `${dbUrl.replace(/\/$/, "")}/${path}`;

  // Map GH2 action to GH1 flat state structure
  const updates: Record<string, any> = {
    lastControlUpdate: { ".sv": "timestamp" }
  };

  switch (cmd.action) {
    case "turn_on":
    case "manual":
      updates.human_requested_fan = true;
      updates.humanRequestedFan = true;
      updates.servo = true;
      if (cmd.value !== undefined && cmd.value !== null) {
        updates.target_fan_speed = cmd.value;
        updates.targetFanSpeed = cmd.value;
        updates.pwm = cmd.value;
      }
      break;
    case "turn_off":
    case "auto":
      updates.human_requested_fan = false;
      updates.humanRequestedFan = false;
      updates.servo = false;
      if (cmd.action === "turn_off") {
        updates.target_fan_speed = 0;
        updates.targetFanSpeed = 0;
        updates.pwm = 0;
      }
      break;
    case "set_value":
      if (cmd.value !== undefined && cmd.value !== null) {
        updates.target_fan_speed = cmd.value;
        updates.targetFanSpeed = cmd.value;
        updates.pwm = cmd.value;
      }
      break;
    case "emergency_stop":
      updates.human_requested_fan = false;
      updates.humanRequestedFan = false;
      updates.servo = false;
      updates.target_fan_speed = 0;
      updates.targetFanSpeed = 0;
      updates.pwm = 0;
      break;
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firebase RTDB PATCH ${res.status}: ${text}`);
  }
  
  return { ok: true, path };
}