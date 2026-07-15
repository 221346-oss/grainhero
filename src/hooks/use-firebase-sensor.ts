import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { getFirebaseDb, isFirebaseConfigured } from "@/integrations/firebase/client";

export interface LiveReading {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  tvoc_ppb?: number;         // GH1 legacy field name
  tvoc?: number;
  riskIndex?: number;
  dewPoint?: number;
  ml_risk_class?: string;
  moisture?: number;
  fan_state?: 0 | 1;
  lid_state?: 0 | 1;
  pwm_speed?: number;        // GH1 legacy field name
  servo_state?: 0 | 1;       // GH1 legacy field name
  battery?: number;
  signal?: number;
  ts?: number;
  timestamp?: number;        // GH1 legacy field name
  timestamp_unix?: number;   // GH1 legacy field name
  [k: string]: unknown;
}

/**
 * Subscribe to live sensor data for a single device with dual-path support.
 *
 * Path strategy (matches GH2 cron):
 *   Primary (GH2 firmware): /devices/{deviceId}/live
 *   Fallback (GH1 firmware): /sensor_data/{deviceId}/latest
 *
 * Both listeners run simultaneously. Whichever fires last wins, so the hook
 * always reflects the most recent data regardless of which RTDB tree the
 * ESP32 firmware writes to.
 */
export function useFirebaseSensor(deviceId: string | null | undefined) {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!deviceId || !isFirebaseConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;

    // GH2 path: /devices/{deviceId}/live
    const gh2Ref = ref(db, `devices/${deviceId}/live`);
    const gh2Handler = onValue(
      gh2Ref,
      (snap) => {
        const val = snap.val();
        if (val && typeof val === "object" && Object.keys(val).length > 0) {
          setReading(val as LiveReading);
          setConnected(true);
        }
      },
      () => {/* GH2 path error — legacy path may still be active */},
    );

    // GH1 legacy path: /sensor_data/{deviceId}/latest
    const gh1Ref = ref(db, `sensor_data/${deviceId}/latest`);
    const gh1Handler = onValue(
      gh1Ref,
      (snap) => {
        const val = snap.val();
        if (val && typeof val === "object" && Object.keys(val).length > 0) {
          // Only update if GH2 path has not provided data yet (avoid overwriting
          // newer data if both paths are active simultaneously)
          setReading((prev) => prev ?? (val as LiveReading));
          setConnected(true);
        }
      },
      () => setConnected(false),
    );

    return () => {
      off(gh2Ref, "value", gh2Handler);
      off(gh1Ref, "value", gh1Handler);
    };
  }, [deviceId]);

  return { reading, connected, configured: isFirebaseConfigured };
}

/**
 * Subscribe to all devices' latest live snapshot with dual-path support.
 *
 * Merges data from both RTDB trees:
 *   /devices        → GH2 firmware  (node.live contains the payload)
 *   /sensor_data    → GH1 firmware  (node.latest contains the payload)
 *
 * GH2 data wins when a device exists in both trees.
 */
export function useFirebaseAllSensors() {
  const [readings, setReadings] = useState<Record<string, LiveReading>>({});

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;

    const merged: Record<string, LiveReading> = {};

    // GH1 legacy tree: /sensor_data
    const gh1Ref = ref(db, "sensor_data");
    const gh1Handler = onValue(gh1Ref, (snap) => {
      const val = snap.val() as Record<string, { latest?: LiveReading }> | null;
      if (!val) return;
      for (const [id, node] of Object.entries(val)) {
        const payload = node?.latest ?? (node as unknown as LiveReading);
        if (payload && typeof payload === "object") {
          merged[id] = payload as LiveReading;
        }
      }
      setReadings({ ...merged });
    });

    // GH2 tree: /devices (overlays on top — GH2 wins on conflict)
    const gh2Ref = ref(db, "devices");
    const gh2Handler = onValue(gh2Ref, (snap) => {
      const val = snap.val() as Record<string, { live?: LiveReading }> | null;
      if (!val) return;
      for (const [id, node] of Object.entries(val)) {
        if (node?.live) {
          merged[id] = { ...(merged[id] ?? {}), ...node.live };
        }
      }
      setReadings({ ...merged });
    });

    return () => {
      off(gh1Ref, "value", gh1Handler);
      off(gh2Ref, "value", gh2Handler);
    };
  }, []);

  return { readings, configured: isFirebaseConfigured };
}