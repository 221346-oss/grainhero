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
    const sa = context.supabase;
    const { computeMrr } = await import("@/lib/plan-pricing.server");

    // Run all queries in parallel — use graceful fallbacks so one table being
    // empty / missing does not crash the entire function.
    const [subsRes, invRes, profRes, hwRes] = await Promise.all([
      sa.from("subscriptions").select("*"),
      // invoices is a billing table — may be empty in dev; graceful fallback
      sa.from("invoices")
        .select("id,admin_id,amount,currency,status,billing_date,invoice_number,created_at")
        .order("billing_date", { ascending: false })
        .limit(500)
        .then((r) => r)
        .catch(() => ({ data: [] as any[], error: null })),
      sa.from("profiles").select("id, subscription_plan, created_at, admin_id, name, email"),
      // hardware_orders — filter using PostgREST array syntax (not raw SQL)
      sa.from("hardware_orders")
        .select("id, admin_id, plan_name, hardware_total, currency, status, created_at")
        .not("status", "in", '("pending_payment","cancelled","refunded")')
        .then((r) => r)
        .catch(() => ({ data: [] as any[], error: null })),
    ]);

    const subscriptions = subsRes.data ?? [];
    const invoices = invRes.data ?? [];
    // Only top-level admins (admin_id is null) — exclude sub-users
    const profiles = (profRes.data ?? []).filter((p: any) => !p.admin_id);
    const hardware = hwRes.data ?? [];

    let mrrResult: { mrr: number; entries: any[]; byPlan: Record<string, number> } = { mrr: 0, entries: [], byPlan: {} };
    try {
      mrrResult = await computeMrr({ supabase: sa, subscriptions, profiles });
    } catch (err) {
      console.warn("[getSaasRevenueAnalytics] computeMrr failed, using zero MRR:", err);
    }
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

    // ── Expiring in 7 days — check subscriptions table directly ────────────
    const now = Date.now();
    const in7 = now + 7 * 86_400_000;
    const expiring = subscriptions
      .filter((s: any) => s.current_period_end && new Date(s.current_period_end).getTime() <= in7 && new Date(s.current_period_end).getTime() >= now)
      .sort((a: any, b: any) => new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime());

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
