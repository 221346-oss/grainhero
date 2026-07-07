import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("warehouses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listSilos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("silos")
      .select("*, warehouses(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listGrainBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listSensorDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sensor_devices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listActuators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("actuators")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listGrainAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("buyers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

// Dashboard aggregate counts used by role dashboards
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [warehouses, silos, batches, sensors, actuators, alerts, buyers] = await Promise.all([
      context.supabase.from("warehouses").select("id", { count: "exact", head: true }),
      context.supabase.from("silos").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_batches").select("id, status", { count: "exact" }).limit(1000),
      context.supabase.from("sensor_devices").select("id, status", { count: "exact" }).limit(1000),
      context.supabase.from("actuators").select("id, is_active", { count: "exact" }).limit(1000),
      context.supabase.from("grain_alerts").select("id, status, severity", { count: "exact" }).limit(1000),
      context.supabase.from("buyers").select("id", { count: "exact", head: true }),
    ]);
    const batchesData = batches.data ?? [];
    const alertsData = alerts.data ?? [];
    const sensorsData = sensors.data ?? [];
    const actuatorsData = actuators.data ?? [];
    return {
      warehouses: warehouses.count ?? 0,
      silos: silos.count ?? 0,
      buyers: buyers.count ?? 0,
      batches: {
        total: batches.count ?? 0,
        active: batchesData.filter((b: { status?: string }) => b.status === "active" || b.status === "in_storage").length,
      },
      sensors: {
        total: sensors.count ?? 0,
        online: sensorsData.filter((s: { status?: string }) => s.status === "online" || s.status === "active").length,
      },
      actuators: {
        total: actuators.count ?? 0,
        active: actuatorsData.filter((a: { is_active?: boolean }) => a.is_active).length,
      },
      alerts: {
        total: alerts.count ?? 0,
        open: alertsData.filter((a: { status?: string }) => a.status === "open" || a.status === "active").length,
        critical: alertsData.filter((a: { severity?: string }) => a.severity === "critical" || a.severity === "high").length,
      },
    };
  });