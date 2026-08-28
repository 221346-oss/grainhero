import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Forbidden: super_admin only");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase;
    const { data: profile } = await supa
      .from("profiles")
      .select("id, name, email")
      .eq("id", context.userId)
      .maybeSingle();
    return profile ?? { id: context.userId, name: "Admin", email: "" };
  });

export const getAdminProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supa = context.supabase;
    const [{ data: profile }, silos, warehouses, batches, alerts, sub, teamCount, lastActivity] =
      await Promise.all([
        supa.from("profiles").select("*").eq("id", data.adminId).maybeSingle(),
        supa
          .from("silos")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", data.adminId),
        supa
          .from("warehouses")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", data.adminId),
        supa
          .from("grain_batches")
          .select("id, total_value_pkr, created_at")
          .eq("admin_id", data.adminId)
          .order("created_at", { ascending: false })
          .limit(500),
        supa
          .from("grain_alerts")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", data.adminId)
          .is("resolved_at", null),
        supa
          .from("subscriptions")
          .select("plan_name, status, price_per_month, created_at")
          .eq("admin_id", data.adminId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supa
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", data.adminId),
        supa
          .from("activity_logs")
          .select("id, action, entity_type, entity_name, created_at")
          .eq("admin_id", data.adminId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const totalRevenue = (batches.data ?? []).reduce(
      (s: number, b: any) => s + Number(b.total_value_pkr ?? 0),
      0,
    );

    return {
      profile: profile ?? null,
      stats: {
        silos: silos.count ?? 0,
        warehouses: warehouses.count ?? 0,
        batches: (batches.data ?? []).length,
        openAlerts: alerts.count ?? 0,
        teamSize: teamCount.count ?? 0,
        totalRevenue,
        currentPlan: sub.data?.plan_name ?? null,
        planStatus: sub.data?.status ?? null,
        monthlyPrice: Number(sub.data?.price_per_month ?? 0),
      },
      recentActivity: lastActivity.data ?? [],
    };
  });

export const updateAdminContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { adminId: string; patch: { name?: string; phone?: string; notes?: string } }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(data.patch)
      .eq("id", data.adminId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAdminSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string; suspended: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supabaseAdmin = context.supabase;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ suspended: data.suspended })
      .eq("id", data.adminId);
    if (error) throw new Error(error.message);
    return { ok: true, suspended: data.suspended };
  });

export const getAdminOrderFrequency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { adminId: string; source?: "batches" | "orders" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const supa = context.supabase;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const table = data.source === "orders" ? "hardware_orders" : "grain_batches";
    const { data: rows } = await supa
      .from(table)
      .select("id, created_at")
      .eq("admin_id", data.adminId)
      .gte("created_at", start.toISOString());
    const buckets: { month: string; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      buckets.push({ month: d.toLocaleString("default", { month: "short" }), count: 0 });
    }
    (rows ?? []).forEach((r: any) => {
      const d = new Date(r.created_at);
      const idx = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      if (idx >= 0 && idx < 6) buckets[idx].count += 1;
    });
    return buckets;
  });
