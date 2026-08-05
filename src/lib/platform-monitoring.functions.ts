/**
 * Super-admin, read-only, cross-tenant monitoring. Deliberately shallow —
 * per-tenant aggregates only, no per-sensor/per-actuator drill-down. That
 * level of detail belongs to each tenant's own /monitoring workspace.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const getPlatformEnvironmentalOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Forbidden");

    const [siloRes, deviceRes] = await Promise.all([
      context.supabase
        .from("silos")
        .select("id, admin_id, status")
        .is("deleted_at", null)
        .limit(2000),
      context.supabase
        .from("sensor_devices")
        .select("id, admin_id, last_heartbeat, expected_heartbeat_interval")
        .is("deleted_at", null)
        .limit(5000),
    ]);
    if (siloRes.error) throw siloRes.error;
    if (deviceRes.error) throw deviceRes.error;

    const silos = (siloRes.data ?? []) as Row[];
    const devices = (deviceRes.data ?? []) as Row[];

    // Same online/offline heuristic as getDeviceHealth (operations2.functions.ts):
    // "online" = heartbeat received within 3x its expected interval.
    const now = Date.now();
    const isOnline = (d: Row) => {
      if (!d.last_heartbeat) return false;
      const gap = now - new Date(d.last_heartbeat).getTime();
      const expected = (d.expected_heartbeat_interval ?? 300) * 1000 * 3;
      return gap <= expected;
    };

    type TenantBucket = { adminId: string; silos: number; online: number; offline: number };
    const byTenant = new Map<string, TenantBucket>();
    const bucket = (adminId: string | null) => {
      const key = adminId ?? "unknown";
      let b = byTenant.get(key);
      if (!b) { b = { adminId: key, silos: 0, online: 0, offline: 0 }; byTenant.set(key, b); }
      return b;
    };

    for (const s of silos) bucket(s.admin_id).silos += 1;
    let onlineTotal = 0;
    let offlineTotal = 0;
    for (const d of devices) {
      const b = bucket(d.admin_id);
      if (isOnline(d)) { b.online += 1; onlineTotal += 1; } else { b.offline += 1; offlineTotal += 1; }
    }

    const ids = Array.from(byTenant.keys()).filter((k) => k !== "unknown");
    let profiles: Array<{ id: string; name: string | null; email: string | null }> = [];
    if (ids.length > 0) {
      const { data } = await context.supabase.from("profiles").select("id, name, email").in("id", ids);
      profiles = data ?? [];
    }
    const nameOf = new Map(profiles.map((p) => [p.id, p.name ?? p.email ?? p.id]));

    const tenants = Array.from(byTenant.values())
      .map((b) => ({
        ...b,
        tenantName: b.adminId === "unknown" ? "Unknown tenant" : (nameOf.get(b.adminId) ?? b.adminId),
      }))
      .sort((a, b) => b.offline - a.offline || b.silos - a.silos)
      .slice(0, 50);

    return {
      totals: { silos: silos.length, devices: devices.length, online: onlineTotal, offline: offlineTotal },
      tenants,
    };
  });
