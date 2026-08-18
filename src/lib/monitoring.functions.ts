import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getEffectiveRole } from "./rbac.server";

async function role(supabase: any, userId: string) {
  return getEffectiveRole(supabase, userId);
}

function requireAny(r: string, allowed: string[]) {
  if (!allowed.includes(r)) throw new Error("Forbidden");
}

// ---------- Environmental ----------

export const getEnvironmentalOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: readings } = await context.supabase
      .from("sensor_readings")
      .select("silo_id, warehouse_id, device_id, temperature_value, humidity_value, moisture_value, co2_value, voc_value, ambient_temperature, ambient_humidity, dew_point, condensation_risk, anomaly_detected, reading_timestamp")
      .gte("reading_timestamp", since)
      .order("reading_timestamp", { ascending: false })
      .limit(2000);

    const rows = (readings ?? []) as any[];
    const avg = (k: string) => rows.length ? rows.reduce((s, x) => s + Number(x[k] ?? 0), 0) / rows.length : 0;
    const min = (k: string) => rows.length ? Math.min(...rows.map((x) => Number(x[k] ?? Infinity))) : 0;
    const max = (k: string) => rows.length ? Math.max(...rows.map((x) => Number(x[k] ?? -Infinity))) : 0;

    // Latest per silo
    const bySilo = new Map<string, any>();
    for (const r of rows) {
      if (r.silo_id && !bySilo.has(r.silo_id)) bySilo.set(r.silo_id, r);
    }
    const siloIds = Array.from(bySilo.keys());
    let silos: any[] = [];
    if (siloIds.length > 0) {
      const { data } = await context.supabase.from("silos").select("id, name, silo_id, warehouse_id, status").in("id", siloIds);
      silos = data ?? [];
    }
    const siloLatest = silos.map((s: any) => ({ ...s, latest: bySilo.get(s.id) }));

    // Hourly bins for last 24h
    const bins: Record<string, { hour: string; temp: number; hum: number; moist: number; count: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600 * 1000);
      const key = `${d.toISOString().slice(0, 13)}:00`;
      bins[key] = { hour: key, temp: 0, hum: 0, moist: 0, count: 0 };
    }
    for (const r of rows) {
      const key = `${(r.reading_timestamp as string).slice(0, 13)}:00`;
      if (bins[key]) {
        bins[key].temp += Number(r.temperature_value ?? 0);
        bins[key].hum += Number(r.humidity_value ?? 0);
        bins[key].moist += Number(r.moisture_value ?? 0);
        bins[key].count += 1;
      }
    }
    const trend = Object.values(bins).map((b) => ({
      hour: b.hour.slice(11, 16),
      temp: b.count ? b.temp / b.count : 0,
      hum: b.count ? b.hum / b.count : 0,
      moist: b.count ? b.moist / b.count : 0,
    }));

    return {
      samples: rows.length,
      env: {
        temp: { avg: avg("temperature_value"), min: min("temperature_value"), max: max("temperature_value") },
        hum: { avg: avg("humidity_value"), min: min("humidity_value"), max: max("humidity_value") },
        moist: { avg: avg("moisture_value"), min: min("moisture_value"), max: max("moisture_value") },
        co2: { avg: avg("co2_value"), max: max("co2_value") },
        voc: { avg: avg("voc_value"), max: max("voc_value") },
      },
      anomalies: rows.filter((x) => x.anomaly_detected).length,
      condensationRisk: rows.filter((x) => x.condensation_risk).length,
      trend,
      siloLatest,
    };
  });

// ---------- Incidents ----------

