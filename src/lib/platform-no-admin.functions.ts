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
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const { computeMrr } = await import("@/lib/plan-pricing.server");
    // Use regular authenticated client - will respect RLS
    const [profiles, roles, batches, silos, alerts, subs, logs] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, admin_id, subscription_plan, created_at, business_type, blocked", {
          count: "exact",
        }),
      context.supabase.from("user_roles").select("role, user_id"),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase.from("silos").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_alerts").select("id, priority", { count: "exact" }),
      context.supabase
        .from("subscriptions")
        .select("id, admin_id, status, plan_id, plan_name, price_per_month, created_at"),
      context.supabase.from("activity_logs").select("id, severity", { count: "exact" }),
    ]);

    const tenants = new Set(
      (profiles.data ?? []).filter((p: any) => !p.admin_id).map((p: any) => p.id),
    );
    const criticalAlerts = (alerts.data ?? []).filter((a: any) => a.priority === "critical").length;
    const mrrResult = await computeMrr({
      supabase: context.supabase,
      subscriptions: subs.data ?? [],
      profiles: profiles.data ?? [],
    });
    const mrr = mrrResult.mrr;
    const activeSubs = mrrResult.entries;
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
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select(
        "id, name, email, admin_id, business_type, blocked, email_verified, created_at, last_login",
      )
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
      _role: "super_admin",
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
    for (const r of teamCounts ?? []) {
      if (r.admin_id) teamMap.set(r.admin_id, (teamMap.get(r.admin_id) ?? 0) + 1);
    }
    const batchMap = new Map<string, number>();
    for (const r of batchCounts ?? []) {
      if (r.admin_id) batchMap.set(r.admin_id, (batchMap.get(r.admin_id) ?? 0) + 1);
    }

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
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
    if (data.id === context.userId) throw new Error("Cannot block yourself");

    const { error } = await context.supabase
      .from("profiles")
      .update({ blocked: data.blocked })
      .eq("id", data.id);
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
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    let q = context.supabase
      .from("activity_logs")
      .select(
        "id, admin_id, user_id, user_name, user_role, action, category, entity_type, entity_ref, description, severity, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.severity && data.severity !== "all") q = q.eq("severity", data.severity);
    const { data: rows, error } = await q;
    if (error) throw error;
    const audit = rows ?? [];

    // Augment / fall back with synthesized events from hardware_orders and
    // new signups so the SuperAdmin activity feed is never empty when real
    // platform events exist but the audit trigger hasn't written a row.
    const [ordersRes, signupsRes] = await Promise.all([
      context.supabase
        .from("hardware_orders")
        .select(
          "id, admin_id, plan_name, hardware_quantity, hardware_total, currency, status, created_at, customer_name, customer_email",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      context.supabase
        .from("profiles")
        .select("id, name, email, subscription_plan, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const synth: any[] = [];
    for (const o of ordersRes.data ?? []) {
      synth.push({
        id: `hw-${o.id}`,
        admin_id: o.admin_id,
        user_id: o.admin_id,
        user_name: o.customer_name ?? o.customer_email ?? "Admin",
        user_role: "admin",
        action: `Install order · ${o.plan_name ?? "plan"}`,
        category: "billing",
        entity_type: "hardware_order",
        entity_ref: o.id,
        description: `${o.hardware_quantity ?? 0} device(s) · ${o.currency ?? "PKR"} ${Number(o.hardware_total ?? 0).toLocaleString()} · ${o.status}`,
        severity: o.status === "new" || o.status === "pending_payment" ? "warning" : "info",
        created_at: o.created_at,
      });
    }
    for (const p of signupsRes.data ?? []) {
      synth.push({
        id: `su-${p.id}`,
        admin_id: p.id,
        user_id: p.id,
        user_name: p.name ?? p.email ?? "New user",
        user_role: "admin",
        action: "New signup",
        category: "auth",
        entity_type: "profile",
        entity_ref: p.id,
        description: `${p.email ?? ""}${p.subscription_plan ? ` · ${p.subscription_plan}` : ""}`,
        severity: "info",
        created_at: p.created_at,
      });
    }

    // Merge, dedupe by (action + entity_ref), keep newest first.
    const seen = new Set<string>();
    const merged = [...audit, ...synth]
      .filter((r) => {
        const k = `${r.action}|${r.entity_ref ?? r.id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

    return merged.slice(0, data.limit ?? 200);
  });

export const getPlatformOverviewWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get HubSpot contacts count for leads
    let leadsCount = 0;
    if (process.env.HUBSPOT_API_KEY) {
      try {
        const { hubspotListContacts } = await import("./hubspot.server");
        const hubspotContacts = await hubspotListContacts(1000);
        leadsCount = hubspotContacts?.results?.length ?? 0;
      } catch {
        // If HubSpot fails, fall back to 0
        leadsCount = 0;
      }
    }

    const [
      signupsRes,
      alertsRes,
      seriesRes,
      subsRes,
      pipelineRes,
      ordersRes,
      hwOrdersRes,
      hwIssuesRes,
      errorLogsRes,
      supportQueriesRes,
    ] = await Promise.all([
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
      context.supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgo),
      context.supabase
        .from("subscriptions")
        .select(
          "id, admin_id, status, plan_id, plan_name, price_per_month, created_at, cancellation_date",
        ),
      context.supabase
        .from("hubspot_sync_log")
        .select("id, action, status, hubspot_object_type, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("hardware_orders" as never)
        .select("id, status", { count: "exact", head: true }),
      context.supabase
        .from("hardware_orders" as never)
        .select("id, status, customer_name, customer_email, created_at, cancel_reason")
        .in("status", ["new", "approved", "tech_assigned", "cancelled"] as never)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("grain_alerts")
        .select("id, alert_type, priority, message, created_at, status")
        .or("alert_type.ilike.%sensor%,alert_type.ilike.%hardware%,alert_type.ilike.%device%")
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .in("severity", ["error", "critical"])
        .gte("created_at", thirtyDaysAgo),
      context.supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("category", "platform_support")
        .gte("created_at", thirtyDaysAgo),
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
    const wowDelta =
      prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

    // Revenue snapshot — PKR from plan_thresholds (single source of truth).
    const subs = subsRes.data ?? [];
    const { data: allProfiles } = await context.supabase
      .from("profiles")
      .select("id, subscription_plan, created_at")
      .not("subscription_plan", "is", null);
    const { computeMrr } = await import("@/lib/plan-pricing.server");
    const mrrResult = await computeMrr({
      supabase: context.supabase,
      subscriptions: subs,
      profiles: allProfiles ?? [],
    });
    const mrr = mrrResult.mrr;
    const activeSubs = mrrResult.entries;
    const churnedSubs = subs.filter(
      (s: any) => s.status === "cancelled" || s.status === "canceled" || s.cancellation_date,
    );

    // Pipeline snapshot — aggregate HubSpot sync activity by status.
    const pipeline: Record<string, number> = {};
    for (const r of pipelineRes.data ?? []) {
      const k = String((r as { status?: string | null }).status ?? "unknown");
      pipeline[k] = (pipeline[k] ?? 0) + 1;
    }

    const openHwOrders = ((hwOrdersRes.data ?? []) as Array<{ status?: string | null }>).filter(
      (o) => o.status !== "cancelled",
    );
    const hardwareIssues =
      openHwOrders.length +
      ((hwIssuesRes.data ?? []) as Array<{ status?: string | null }>).filter(
        (a) => a.status === "open" || a.status === "active",
      ).length;
    const bugReports = (errorLogsRes as { count?: number })?.count ?? 0;
    const managerQueries = (supportQueriesRes as { count?: number })?.count ?? 0;

    const hardwareIssuesList = [
      ...(hwOrdersRes.data ?? []).map((o: Record<string, unknown>) => ({
        id: String(o.id),
        type: "order" as const,
        title: String(o.customer_name ?? o.customer_email ?? "Hardware order"),
        detail: String(o.status ?? "unknown").replace(/_/g, " "),
        created_at: String(o.created_at ?? ""),
      })),
      ...(hwIssuesRes.data ?? []).map((a: Record<string, unknown>) => ({
        id: String(a.id),
        type: "alert" as const,
        title: String(a.alert_type ?? "Sensor alert"),
        detail: String(a.message ?? a.priority ?? ""),
        created_at: String(a.created_at ?? ""),
      })),
    ]
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      .slice(0, 5);

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
      leadsTotal: leadsCount,
      pipelineTotal: Object.values(pipeline).reduce((s, n) => s + n, 0),
      reportingStats: {
        hardwareIssues,
        bugReports,
        managerQueries,
        totalTickets: hardwareIssues + bugReports + managerQueries,
      },
      reportingSeries: [
        { category: "Hardware", count: hardwareIssues },
        { category: "Bugs", count: bugReports },
        { category: "Queries", count: managerQueries },
      ],
      hardwareIssuesList,
    };
  });

export const getAllSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is super_admin
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    // Get all subscriptions
    const { data: subscriptions, error: subError } = await context.supabase
      .from("subscriptions")
      .select(
        "id, admin_id, plan_name, plan_description, status, price_per_month, currency, next_payment_date, start_date, end_date, billing_cycle, created_at",
      )
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

export const getPlatformReportingDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [hwOrdersRes, hwAlertsRes, errorLogsRes, supportQueriesRes] = await Promise.all([
      context.supabase
        .from("hardware_orders" as never)
        .select(
          "id, status, customer_name, customer_email, contact_phone, created_at, cancel_reason, notes",
        )
        .in("status", ["new", "approved", "tech_assigned", "pending_payment"] as never)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("grain_alerts")
        .select("id, alert_type, priority, message, created_at, status, admin_id")
        .or("alert_type.ilike.%sensor%,alert_type.ilike.%hardware%,alert_type.ilike.%device%")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("activity_logs")
        .select("id, user_name, user_role, action, description, severity, created_at, admin_id")
        .in("severity", ["error", "critical"])
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("activity_logs")
        .select(
          "id, user_name, user_role, action, description, severity, created_at, admin_id, metadata",
        )
        .eq("category", "platform_support")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      hardwareOrders: hwOrdersRes.data ?? [],
      hardwareAlerts: hwAlertsRes.data ?? [],
      bugReports: errorLogsRes.data ?? [],
      managerQueries: supportQueriesRes.data ?? [],
    };
  });

export const submitPlatformQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const role = roleRow?.role ?? "pending";
    if (!["admin", "manager"].includes(role)) {
      throw new Error("Only admins and managers can submit platform queries");
    }

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, name, admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    const adminId = prof?.admin_id ?? context.userId;
    const { error } = await context.supabase.from("activity_logs").insert({
      admin_id: adminId,
      user_id: context.userId,
      user_name: prof?.name ?? null,
      user_role: role,
      action: data.subject.trim(),
      category: "platform_support",
      description: data.message.trim(),
      severity: "info",
      metadata: { type: "manager_query" } as never,
    });
    if (error) throw error;
    return { ok: true };
  });

// ── Tenant detail — super admin drill-down for a single tenant ──────────────
export const getTenantDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");

    const [profileRes, subRes, silosRes, warehousesRes, batchesRes, teamRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, name, email, business_type, created_at, blocked, subscription_plan, admin_id")
        .eq("id", data.adminId)
        .maybeSingle(),
      context.supabase
        .from("subscriptions")
        .select(
          "id, plan_name, status, start_date, end_date, max_silos, max_warehouses, max_users, max_batches, price",
        )
        .eq("admin_id", data.adminId)
        .in("status", ["active", "trial"])
        .maybeSingle(),
      context.supabase
        .from("silos")
        .select("id, name, status, capacity_kg, current_occupancy_kg")
        .eq("admin_id", data.adminId)
        .is("deleted_at", null)
        .limit(100),
      context.supabase
        .from("warehouses")
        .select("id, name, status")
        .eq("admin_id", data.adminId)
        .is("deleted_at", null)
        .limit(50),
      context.supabase
        .from("grain_batches")
        .select("id, status, grain_type, quantity_kg, created_at")
        .eq("admin_id", data.adminId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("profiles")
        .select("id, name, email, blocked")
        .eq("admin_id", data.adminId)
        .limit(50),
    ]);

    const profile = profileRes.data;
    const sub = subRes.data;
    const silos = silosRes.data ?? [];
    const warehouses = warehousesRes.data ?? [];
    const recentBatches = batchesRes.data ?? [];
    const team = teamRes.data ?? [];

    // Activity logs — last 10 events for this tenant
    const { data: logs } = await context.supabase
      .from("activity_logs")
      .select("id, action, description, category, severity, created_at")
      .eq("admin_id", data.adminId)
      .order("created_at", { ascending: false })
      .limit(10);

    const totalKg = silos.reduce(
      (s: number, silo: any) => s + Number(silo.current_occupancy_kg ?? 0),
      0,
    );
    const capacityKg = silos.reduce((s: number, silo: any) => s + Number(silo.capacity_kg ?? 0), 0);

    return {
      profile,
      subscription: sub,
      usage: {
        silos: silos.length,
        warehouses: warehouses.length,
        team: team.length + 1, // +1 for admin
        batches: recentBatches.length,
        totalKg: Math.round(totalKg),
        capacityKg: Math.round(capacityKg),
      },
      silos,
      warehouses,
      team,
      recentBatches,
      activityLogs: logs ?? [],
    };
  });

// ── Send renewal reminder to a specific tenant ─────────────────────────────
export const sendExpiryReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");

    // Get the subscription end date for the message
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("plan_name, end_date")
      .eq("admin_id", data.adminId)
      .in("status", ["active", "trial"])
      .maybeSingle();

    const endDate = sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : "soon";
    const planName = sub?.plan_name ?? "your plan";

    // Insert notification directly using the insert_notification RPC
    const { error } = await (context.supabase as any).rpc("insert_notification", {
      p_user_id: data.adminId,
      p_admin_id: data.adminId,
      p_title: `Your ${planName} subscription expires ${endDate}`,
      p_message:
        "Renew your subscription to keep access to all your silos, batches, and team members. Contact GrainHero support or upgrade from the subscription page.",
      p_category: "plan",
      p_type: "warning",
      p_action_url: "/subscription",
      p_entity_type: "subscription",
      p_entity_id: null,
      p_metadata: { sent_by: "super_admin", reminder: true },
    });
    if (error) throw error;
    return { ok: true };
  });

// ── Super admin: critical alerts with tenant + silo details ────────────────
export const getCriticalAlertsForSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuperAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");

    const { data: alerts, error } = await context.supabase
      .from("grain_alerts")
      .select(
        "id, alert_id, title, message, priority, status, source, alert_type, triggered_at, acknowledged_at, resolved_at, admin_id, silo_id, silos(id, silo_id, name)",
      )
      .eq("priority", "critical")
      .order("triggered_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    // Resolve tenant names from admin_id
    const adminIds = [...new Set((alerts ?? []).map((a: any) => a.admin_id).filter(Boolean))];
    let profileMap = new Map<string, { name: string | null; email: string | null }>();
    if (adminIds.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", adminIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { name: p.name, email: p.email });
      }
    }

    return {
      alerts: (alerts ?? []).map((a: any) => ({
        id: a.id,
        alert_id: a.alert_id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        status: a.status,
        source: a.source,
        alert_type: a.alert_type,
        triggered_at: a.triggered_at,
        acknowledged_at: a.acknowledged_at,
        resolved_at: a.resolved_at,
        tenant_name: profileMap.get(a.admin_id)?.name ?? profileMap.get(a.admin_id)?.email ?? "Unknown",
        silo_name: a.silos?.name ?? null,
        silo_id: a.silo_id,
      })),
    };
  });
