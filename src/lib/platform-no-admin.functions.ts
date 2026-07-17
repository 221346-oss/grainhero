import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// These functions work WITHOUT service role key by using the authenticated user's context
// They rely on RLS policies and the has_role RPC function

export const getPlatformMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    // Use regular authenticated client - will respect RLS
    const [profiles, roles, batches, silos, alerts, subs, logs] = await Promise.all([
      context.supabase.from("profiles").select("id, admin_id, created_at, business_type, blocked", { count: "exact" }),
      context.supabase.from("user_roles").select("role, user_id"),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase.from("silos").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_alerts").select("id, priority", { count: "exact" }),
      context.supabase.from("subscriptions").select("id, status, plan_name, price_per_month"),
      context.supabase.from("activity_logs").select("id, severity", { count: "exact" }),
    ]);

    const tenants = new Set((profiles.data ?? []).filter((p: any) => !p.admin_id).map((p: any) => p.id));
    const criticalAlerts = (alerts.data ?? []).filter((a: any) => a.priority === "critical").length;
    const activeSubs = (subs.data ?? []).filter((s: any) => s.status === "active");
    const mrr = activeSubs.reduce((s: number, x: any) => s + (Number(x.price_per_month) || 0), 0);
    const roleDist: Record<string, number> = {};
    for (const r of roles.data ?? []) roleDist[r.role] = (roleDist[r.role] ?? 0) + 1;

    return {
      totalUsers: profiles.count ?? 0,
      totalTenants: tenants.size,
      totalBatches: batches.count ?? 0,
      totalSilos: silos.count ?? 0,
      totalAlerts: alerts.count ?? 0,
      criticalAlerts,
      totalLogs: logs.count ?? 0,
      activeSubscriptions: activeSubs.length,
      mrr,
      roleDistribution: roleDist,
      blockedUsers: (profiles.data ?? []).filter((p: any) => p.blocked).length,
    };
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, name, email, admin_id, business_type, blocked, email_verified, created_at, last_login")
      .order("created_at", { ascending: false })
      .limit(500);
    
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    
    const order = ["super_admin", "admin", "manager", "technician", "pending"];
    const rmap = new Map<string, string>();
    for (const r of roles ?? []) {
      const cur = rmap.get(r.user_id);
      if (!cur || order.indexOf(r.role) < order.indexOf(cur)) rmap.set(r.user_id, r.role);
    }
    return (profiles ?? []).map((p: any) => ({ ...p, role: rmap.get(p.id) ?? "pending" }));
  });

export const listAllTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const { data: admins } = await context.supabase
      .from("profiles")
      .select("id, name, email, business_type, created_at, blocked, subscription_plan")
      .is("admin_id", null)
      .order("created_at", { ascending: false })
      .limit(500);

    // counts per tenant
    const ids = (admins ?? []).map((a: any) => a.id);
    const [{ data: teamCounts }, { data: batchCounts }] = await Promise.all([
      context.supabase.from("profiles").select("admin_id").in("admin_id", ids),
      context.supabase.from("grain_batches").select("admin_id").in("admin_id", ids),
    ]);
    
    const teamMap = new Map<string, number>();
    for (const r of teamCounts ?? []) { if (r.admin_id) teamMap.set(r.admin_id, (teamMap.get(r.admin_id) ?? 0) + 1); }
    const batchMap = new Map<string, number>();
    for (const r of batchCounts ?? []) { if (r.admin_id) batchMap.set(r.admin_id, (batchMap.get(r.admin_id) ?? 0) + 1); }
    
    return (admins ?? []).map((a: any) => ({
      ...a,
      team_size: (teamMap.get(a.id) ?? 0) + 1,
      batch_count: batchMap.get(a.id) ?? 0,
    }));
  });

export const toggleUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; blocked: boolean }) => d)
  .handler(async ({ data, context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
    if (data.id === context.userId) throw new Error("Cannot block yourself");
    
    const { error } = await context.supabase.from("profiles").update({ blocked: data.blocked }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getPlatformLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; severity?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    let q = context.supabase.from("activity_logs")
      .select("id, admin_id, user_id, user_name, user_role, action, category, entity_type, entity_ref, description, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getPlatformOverviewWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const [signupsRes, alertsRes, seriesRes, subsRes, pipelineRes, ordersRes, leadsRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, name, email, business_type, subscription_plan, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("grain_alerts")
        .select("id, admin_id, alert_type, priority, message, created_at")
        .in("priority", ["critical", "high"])
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      context.supabase
        .from("subscriptions")
        .select("id, status, price_per_month, plan_name, created_at, cancellation_date"),
      context.supabase
        .from("hubspot_sync_log")
        .select("id, action, status, hubspot_object_type, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("hardware_orders" as never)
        .select("id, status", { count: "exact", head: true }),
      context.supabase
        .from("waitlist_emails")
        .select("id", { count: "exact", head: true }),
    ]);

    // Build signups-per-day series (last 30 days).
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const p of seriesRes.data ?? []) {
      const key = String(p.created_at ?? "").slice(0, 10);
      if (key in buckets) buckets[key] += 1;
    }
    const signupsSeries = Object.entries(buckets).map(([date, count]) => ({ date, count }));
    const signupsTotal = signupsSeries.reduce((s, p) => s + p.count, 0);
    const last7 = signupsSeries.slice(-7).reduce((s, p) => s + p.count, 0);
    const prev7 = signupsSeries.slice(-14, -7).reduce((s, p) => s + p.count, 0);
    const wowDelta = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

    // Revenue snapshot.
    const subs = subsRes.data ?? [];
    const activeSubs = subs.filter((s: any) => s.status === "active");
    const churnedSubs = subs.filter((s: any) => s.status === "cancelled" || s.status === "canceled" || s.cancellation_date);
    const mrr = activeSubs.reduce((s: number, x: any) => s + (Number(x.price_per_month) || 0), 0);

    // Pipeline snapshot — aggregate HubSpot sync activity by status.
    const pipeline: Record<string, number> = {};
    for (const r of pipelineRes.data ?? []) {
      const k = String((r as { status?: string | null }).status ?? "unknown");
      pipeline[k] = (pipeline[k] ?? 0) + 1;
    }

    return {
      recentSignups: signupsRes.data ?? [],
      systemAlerts: alertsRes.data ?? [],
      signupsSeries,
      signupsTotal,
      wowDelta,
      revenue: {
        mrr,
        activeSubs: activeSubs.length,
        churnedSubs: churnedSubs.length,
      },
      pipeline,
      ordersTotal: (ordersRes as any)?.count ?? 0,
      leadsTotal: (leadsRes as any)?.count ?? 0,
      pipelineTotal: Object.values(pipeline).reduce((s, n) => s + n, 0),
    };
  });

export const getAllSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", { 
      _user_id: context.userId, 
      _role: "super_admin" 
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    // Get all subscriptions
    const { data: subscriptions, error: subError } = await context.supabase
      .from("subscriptions")
      .select("id, admin_id, plan_name, plan_description, status, price_per_month, currency, next_payment_date, start_date, end_date, billing_cycle, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    
    if (subError) throw subError;

    // Get admin profiles for all subscriptions
    const adminIds = (subscriptions ?? []).map((s: any) => s.admin_id).filter(Boolean);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, name, email, business_type")
      .in("id", adminIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (subscriptions ?? []).map((s: any) => {
      const profile = profileMap.get(s.admin_id);
      return {
        ...s,
        user_name: profile?.name ?? "Unknown",
        user_email: profile?.email ?? "N/A",
        business_type: profile?.business_type ?? "N/A",
      };
    });
  });