export const getIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    // Fetch both system alerts (high/critical priority) AND field incidents
    // (source = field_incident, priority = medium) in one query so the
    // Incidents tab is never empty when there are field incidents reported.
    const { data: alerts } = await context.supabase
      .from("grain_alerts")
      .select("id, alert_id, title, message, priority, status, alert_type, sensor_type, silo_id, batch_id, warehouse_id, triggered_at, acknowledged_at, resolved_at, created_at, created_by, assigned_to, escalation_level, source, recipient_id")
      .or("priority.in.(critical,high),source.eq.field_incident")
      .order("triggered_at", { ascending: false })
      .limit(200);

    const list = (alerts ?? []) as any[];
    if (list.length > 0) {
      // Include recipient_id in name lookup for field incidents
      const ids = Array.from(new Set(
        list.flatMap((x) => [x.created_by, x.assigned_to, x.recipient_id]).filter(Boolean)
      ));
      if (ids.length > 0) {
        const { data: profs } = await context.supabase.from("profiles").select("id, name, email").in("id", ids as string[]);
        const nameOf = new Map((profs ?? []).map((p) => [p.id, p.name ?? p.email ?? p.id]));
        for (const x of list) {
          x.reportedByName = x.created_by   ? (nameOf.get(x.created_by)   ?? null) : null;
          x.assignedToName = x.assigned_to  ? (nameOf.get(x.assigned_to)  ?? null) : null;
          x.recipientName  = x.recipient_id ? (nameOf.get(x.recipient_id) ?? null) : null;
          // Convenience flag so UI can distinguish field incidents from system alerts
          x.isFieldIncident = x.source === "field_incident";
          x.isMine    = x.created_by   === context.userId;
          x.isForMe   = x.recipient_id === context.userId;
        }
      }
    }
    const totals = {
      total: list.length,
      open: list.filter((x) => x.status !== "resolved").length,
      resolved: list.filter((x) => x.status === "resolved").length,
      acknowledged: list.filter((x) => x.acknowledged_at && !x.resolved_at).length,
    };

    // MTTA / MTTR minutes
    const mtta = list.filter((x) => x.acknowledged_at && x.triggered_at);
    const mttr = list.filter((x) => x.resolved_at && x.triggered_at);
    const avgMinutes = (arr: any[], a: string, b: string) =>
      arr.length ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 60000, 0) / arr.length : 0;

    return {
      incidents: list,
      totals,
      mtta: avgMinutes(mtta, "acknowledged_at", "triggered_at"),
      mttr: avgMinutes(mttr, "resolved_at", "triggered_at"),
    };
  });

// ---------- Platform aggregation: incidents by tenant ----------

export type PlatformIncidentsOverview = {
  totals: { total: number; open: number; resolved: number; acknowledged: number };
  mtta: number;
  mttr: number;
  tenants: Array<{
    adminId: string;
    tenantName: string;
    total: number;
    open: number;
    critical: number;
    lastTriggeredAt: string | null;
  }>;
};

export const getPlatformIncidentsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scope?: "all" | "environmental" } | undefined) =>
    z.object({ scope: z.enum(["all", "environmental"]).default("all") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<PlatformIncidentsOverview> => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin"]);

    let q = context.supabase
      .from("grain_alerts")
      .select("id, priority, status, admin_id, batch_id, triggered_at, acknowledged_at, resolved_at")
      .order("triggered_at", { ascending: false })
      .limit(2000);
    // Super-admin's platform view only cares about environment-level status
    // alerts (sensor down, threshold breach) — batch-linked alerts
    // ("seeds spoiled" etc.) are an admin-level concern, not shown here.
    if (data.scope === "environmental") q = q.is("batch_id", null);
    const { data: alerts, error } = await q;
    if (error) throw error;
    const list = (alerts ?? []) as any[];

    // grain_alerts.status is pending|acknowledged|resolved|escalated — "open"
    // means anything not yet resolved. Neither "open" nor "active" is ever a
    // real value, so this previously always counted zero open incidents.
    const totals = {
      total: list.length,
      open: list.filter((x) => x.status !== "resolved").length,
      resolved: list.filter((x) => x.status === "resolved").length,
      acknowledged: list.filter((x) => x.acknowledged_at && !x.resolved_at).length,
    };
    const avgMin = (arr: any[], a: string, b: string) =>
      arr.length ? arr.reduce((s, x) => s + (new Date(x[a]).getTime() - new Date(x[b]).getTime()) / 60000, 0) / arr.length : 0;
    const mtta = avgMin(list.filter((x) => x.acknowledged_at && x.triggered_at), "acknowledged_at", "triggered_at");
    const mttr = avgMin(list.filter((x) => x.resolved_at && x.triggered_at), "resolved_at", "triggered_at");

    // Bucket by tenant.
    const byTenant = new Map<string, { total: number; open: number; critical: number; lastTriggeredAt: string | null }>();
    for (const a of list) {
      const key = a.admin_id ?? "unknown";
      const b = byTenant.get(key) ?? { total: 0, open: 0, critical: 0, lastTriggeredAt: null };
      b.total += 1;
      if (a.status !== "resolved") b.open += 1;
      if (a.priority === "critical") b.critical += 1;
      if (a.triggered_at && (!b.lastTriggeredAt || a.triggered_at > b.lastTriggeredAt)) b.lastTriggeredAt = a.triggered_at;
      byTenant.set(key, b);
    }
    const ids = Array.from(byTenant.keys()).filter((k) => k !== "unknown");
    let profiles: Array<{ id: string; name: string | null; email: string | null }> = [];
    if (ids.length > 0) {
      const { data } = await context.supabase.from("profiles").select("id, name, email").in("id", ids);
      profiles = data ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));

    const tenants = Array.from(byTenant.entries())
      .map(([adminId, b]) => ({
        adminId,
        tenantName: adminId === "unknown" ? "Unknown tenant" : (nameOf.get(adminId) ?? adminId),
        ...b,
      }))
      .sort((a, b) => b.open - a.open || b.critical - a.critical || b.total - a.total)
      .slice(0, 25);

    return { totals, mtta, mttr, tenants };
  });

