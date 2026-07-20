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
    const { computeMrr } = await import("@/lib/plan-pricing.server");

    const [{ data: subs }, { data: invs }, { data: profs }, { data: hwOrders }] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin.from("invoices").select("*").order("billing_date", { ascending: false }).limit(500),
      supabaseAdmin.from("profiles").select("id, subscription_plan, created_at"),
      supabaseAdmin.from("hardware_orders").select("id, admin_id, plan_name, hardware_total, currency, status, created_at").not("status", "in", "(pending_payment,cancelled,refunded)"),
    ]);

    const subscriptions = subs ?? [];
    const invoices = invs ?? [];
    const profiles = profs ?? [];
    const hardware = hwOrders ?? [];

    // Canonical PKR MRR (plan_thresholds is the single source of truth).
    const mrrResult = await computeMrr({
      supabase: supabaseAdmin,
      subscriptions,
      profiles,
    });
    const mrr = mrrResult.mrr;
    const arr = mrr * 12;

    const activeSubs = mrrResult.entries;
    const trialSubs = subscriptions.filter((s: any) => s.status === "trial");
    const cancelledSubs = subscriptions.filter((s: any) => s.status === "cancelled");

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
    // Fold MRR into the historical trend so the sparkline reflects live
    // subscribers even when no invoices/hardware orders exist yet.
    // Each historical month gets the MRR of subscribers active on/before that month's end;
    // when we don't have per-sub start dates, we conservatively add the full MRR to the
    // current month only.
    const currentKey = new Date().toISOString().slice(0, 7);
    if (currentKey in byMonth) byMonth[currentKey] += mrr;
    const revenueSeries = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));

    // Revenue by plan (from the unified MRR entries — includes profile fallback).
    const planSeries = Object.entries(mrrResult.byPlan).map(([plan, m]) => ({ plan, mrr: Math.round(m) }));

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
