/**
 * Phase 9 — Sensor telemetry ingest + threshold evaluation.
 *
 * Two entry points:
 *   ingestReading:    authenticated (manual entry / technician)
 *   listRecentReadings/getSiloReadings: read helpers used by charts
 *
 * The public HTTP bridge lives at src/routes/api/public/telemetry.ts and
 * calls handleBridgeIngest() below with an HMAC-verified payload.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const METRIC_COLS: Record<string, string> = {
  temperature: "temperature_value",
  humidity: "humidity_value",
  moisture: "moisture_value",
  co2: "co2_value",
};

const READING_SCHEMA = z.object({
  sensorDeviceId: z.string().uuid(),
  metric: z.enum(["temperature", "humidity", "moisture", "co2"]),
  value: z.number().finite(),
  source: z.enum(["manual", "mqtt", "http", "firebase"]).default("manual"),
  raw: z.record(z.string(), z.unknown()).optional(),
  recordedAt: z.string().datetime().optional(),
});

export const ingestReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => READING_SCHEMA.parse(d))
  .handler(async ({ data, context }) => {
    const { data: dev, error } = await context.supabase
      .from("sensor_devices")
      .select("id, admin_id, silo_id")
      .eq("id", data.sensorDeviceId)
      .maybeSingle();
    if (error || !dev) throw new Error("Sensor not found");
    const d = dev as Row;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await writeReadingAndEvaluate(supabaseAdmin, {
      adminId: d.admin_id as string,
      siloId: d.silo_id as string,
      sensorDeviceId: d.id as string,
      metric: data.metric,
      value: data.value,
      source: data.source,
      raw: data.raw,
      recordedAt: data.recordedAt,
    });
    return { ok: true };
  });

/**
 * Shared logic used by the auth server-fn AND the public HTTP bridge.
 * Writes the reading, applies quality flag, evaluates the matching threshold
 * (with hysteresis) and emits a `grain_alert` + notification if breached.
 */
export async function writeReadingAndEvaluate(
  sb: SB,
  input: {
    adminId: string;
    siloId: string;
    sensorDeviceId: string;
    metric: keyof typeof METRIC_COLS;
    value: number;
    source: string;
    raw?: Record<string, unknown>;
    recordedAt?: string;
  },
): Promise<{ alertId?: string }> {
  const col = METRIC_COLS[input.metric];
  const rowPayload: Row = {
    admin_id: input.adminId,
    silo_id: input.siloId,
    device_id: input.sensorDeviceId,
    [col]: input.value,
    source: input.source,
    raw_payload: input.raw ?? null,
    quality_flag: Number.isFinite(input.value) ? "ok" : "out_of_range",
    reading_timestamp: input.recordedAt ?? new Date().toISOString(),
    ingested_at: new Date().toISOString(),
  };
  await sb.from("sensor_readings").insert(rowPayload as never);

  // Heartbeat refresh
  await sb.from("device_heartbeats").upsert({
    device_id: input.sensorDeviceId,
    admin_id: input.adminId,
    last_seen_at: new Date().toISOString(),
    status: "online",
  } as never);

  // Phase 10 — Automation rule evaluation (independent of threshold breach).
  try {
    const { evaluateAutomationForReading } = await import("@/lib/automation-rules.functions");
    await evaluateAutomationForReading(sb, {
      adminId: input.adminId,
      siloId: input.siloId,
      metric: input.metric,
      value: input.value,
    });
  } catch (_e) { /* automation must never block ingest */ }

  // Threshold evaluation
  const { data: th } = await sb
    .from("sensor_thresholds")
    .select("*")
    .eq("silo_id", input.siloId)
    .eq("metric", input.metric)
    .eq("enabled", true)
    .maybeSingle();
  if (!th) return {};
  const t = th as Row;
  const v = input.value;
  const hyst = Number(t.hysteresis ?? 0);

  let severity: "info" | "warning" | "critical" | null = null;
  if (t.critical_max != null && v >= Number(t.critical_max)) severity = "critical";
  else if (t.critical_min != null && v <= Number(t.critical_min)) severity = "critical";
  else if (t.max_value != null && v >= Number(t.max_value) + hyst) severity = "warning";
  else if (t.min_value != null && v <= Number(t.min_value) - hyst) severity = "warning";
  if (!severity) return {};

  // Dedupe: skip if an unresolved alert for same silo/metric exists in window
  const windowSec = Number(t.window_seconds ?? 300);
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { data: dup } = await sb
    .from("grain_alerts")
    .select("id")
    .eq("silo_id", input.siloId)
    .eq("alert_type", input.metric)
    .is("resolved_at", null)
    .gte("created_at", since)
    .limit(1);
  if (dup && dup.length) return { alertId: (dup[0] as Row).id as string };

  const { data: alert } = await sb
    .from("grain_alerts")
    .insert({
      admin_id: input.adminId,
      silo_id: input.siloId,
      alert_type: input.metric,
      severity,
      message: `${input.metric} ${severity}: ${v}`,
      value: v,
      threshold: severity === "critical" ? (t.critical_max ?? t.critical_min) : (t.max_value ?? t.min_value),
    } as never)
    .select("id")
    .single();

  const { emitNotification } = await import("@/lib/notify");
  await emitNotification(sb, {
    recipientId: input.adminId,
    tenantAdminId: input.adminId,
    category: "ops",
    severity,
    title: `Silo alert: ${input.metric} ${severity}`,
    body: `Reading ${v} breached threshold on silo.`,
    link: `/grain-alerts`,
    entityType: "grain_alert",
    entityId: (alert as Row | null)?.id as string | undefined,
  });
  return { alertId: (alert as Row | null)?.id as string | undefined };
}

