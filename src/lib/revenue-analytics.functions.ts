import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

async function assertSuperAdmin(supabase: any, userId: string) {
  if ((await getEffectiveRole(supabase, userId)) !== "super_admin") throw new Error("Forbidden: super admin only");
}

export const getSaasRevenueAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    // ── Use context.supabase (user-auth client) — NOT supabaseAdmin which
    //    requires SUPABASE_SERVICE_ROLE_KEY that is not set in this environment.
    //    context.supabase is the same client used by all other working platform fns.
    const sa = context.supabase;
    const { computeMrr } = await import("@/lib/plan-pricing.server");

    const [subsRes, invRes, profRes, hwRes] = await Promise.all([
      sa.from("subscriptions").select("*"),
      sa.from("invoices").select("*").order("billing_date", { ascending: false }).limit(500),
      sa.from("profiles").select("id, subscription_plan, created_at, admin_id, name, email"),
      sa.from("hardware_orders")
        .select("id, admin_id, plan_name, hardware_total, currency, status, created_at")
        .not("status", "in", "(pending_payment,cancelled,refunded)"),
    ]);

    const subscriptions = subsRes.data ?? [];
    const invoices = invRes.data ?? [];
    // Only top-level admins (admin_id is null) — exclude sub-users
    const profiles = (profRes.data ?? []).filter((p: any) => !p.admin_id);
    const hardware = hwRes.data ?? [];

    const mrrResult = await computeMrr({ supabase: sa, subscriptions, profiles });
    const mrr = mrrResult.mrr;
    const arr = mrr * 12;
    const activeSubs = mrrResult.entries;

    const trialSubs  = subscriptions.filter((s: any) => s.status === "trial" || s.status === "trialing");
    const cancelledSubs = subscriptions.filter((s: any) => s.status === "cancelled");
    const paid = invoices.filter((i: any) => i.status === "paid");
    const hardwareRevenue = hardware.reduce((s: number, o: any) => s + Number(o.hardware_total ?? 0), 0);
    const totalRevenue = paid.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0) + hardwareRevenue;

    // ── Revenue by month (last 12) ──────────────────────────────────────────
    const byMonth: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      byMonth[d.toISOString().slice(0, 7)] = 0;
    }
    for (const inv of paid) {
      const key = String(inv.billing_date ?? inv.created_at ?? "").slice(0, 7);
      if (key in byMonth) byMonth[key] += Number(inv.amount ?? 0);
    }
    for (const o of hardware) {
      const key = String(o.created_at ?? "").slice(0, 7);
      if (key in byMonth) byMonth[key] += Number(o.hardware_total ?? 0);
    }
    // Fold current-month MRR into sparkline so chart is never empty
    const currentKey = new Date().toISOString().slice(0, 7);
    if (currentKey in byMonth) byMonth[currentKey] += mrr;
    const revenueSeries = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));

    // ── Plan breakdown ──────────────────────────────────────────────────────
    const planSeries = Object.entries(mrrResult.byPlan).map(([plan, m]) => ({ plan, mrr: Math.round(m as number) }));

    // ── Subscriber growth (cumulative, last 12 months) ──────────────────────
    const growth: { month: string; subscribers: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = profiles.filter((p: any) => new Date(p.created_at) <= cutoff).length;
      growth.push({ month: d.toISOString().slice(0, 7), subscribers: count });
    }

    // ── Expiring in 7 days ──────────────────────────────────────────────────
    const now = Date.now();
    const in7 = now + 7 * 86_400_000;
    const expiring = activeSubs
      .filter((s: any) => s.end_date && new Date(s.end_date).getTime() <= in7 && new Date(s.end_date).getTime() >= now)
      .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

    // ── Churn (30-day window) ───────────────────────────────────────────────
    const in30 = now - 30 * 86_400_000;
    const churned = subscriptions.filter((s: any) => s.status === "cancelled" && s.updated_at && new Date(s.updated_at).getTime() >= in30).length;
    const activeStart = subscriptions.filter((s: any) => new Date(s.created_at).getTime() < in30 && s.status !== "trial").length;
    const churnRate = activeStart > 0 ? (churned / activeStart) * 100 : 0;

    // ── Per-admin subscription details for the table ────────────────────────
    const adminSubs = activeSubs.map((e: any) => {
      const prof = profiles.find((p: any) => p.id === e.admin_id);
      return {
        admin_id: e.admin_id,
        name: prof?.name ?? prof?.email ?? e.admin_id?.slice(0, 8) ?? "—",
        plan: e.plan_name,
        mrr: e.price,
        joined: e.created_at,
      };
    });

    return {
      kpis: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        totalRevenue: Math.round(totalRevenue),
        activeCount: activeSubs.length,
        trialCount: trialSubs.length,
        cancelledCount: cancelledSubs.length,
        expiringCount: expiring.length,
        churnRate: Number(churnRate.toFixed(1)),
        hardwareRevenue: Math.round(hardwareRevenue),
        hardwareOrders: hardware.length,
        totalAdmins: profiles.length,
      },
      revenueSeries,
      planSeries,
      growth,
      adminSubs,
      expiring: expiring.slice(0, 20).map((s: any) => {
        const prof = profiles.find((p: any) => p.id === s.admin_id);
        return {
          id: s.id,
          admin_id: s.admin_id,
          admin_name: prof?.name ?? prof?.email ?? null,
          plan_name: s.plan_name,
          end_date: s.end_date,
          status: s.status,
        };
      }),
      recentInvoices: invoices.slice(0, 20).map((i: any) => ({
        id: i.id, admin_id: i.admin_id, amount: i.amount, currency: i.currency,
        status: i.status, billing_date: i.billing_date, invoice_number: i.invoice_number,
      })),
      currency: "PKR",
    };
  });

export const triggerExpiryRemindersNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { runExpiryReminders } = await import("@/lib/expiry-reminders.server");
    return runExpiryReminders();
  });
