/**
 * Phase 10 — Attention queue: rank silos by risk for the technician triage view.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { resolveLocationScope, byWarehouse, type LocationScope } from "./page-scope.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const SEVERITY_WEIGHT: Record<string, number> = { critical: 100, warning: 30, info: 5 };

/**
 * Ids of the rows of a silo-keyed table that fall inside the active location.
 * `null` means no location is active and the caller should not filter at all —
 * an empty array means the location genuinely has none.
 */
async function idsForSilos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  table: "sensor_devices" | "actuators",
  scope: LocationScope,
): Promise<string[] | null> {
  if (!scope.siloIds) return null;
  if (scope.siloIds.length === 0) return [];
  const { data } = await sb.from(table).select("id").in("silo_id", scope.siloIds).limit(5000);
  return ((data ?? []) as Row[]).map((r) => r.id as string);
}

export const getAttentionQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ loc: z.string().trim().min(1).optional(), wh: z.string().uuid().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data: input }) => {
    const sb = context.supabase;
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
    const scope = await resolveLocationScope(sb, context.userId, input?.loc, input?.wh);

    // Neither device_heartbeats nor actuator_commands carries a warehouse: they
    // hang off sensor_devices and actuators, which key on silo_id. Under a
    // location the ids are resolved first so the two counters below describe
    // the selected warehouse rather than the whole tenant.
    const [deviceIds, actuatorIds] = await Promise.all([
      idsForSilos(sb, "sensor_devices", scope),
      idsForSilos(sb, "actuators", scope),
    ]);

    const [silosRes, alertsRes, hbRes, failedCmdRes] = await Promise.all([
      byWarehouse(
        sb.from("silos").select("id, name, warehouse_id, capacity_kg, current_occupancy_kg"),
        scope,
      ),
      byWarehouse(
        sb.from("grain_alerts").select("id, silo_id, severity, alert_type, message, created_at"),
        scope,
      )
        .is("resolved_at", null)
        .gte("created_at", since24h),
      deviceIds === null
        ? sb.from("device_heartbeats").select("device_id, status, last_seen_at")
        : deviceIds.length === 0
          ? null
          : sb
              .from("device_heartbeats")
              .select("device_id, status, last_seen_at")
              .in("device_id", deviceIds),
      (() => {
        if (actuatorIds !== null && actuatorIds.length === 0) return null;
        const q = sb
          .from("actuator_commands")
          .select("id, actuator_id, status, created_at")
          .eq("status", "failed")
          .gte("created_at", since24h);
        return actuatorIds === null ? q : q.in("actuator_id", actuatorIds);
      })(),
    ]);

    const silos = (silosRes.data ?? []) as Row[];
    const alerts = (alertsRes.data ?? []) as Row[];
    const heartbeats = (hbRes?.data ?? []) as Row[];
    const failed = (failedCmdRes?.data ?? []) as Row[];

    // Map alerts by silo
    const alertsBySilo = new Map<string, Row[]>();
    for (const a of alerts) {
      const k = a.silo_id as string;
      if (!k) continue;
      (alertsBySilo.get(k) ?? alertsBySilo.set(k, []).get(k)!).push(a);
    }

    // Offline devices (no heartbeat in 15 min)
    const offlineCutoff = Date.now() - 15 * 60_000;
    const offlineDevices = heartbeats.filter((h) => {
      const t = new Date(h.last_seen_at as string).getTime();
      return h.status !== "online" || t < offlineCutoff;
    });

    const rows = silos
      .map((s) => {
        const siloAlerts = alertsBySilo.get(s.id as string) ?? [];
        const alertScore = siloAlerts.reduce(
          (sum, a) => sum + (SEVERITY_WEIGHT[a.severity as string] ?? 0),
          0,
        );
        const occ = Number(s.current_occupancy_kg ?? 0);
        const cap = Number(s.capacity_kg ?? 0);
        const fillPct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
        const fillPenalty = fillPct >= 95 ? 20 : fillPct >= 85 ? 8 : 0;
        const score = alertScore + fillPenalty;
        return {
          siloId: s.id,
          siloName: s.name,
          warehouseId: s.warehouse_id,
          score,
          fillPct,
          alerts: siloAlerts.length,
          critical: siloAlerts.filter((a) => a.severity === "critical").length,
          topAlert: siloAlerts[0] ?? null,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return {
      rows,
      offlineDeviceCount: offlineDevices.length,
      failedCommandCount: failed.length,
    };
  });