/* ---------------- Thresholds CRUD ---------------- */

export const listThresholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ siloId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("sensor_thresholds").select("*").order("created_at", { ascending: false });
    if (data.siloId) q = q.eq("silo_id", data.siloId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { thresholds: (rows ?? []) as Row[] };
  });

const THRESHOLD_INPUT = z.object({
  id: z.string().uuid().optional(),
  siloId: z.string().uuid(),
  metric: z.enum(["temperature", "humidity", "moisture", "co2"]),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  criticalMin: z.number().nullable().optional(),
  criticalMax: z.number().nullable().optional(),
  hysteresis: z.number().min(0).max(1000).default(0),
  windowSeconds: z.number().int().min(30).max(86400).default(300),
  enabled: z.boolean().default(true),
});

export const saveThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => THRESHOLD_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { assertPlanAllows } = await import("@/lib/plan-gate");
    const { data: silo } = await context.supabase.from("silos").select("admin_id").eq("id", data.siloId).single();
    const adminId = (silo as Row | null)?.admin_id as string | undefined;
    if (!adminId) throw new Error("Silo not found");

    if (!data.id) {
      const { count } = await context.supabase
        .from("sensor_thresholds")
        .select("id", { count: "exact", head: true })
        .eq("enabled", true);
      await assertPlanAllows({ feature: "max_active_alert_rules", sb: context.supabase, userId: context.userId, currentUsage: count ?? 0 });
    }

    const patch = {
      admin_id: adminId,
      silo_id: data.siloId,
      metric: data.metric,
      min_value: data.minValue ?? null,
      max_value: data.maxValue ?? null,
      critical_min: data.criticalMin ?? null,
      critical_max: data.criticalMax ?? null,
      hysteresis: data.hysteresis,
      window_seconds: data.windowSeconds,
      enabled: data.enabled,
      created_by: context.userId,
    };
    const q = data.id
      ? context.supabase.from("sensor_thresholds").update(patch as never).eq("id", data.id).select("id").single()
      : context.supabase.from("sensor_thresholds").upsert(patch as never, { onConflict: "silo_id,metric" }).select("id").single();
    const { data: saved, error } = await q;
    if (error) throw error;

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId, tenantAdminId: adminId,
      action: data.id ? "threshold.updated" : "threshold.created",
      targetType: "sensor_threshold", targetId: (saved as Row).id as string,
      meta: { metric: data.metric, siloId: data.siloId },
    });
    return { id: (saved as Row).id as string };
  });

export const deleteThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sensor_thresholds").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Reading queries ---------------- */

export const getSiloReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ siloId: z.string().uuid(), hours: z.number().int().min(1).max(720).default(24) }).parse(d))
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - data.hours * 3600 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("sensor_readings")
      .select("reading_timestamp, temperature_value, humidity_value, moisture_value, co2_value, quality_flag, source")
      .eq("silo_id", data.siloId)
      .gte("reading_timestamp", since)
      .order("reading_timestamp", { ascending: true })
      .limit(2000);
    if (error) throw error;
    return { readings: (rows ?? []) as unknown as Row[] };
  });