const ackInput = z.object({ id: z.string().uuid(), resolve: z.boolean().optional() });

export const acknowledgeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ackInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    const patch: any = { acknowledged_at: new Date().toISOString(), acknowledged_by: context.userId, status: "acknowledged" };
    if (data.resolve) {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = context.userId;
      patch.status = "resolved";
    }
    const { error } = await context.supabase.from("grain_alerts").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const reportInput = z.object({
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(1000),
  priority: z.enum(["high", "critical"]).default("high"),
  siloId: z.string().uuid().optional().nullable(),
});

/** Technician-only: report a field incident from their panel. */
export const reportIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["technician"]);

    const { data: profile } = await context.supabase
      .from("profiles").select("admin_id").eq("id", context.userId).maybeSingle();
    const tenantAdminId = (profile as { admin_id?: string | null } | null)?.admin_id ?? context.userId;

    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .insert({
        alert_id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        admin_id: tenantAdminId,
        silo_id: data.siloId ?? null,
        title: data.title,
        message: data.message,
        priority: data.priority,
        source: "manual",
        status: "pending",
        created_by: context.userId,
        triggered_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    // Notify managers when technician reports an incident
    try {
      const { emitToRole } = await import("./notify");
      const notifSeverity = data.priority === "critical" ? "warning" : "info";
      await emitToRole(context.supabase, tenantAdminId, "manager", {
        category: "ops",
        severity: notifSeverity,
        title: `New Incident Reported: ${data.title}`,
        body: `A technician reported a ${data.priority} priority incident: "${data.title}" - ${data.message.slice(0, 100)}`,
        link: "/monitoring",
        entityType: "grain_alert",
        entityId: (row as { id: string }).id,
      });
    } catch (e) {
      console.warn("[reportIncident] Failed to emit notification to managers:", e);
    }

    return { id: (row as { id: string }).id };
  });

const assignInput = z.object({ id: z.string().uuid(), technicianId: z.string().uuid().nullable() });

/** Manager (or admin): assign which technician handles a reported incident. */
export const assignIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assignInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["manager", "admin"]);

    const { error } = await context.supabase
      .from("grain_alerts")
      .update({ assigned_to: data.technicianId, status: data.technicianId ? "acknowledged" : "pending" })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const escalateInput = z.object({ id: z.string().uuid(), reason: z.string().trim().max(500).optional().nullable() });

/**
 * Manager (or admin): manual escalation to Super Admin. Incidents also
 * auto-escalate after 30 minutes unresolved via the
 * /api/public/hooks/alerts-escalation cron — this is the same transition,
 * just triggered on demand instead of waiting.
 */
