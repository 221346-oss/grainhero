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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: subs }, { data: invs }, { data: profs }, { data: plans }, { data: hwOrders }] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin.from("invoices").select("*").order("billing_date", { ascending: false }).limit(500),
      supabaseAdmin.from("profiles").select("id, subscription_plan, created_at"),
      supabaseAdmin.from("plan_thresholds").select("plan_id, name, price_cents, currency"),
      supabaseAdmin.from("hardware_orders").select("id, admin_id, plan_name, hardware_total, currency, status, created_at").not("status", "in", "(pending_payment,cancelled,refunded)"),
    ]);

    const subscriptions = subs ?? [];
    const invoices = invs ?? [];
    const profiles = profs ?? [];
    const hardware = hwOrders ?? [];

    // Identify super_admin ids to exclude them from tenant MRR counting
    const { data: superAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const superIds = new Set((superAdmins ?? []).map((r: any) => r.user_id));

    // Plan price lookup in USD cents → convert to whole units (dashboard shows PKR label but numbers are the raw monthly price)
    const planPrice = new Map<string, number>();
    for (const p of plans ?? []) {
      const key = String(p.plan_id ?? p.name ?? "").toLowerCase();
      planPrice.set(key, Number(p.price_cents ?? 0) / 100);
    }

    const activeSubs = subscriptions.filter((s: any) => s.status === "active");
    const trialSubs = subscriptions.filter((s: any) => s.status === "trial");
    const cancelledSubs = subscriptions.filter((s: any) => s.status === "cancelled");

    // Normalize prices to monthly
    const monthly = (s: any) => {
      const p = Number(s.price_per_month ?? 0);
      if (s.billing_cycle === "yearly") return p / 12;
      return p;
    };
    let mrr = activeSubs.reduce((sum: number, s: any) => sum + monthly(s), 0);
    const subscribedAdminIds = new Set(activeSubs.map((s: any) => s.admin_id));

    // Fallback: derive MRR from profiles.subscription_plan for tenants that
    // don't have a subscriptions row yet (typical right after signup).
    for (const p of profiles) {
      if (superIds.has(p.id)) continue;
      if (subscribedAdminIds.has(p.id)) continue;
      const key = String(p.subscription_plan ?? "").toLowerCase();
      if (!key) continue;
      const price = planPrice.get(key) ?? 0;
      if (price > 0) mrr += price;
    }
    const arr = mrr * 12;

    const paid = invoices.filter((i: any) => i.status === "paid");
    const hardwareRevenue = hardware.reduce((s: number, o: any) => s + Number(o.hardware_total ?? 0), 0);
    const totalRevenue = paid.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0) + hardwareRevenue;

    // Revenue by month (last 12)
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
    // If the current month has revenue but earlier months are all zero,
    // sparkline still renders because we always emit 12 buckets.
    const revenueSeries = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));

    // Revenue by plan
    const byPlan: Record<string, number> = {};
    for (const s of activeSubs) {
      const name = s.plan_name ?? "Unknown";
      byPlan[name] = (byPlan[name] ?? 0) + monthly(s);
    }
    const planSeries = Object.entries(byPlan).map(([plan, mrr]) => ({ plan, mrr: Math.round(mrr) }));

    // Subscriber growth (last 12 months, cumulative active)
    const growth: { month: string; subscribers: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = subscriptions.filter((s: any) => {
        const started = s.start_date ? new Date(s.start_date) : new Date(s.created_at);
        return started <= cutoff;
      }).length;
      growth.push({ month: d.toISOString().slice(0, 7), subscribers: count });
    }

    // Expiring in next 7 days
    const now = Date.now();
    const in7 = now + 7 * 86400_000;
    const expiring = activeSubs
      .filter((s: any) => s.end_date && new Date(s.end_date).getTime() <= in7 && new Date(s.end_date).getTime() >= now)
      .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

    // Churn: cancellations in last 30 days / active 30 days ago
    const in30 = now - 30 * 86400_000;
    const churned = subscriptions.filter((s: any) => s.status === "cancelled" && s.updated_at && new Date(s.updated_at).getTime() >= in30).length;
    const activeStart = subscriptions.filter((s: any) => new Date(s.created_at).getTime() < in30 && s.status !== "trial").length;
    const churnRate = activeStart > 0 ? (churned / activeStart) * 100 : 0;

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
      },
      revenueSeries,
      planSeries,
      growth,
      expiring: expiring.slice(0, 20).map((s: any) => ({
        id: s.id, admin_id: s.admin_id, plan_name: s.plan_name,
        end_date: s.end_date, status: s.status,
      })),
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
