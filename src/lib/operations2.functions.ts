import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getEffectiveRole } from "./rbac.server";

async function role(supabase: any, userId: string) {
  return getEffectiveRole(supabase, userId);
}
function req(r: string, allowed: string[]) { if (!allowed.includes(r)) throw new Error("Forbidden"); }

// ---------- Maintenance ----------

export const getMaintenanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    req(r, ["super_admin", "admin", "manager", "technician"]);

    const { data: devices } = await context.supabase
      .from("sensor_devices")
      .select("id, device_id, device_name, device_type, status, connection_status, battery_level, last_heartbeat, last_maintenance_date, next_maintenance_date, calibration_due_date, warranty_expiry, silo_id, warehouse_id, manufacturer, model, firmware_version")
      .is("deleted_at", null)
      .order("next_maintenance_date", { ascending: true, nullsFirst: false })
      .limit(500);
    const { data: actuators } = await context.supabase
      .from("actuators")
      .select("id, actuator_id, name, actuator_type, status, last_maintenance_date, next_maintenance_date, silo_id")
      .limit(500);

    const list = (devices ?? []) as any[];
    const now = Date.now();
    const soon = now + 30 * 24 * 3600 * 1000;
    const totals = {
      devices: list.length,
      actuators: (actuators ?? []).length,
      overdue: list.filter((d) => d.next_maintenance_date && new Date(d.next_maintenance_date).getTime() < now).length,
      dueSoon: list.filter((d) => {
        if (!d.next_maintenance_date) return false;
        const t = new Date(d.next_maintenance_date).getTime();
        return t >= now && t <= soon;
      }).length,
      lowBattery: list.filter((d) => d.battery_level != null && d.battery_level < 20).length,
      warrantyExpiring: list.filter((d) => d.warranty_expiry && new Date(d.warranty_expiry).getTime() <= soon).length,
    };
    return { devices: list, actuators: actuators ?? [], totals };
  });

const maintInput = z.object({ id: z.string().uuid(), kind: z.enum(["device", "actuator"]), nextInDays: z.number().int().min(1).max(3650).default(180) });

export const markMaintenanceDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => maintInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    req(r, ["super_admin", "admin", "manager", "technician"]);
    const now = new Date();
    const next = new Date(now.getTime() + data.nextInDays * 24 * 3600 * 1000);
    const table = data.kind === "device" ? "sensor_devices" : "actuators";
    const { error } = await (context.supabase as any)
      .from(table)
      .update({ last_maintenance_date: now.toISOString(), next_maintenance_date: next.toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Server / Device Monitoring ----------

export const getDeviceHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    req(r, ["super_admin", "admin", "manager", "technician"]);

    const { data: devices } = await context.supabase
      .from("sensor_devices")
      .select("id, device_id, device_name, device_type, status, connection_status, battery_level, signal_strength, last_heartbeat, expected_heartbeat_interval, silo_id, warehouse_id, firmware_version")
      .is("deleted_at", null)
      .limit(500);

    const list = (devices ?? []) as any[];
    const now = Date.now();
    const online = list.filter((d) => {
      if (!d.last_heartbeat) return false;
      const gap = now - new Date(d.last_heartbeat).getTime();
      const expected = (d.expected_heartbeat_interval ?? 300) * 1000 * 3;
      return gap <= expected;
    });
    const offline = list.filter((d) => !online.includes(d));

    return {
      devices: list.map((d) => ({
        ...d,
        online: online.includes(d),
        secondsSinceHeartbeat: d.last_heartbeat ? Math.round((now - new Date(d.last_heartbeat).getTime()) / 1000) : null,
      })),
      totals: {
        total: list.length,
        online: online.length,
        offline: offline.length,
        lowBattery: list.filter((d) => d.battery_level != null && d.battery_level < 20).length,
        weakSignal: list.filter((d) => d.signal_strength != null && d.signal_strength < -85).length,
      },
    };
  });

// ---------- Security Center ----------

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    req(r, ["super_admin", "admin"]);

    const [rolesRes, profilesRes, logsRes] = await Promise.all([
      context.supabase.from("user_roles").select("user_id, role").limit(1000),
      context.supabase.from("profiles").select("id, name, email, blocked, last_login_at, admin_id, created_at").limit(1000),
      context.supabase.from("activity_logs")
        .select("id, action, entity_type, entity_id, actor_id, severity, message, metadata, created_at")
        .in("severity", ["warning", "error", "critical"])
        .order("created_at", { ascending: false }).limit(200),
    ]);

    const profiles = (profilesRes.data ?? []) as any[];
    const roles = (rolesRes.data ?? []) as any[];
    const logs = (logsRes.data ?? []) as any[];

    const roleMap = new Map<string, string[]>();
    for (const rr of roles) {
      const arr = roleMap.get(rr.user_id) ?? [];
      arr.push(rr.role);
      roleMap.set(rr.user_id, arr);
    }

    const users = profiles.map((p) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
    }));

    return {
      users,
      logs,
      totals: {
        users: users.length,
        blocked: users.filter((u) => u.blocked).length,
        admins: users.filter((u) => u.roles.includes("admin") || u.roles.includes("super_admin")).length,
        pending: users.filter((u) => u.roles.includes("pending") || u.roles.length === 0).length,
        recentIncidents: logs.length,
      },
    };
  });