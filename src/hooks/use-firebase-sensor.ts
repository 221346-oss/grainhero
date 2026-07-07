import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { getFirebaseDb, isFirebaseConfigured } from "@/integrations/firebase/client";

export interface LiveReading {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  moisture?: number;
  fan_state?: 0 | 1;
  lid_state?: 0 | 1;
  battery?: number;
  signal?: number;
  ts?: number;
  [k: string]: unknown;
}

/**
 * Subscribe to /devices/{deviceId}/live in Firebase Realtime Database.
 * Returns `null` until data arrives, or when Firebase isn't configured.
 */
export function useFirebaseSensor(deviceId: string | null | undefined) {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!deviceId || !isFirebaseConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;
    const nodeRef = ref(db, `devices/${deviceId}/live`);
    const handler = onValue(
      nodeRef,
      (snap) => {
        const val = snap.val();
        if (val && typeof val === "object") {
          setReading(val as LiveReading);
          setConnected(true);
        }
      },
      () => setConnected(false),
    );
    return () => {
      off(nodeRef, "value", handler);
    };
  }, [deviceId]);

  return { reading, connected, configured: isFirebaseConfigured };
}

/**
 * Subscribe to /devices (all devices' latest live snapshot).
 * Useful for dashboards showing every silo at once.
 */
export function useFirebaseAllSensors() {
  const [readings, setReadings] = useState<Record<string, LiveReading>>({});

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;
    const nodeRef = ref(db, "devices");
    const handler = onValue(nodeRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      const map: Record<string, LiveReading> = {};
      for (const [id, node] of Object.entries(val as Record<string, { live?: LiveReading }>)) {
        if (node?.live) map[id] = node.live;
      }
      setReadings(map);
    });
    return () => {
      off(nodeRef, "value", handler);
    };
  }, []);

  return { readings, configured: isFirebaseConfigured };
}