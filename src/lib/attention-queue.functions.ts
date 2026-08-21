/**
 * Phase 10 — Attention queue: rank silos by risk for the technician triage view.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Row = Record<string, any>;

const SEVERITY_WEIGHT: Record<string, number> = { critical: 100, warning: 30, info: 5 };

export const getAttentionQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [silosRes, alertsRes, hbRes, failedCmdRes] = await Promise.all([
      sb.from("silos").select("id, name, warehouse_id, capacity_kg, current_occupancy_kg"),
      sb
        .from("grain_alerts")
        .select("id, silo_id, severity, alert_type, message, created_at")
        .is("resolved_at", null)
        .gte("created_at", since24h),
      sb.from("device_heartbeats").select("device_id, status, last_seen_at"),
      sb
        .from("actuator_commands")
        .select("id, actuator_id, status, created_at")
        .eq("status", "failed")
        .gte("created_at", since24h),
    ]);

    const silos = (silosRes.data ?? []) as Row[];
    const alerts = (alertsRes.data ?? []) as Row[];
    const heartbeats = (hbRes.data ?? []) as Row[];
    const failed = (failedCmdRes.data ?? []) as Row[];

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