export const escalateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => escalateInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["manager", "admin"]);

    const { data: current } = await context.supabase
      .from("grain_alerts").select("escalation_level, escalation_history, title, message, priority, admin_id").eq("id", data.id).maybeSingle();
    const c = current as { escalation_level?: number | null; escalation_history?: unknown[] | null; title?: string; message?: string; priority?: string; admin_id?: string | null } | null;
    const history = Array.isArray(c?.escalation_history) ? c.escalation_history : [];
    history.push({ at: new Date().toISOString(), by: context.userId, reason: data.reason ?? null, manual: true });

    const { error } = await context.supabase
      .from("grain_alerts")
      .update({
        status: "escalated",
        escalation_level: Math.min(3, (c?.escalation_level ?? 0) + 1),
        escalation_history: history as never,
      })
      .eq("id", data.id);
    if (error) throw error;

    // Notify admins about escalation
    try {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("name, email")
        .eq("id", context.userId)
        .maybeSingle();

      const managerName = profile?.name || profile?.email || "Manager";
      const tenantAdminId = c?.admin_id ?? context.userId;
      
      const { emitToRole } = await import("./notify");
      await emitToRole(context.supabase, tenantAdminId, "admin", {
        category: "ops",
        severity: "warning",
        title: `Incident Escalated: ${c?.title || "Untitled"}`,
        body: `${managerName} escalated a ${c?.priority || "high"} priority incident${data.reason ? ` - Reason: ${data.reason}` : ""}`,
        link: "/monitoring",
        entityType: "grain_alert",
        entityId: data.id,
      });
    } catch (e) {
      console.warn("[escalateIncident] Failed to emit notification to admins:", e);
    }

    return { ok: true };
  });

// ---------- Monitoring Incident Comments/Discussion ----------

export const listMonitoringIncidentComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ incident_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    // Check if the caller can access this incident
    const { data: incident } = await context.supabase
      .from("grain_alerts")
      .select("created_by, assigned_to, admin_id, source, recipient_id")
      .eq("id", data.incident_id)
      .maybeSingle();

    if (!incident) {
      throw new Error("Incident not found");
    }

    const inc = incident as { 
      created_by: string | null; 
      assigned_to: string | null; 
      admin_id: string | null; 
      source: string | null;
      recipient_id: string | null;
    };

    // Role-based access control for monitoring incidents
    let isParticipant = false;

    if (inc.source === "field_incident") {
      // Field incidents: only reporter and recipient can discuss
      isParticipant = inc.created_by === context.userId || inc.recipient_id === context.userId;
    } else {
      // System incidents: reporter, assignee, and managers/admins can discuss
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("admin_id")
        .eq("id", context.userId)
        .maybeSingle();
      
      const userTenantId = (profile as { admin_id?: string | null } | null)?.admin_id ?? context.userId;
      
      isParticipant = 
        inc.created_by === context.userId ||
        inc.assigned_to === context.userId ||
        inc.admin_id === userTenantId ||
        ["admin", "manager", "super_admin"].includes(r);
    }

    if (!isParticipant) {
      return { comments: [], isParticipant: false };
    }

    // Try to select from grain_alert_comments table
    const { data: comments, error } = await (context.supabase
      .from("grain_alert_comments" as any) as any)
      .select("id, incident_id, user_id, author_name, author_role, message, created_at")
      .eq("incident_id", data.incident_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[listMonitoringIncidentComments] error fetching comments:", error.message);
      return { comments: [], isParticipant: true };
    }

    return {
      isParticipant: true,
      comments: (comments ?? []) as Array<{
        id: string;
        incident_id: string;
        user_id: string;
        author_name: string;
        author_role: string;
        message: string;
        created_at: string;
      }>,
    };
  });

export const addMonitoringIncidentComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    incident_id: z.string().uuid(),
    message: z.string().min(1).max(2000),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager", "technician"]);

    // Check participant access
    const { data: incident } = await context.supabase
      .from("grain_alerts")
      .select("created_by, assigned_to, admin_id, source, recipient_id, status")
      .eq("id", data.incident_id)
      .maybeSingle();

    if (!incident) {
      throw new Error("Incident not found");
    }

    const inc = incident as { 
      created_by: string | null; 
      assigned_to: string | null; 
      admin_id: string | null; 
      source: string | null;
      recipient_id: string | null;
      status: string;
    };

    // Role-based access control
    let isParticipant = false;

    if (inc.source === "field_incident") {
      // Field incidents: only reporter and recipient can discuss
      isParticipant = inc.created_by === context.userId || inc.recipient_id === context.userId;
    } else {
      // System incidents: reporter, assignee, and managers/admins can discuss
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("admin_id")
        .eq("id", context.userId)
        .maybeSingle();
      
      const userTenantId = (profile as { admin_id?: string | null } | null)?.admin_id ?? context.userId;
      
      isParticipant = 
        inc.created_by === context.userId ||
        inc.assigned_to === context.userId ||
        inc.admin_id === userTenantId ||
        ["admin", "manager", "super_admin"].includes(r);
    }

    if (!isParticipant) {
      throw new Error("Not authorised to discuss this incident.");
    }

    if (inc.status === "resolved" || inc.status === "dismissed") {
      throw new Error("Discussion is closed — this incident has been resolved or dismissed.");
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, name, email, admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    const authorName = profile?.name || profile?.email || "User";
    const tenantId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;

    const { error } = await (context.supabase.from("grain_alert_comments" as any) as any).insert({
      incident_id: data.incident_id,
      user_id: context.userId,
      author_name: authorName,
      author_role: r,
      message: data.message.trim(),
    });

    if (error) throw new Error(error.message);

    // Notify participants
    try {
      const { emitNotification } = await import("./notify");
      
      if (inc.source === "field_incident") {
        // Notify the other participant in field incident
        const recipientId = context.userId === inc.created_by ? inc.recipient_id : inc.created_by;
        if (recipientId && recipientId !== context.userId) {
          await emitNotification(context.supabase, {
            recipientId,
            tenantAdminId: tenantId,
            category: "ops",
            severity: "info",
            title: `New Comment on Incident`,
            body: `${authorName} (${r}): "${data.message.trim().slice(0, 100)}"`,
            link: "/monitoring",
            entityType: "grain_alert",
            entityId: data.incident_id,
          });
        }
      } else {
        // For system incidents, notify assignee or reporter
        const recipientId = context.userId === inc.created_by ? inc.assigned_to : inc.created_by;
        if (recipientId && recipientId !== context.userId) {
          await emitNotification(context.supabase, {
            recipientId,
            tenantAdminId: tenantId,
            category: "ops",
            severity: "info",
            title: `New Comment on System Incident`,
            body: `${authorName} (${r}): "${data.message.trim().slice(0, 100)}"`,
            link: "/monitoring",
            entityType: "grain_alert",
            entityId: data.incident_id,
          });
        }
      }
    } catch (e) {
      console.warn("[addMonitoringIncidentComment] Failed to emit notification:", e);
    }

    return { ok: true };
  });

// ---------- Reports ----------

export const getReportsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["super_admin", "admin", "manager"]);

    const [batches, alerts, invoices, silos] = await Promise.all([
      context.supabase.from("grain_batches")
        .select("id, batch_id, grain_type, status, quantity_kg, revenue, profit, purchase_price_per_kg, sell_price_per_kg, spoilage_label, risk_score, intake_date, created_at")
        .is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("grain_alerts")
        .select("id, priority, status, alert_type, created_at, resolved_at")
        .order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("buyer_invoices")
        .select("id, invoice_number, buyer_name, total_amount, amount_paid, payment_status, currency, created_at")
        .order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("silos").select("id, name, capacity_kg, current_occupancy_kg, status").limit(500),
    ]);

    return {
      batches: batches.data ?? [],
      alerts: alerts.data ?? [],
      invoices: invoices.data ?? [],
      silos: silos.data ?? [],
    };
  });

// ---------- Resolve/Dismiss Incidents ----------

const updateIncidentStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["resolved", "dismissed"]),
});

/** Manager: mark an incident as resolved or dismissed */
export const updateIncidentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateIncidentStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    requireAny(r, ["manager", "admin", "super_admin"]);

    const patch: any = {
      status: data.status,
      resolved_at: new Date().toISOString(),
      resolved_by: context.userId,
    };

    const { error } = await context.supabase
      .from("grain_alerts")
      .update(patch)
      .eq("id", data.id);

    if (error) throw error;

    // Optional: Clear discussion history when incident is closed
    // Uncomment if you want to clear comments when resolved/dismissed
    /*
    try {
      await (context.supabase
        .from("grain_alert_comments" as any) as any)
        .delete()
        .eq("incident_id", data.id);
    } catch (e) {
      console.warn("[updateIncidentStatus] Failed to clear discussion comments:", e);
    }
    */

    return { ok: true };
  });
