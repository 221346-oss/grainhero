import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

/**
 * SuperAdmin dashboard extras — the series and derived analytics the overview
 * screen needs that the older widget/metric functions never returned:
 *
 *  • `health`     — 14-day platform health trend (same formula as the gauge, so
 *                   the last point and the ring always agree).
 *  • `insights`   — 14-day sparkline per insight tile.
 *  • `revenue`    — 12 months of revenue plus the same months a year earlier.
 *  • `funnel`     — signup → verified → tenant → subscribed → silo installed,
 *                   for the selected window and the window before it.
 *
 * Everything is derived from real rows; anything that cannot be derived is
 * returned as `null` so the UI can render an em dash instead of inventing a number.
 */

type ProfileRow = {
  id: string;
  admin_id: string | null;
  email_verified: boolean | null;
  created_at: string;
  subscription_plan: string | null;
};
type SubRow = {
  id: string;
  admin_id: string;
  status: string | null;
  created_at: string;
  canceled_at: string | null;
  cancellation_date: string | null;
};
type AlertRow = {
  id: string;
  priority: string | null;
  created_at: string;
  resolved_at: string | null;
};
type OwnedRow = { id: string; admin_id: string; created_at: string };
type InvoiceRow = {
  amount: number | null;
  status: string | null;
  billing_date: string | null;
  created_at: string | null;
};
type HardwareRow = {
  id: string;
  admin_id: string | null;
  hardware_total: number | null;
  status: string | null;
  created_at: string | null;
  installed_at: string | null;
};
type LogRow = { id: string; severity: string | null; category: string | null; created_at: string };
type DatedRow = { created_at?: string | null };

const DAY = 86_400_000;
const dayKey = (d: Date | string | number) => new Date(d).toISOString().slice(0, 10);
const monthKey = (d: Date | string | number) => new Date(d).toISOString().slice(0, 7);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Same shape as the client gauge: revenue 0-40, alerts 0-30, subscriptions 0-30. */
function healthScore({
  revenueDeltaPct,
  criticalAlerts,
  activeSubs,
  tenants,
}: {
  revenueDeltaPct: number;
  criticalAlerts: number;
  activeSubs: number;
  tenants: number;
}): number {
  const revenueScore = Math.min(40, Math.max(0, 20 + revenueDeltaPct * 0.5));
  const alertScore = criticalAlerts === 0 ? 30 : Math.max(0, 30 - criticalAlerts * 5);
  const subsScore = Math.min(30, (activeSubs / Math.max(1, tenants)) * 30);
  return Math.round(revenueScore + alertScore + subsScore);
}

const soft = <T>(p: PromiseLike<{ data: T | null }>) =>
  Promise.resolve(p).then(
    (r) => r.data ?? null,
    () => null,
  );

export const getSuperDashboardAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { windowDays?: number } | undefined) => ({
    windowDays: Math.min(180, Math.max(7, Number(input?.windowDays ?? 30))),
  }))
  .handler(async ({ context, data }) => {
    if ((await getEffectiveRole(context.supabase, context.userId)) !== "super_admin") {
      throw new Error("Forbidden: super admin only");
    }
    const sa = context.supabase;
    const { windowDays } = data;
    const now = Date.now();
    const windowStart = new Date(now - windowDays * DAY);
    const prevStart = new Date(now - windowDays * 2 * DAY);
    const twoYearsAgo = new Date(now - 730 * DAY).toISOString();

    const [profiles, subs, alerts, silosRows, warehouses, invoices, hardware, syncLog, logs] =
      await Promise.all([
        soft(
          sa.from("profiles").select("id, admin_id, email_verified, created_at, subscription_plan"),
        ),
        soft(
          sa
            .from("subscriptions")
            .select(
              "id, admin_id, status, price_per_month, created_at, canceled_at, cancellation_date",
            ),
        ),
        soft(
          sa
            .from("grain_alerts")
            .select("id, priority, created_at, resolved_at")
            .gte("created_at", twoYearsAgo),
        ),
        soft(sa.from("silos").select("id, admin_id, created_at")),
        soft(sa.from("warehouses").select("id, admin_id, created_at")),
        soft(
          sa
            .from("invoices")
            .select("amount, status, billing_date, created_at")
            .gte("created_at", twoYearsAgo)
            .limit(2000),
        ),
        soft(
          sa
            .from("hardware_orders")
            .select("id, admin_id, hardware_total, status, created_at, installed_at")
            .gte("created_at", twoYearsAgo),
        ),
        soft(
          sa
            .from("hubspot_sync_log")
            .select("id, created_at")
            .gte("created_at", new Date(now - 14 * DAY).toISOString()),
        ),
        soft(
          sa
            .from("activity_logs")
            .select("id, severity, category, created_at")
            .gte("created_at", new Date(now - 14 * DAY).toISOString()),
        ),
      ]);

    // `profiles.email_verified` is not maintained by the signup flow, so the real
    // confirmation state comes from auth.users via the service-role client.
    const confirmedAt = new Map<string, number>();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (let page = 1; page <= 5; page++) {
        const { data: batch } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        const users = batch?.users ?? [];
        for (const u of users) {
          if (u.email_confirmed_at) confirmedAt.set(u.id, new Date(u.email_confirmed_at).getTime());
        }
        if (users.length < 1000) break;
      }
    } catch (err) {
      console.warn("[getSuperDashboardAnalytics] auth.admin.listUsers failed:", err);
    }

    const allProfiles = (profiles ?? []) as unknown as ProfileRow[];
    const allSubs = (subs ?? []) as unknown as SubRow[];
    const allAlerts = (alerts ?? []) as unknown as AlertRow[];
    const allSilos = (silosRows ?? []) as unknown as OwnedRow[];
    const allWarehouses = (warehouses ?? []) as unknown as OwnedRow[];
    const paidInvoices = ((invoices ?? []) as unknown as InvoiceRow[]).filter(
      (i) => i.status === "paid",
    );
    const hwOrders = ((hardware ?? []) as unknown as HardwareRow[]).filter(
      (o) => o.status !== "cancelled" && o.status !== "refunded",
    );

    /* ── revenue by month, 24 months back ─────────────────────────────────── */
    const byMonth: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      byMonth[monthKey(d)] = 0;
    }
    for (const inv of paidInvoices) {
      const k = monthKey(inv.billing_date ?? inv.created_at ?? now);
      if (k in byMonth) byMonth[k] += Number(inv.amount ?? 0);
    }
    for (const o of hwOrders) {
      const k = monthKey(o.created_at ?? now);
      if (k in byMonth) byMonth[k] += Number(o.hardware_total ?? 0);
    }
    const months = Object.keys(byMonth);
    const revenueMonthly = months.slice(12).map((month) => {
      const prev = new Date(`${month}-01T00:00:00Z`);
      prev.setUTCFullYear(prev.getUTCFullYear() - 1);
      return {
        month,
        revenue: Math.round(byMonth[month] ?? 0),
        lastYear: Math.round(byMonth[monthKey(prev)] ?? 0),
      };
    });

    /* ── 14-day health trend ──────────────────────────────────────────────── */
    const revenueInRange = (fromMs: number, toMs: number) => {
      let total = 0;
      for (const inv of paidInvoices) {
        const t = new Date(inv.billing_date ?? inv.created_at ?? 0).getTime();
        if (t > fromMs && t <= toMs) total += Number(inv.amount ?? 0);
      }
      for (const o of hwOrders) {
        const t = new Date(o.created_at ?? 0).getTime();
        if (t > fromMs && t <= toMs) total += Number(o.hardware_total ?? 0);
      }
      return total;
    };

    const healthTrend: { date: string; score: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const at = now - i * DAY;
      const tenantsAsOf = allProfiles.filter(
        (p) => !p.admin_id && new Date(p.created_at ?? 0).getTime() <= at,
      ).length;
      const activeAsOf = allSubs.filter((s) => {
        const started = new Date(s.created_at ?? 0).getTime();
        if (started > at) return false;
        const ended = s.canceled_at ?? s.cancellation_date;
        return !ended || new Date(ended).getTime() > at;
      }).length;
      const criticalOpen = allAlerts.filter((a) => {
        if (a.priority !== "critical") return false;
        if (new Date(a.created_at ?? 0).getTime() > at) return false;
        return !a.resolved_at || new Date(a.resolved_at).getTime() > at;
      }).length;
      const cur = revenueInRange(at - 30 * DAY, at);
      const prior = revenueInRange(at - 60 * DAY, at - 30 * DAY);
      const revenueDeltaPct = prior > 0 ? ((cur - prior) / prior) * 100 : cur > 0 ? 100 : 0;
      healthTrend.push({
        date: dayKey(at),
        score: healthScore({
          revenueDeltaPct,
          criticalAlerts: criticalOpen,
          activeSubs: activeAsOf,
          tenants: tenantsAsOf,
        }),
      });
    }
    const scores = healthTrend.map((p) => p.score);
    const current = scores[scores.length - 1] ?? 0;

    /* ── 14-day sparklines per insight tile ───────────────────────────────── */
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) days.push(dayKey(now - i * DAY));
    const countByDay = (rows: DatedRow[]) => {
      const b: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
      for (const r of rows) {
        const k = dayKey(r.created_at ?? 0);
        if (k in b) b[k] += 1;
      }
      return days.map((d) => b[d]);
    };
    const allLogs = (logs ?? []) as unknown as LogRow[];
    const insights = {
      signups: countByDay(
        allProfiles.filter((p) => new Date(p.created_at ?? 0).getTime() >= now - 14 * DAY),
      ),
      tickets: countByDay(
        allLogs.filter(
          (l) =>
            l.severity === "error" ||
            l.severity === "critical" ||
            l.category === "platform_support",
        ),
      ),
      pipeline: countByDay((syncLog ?? []) as unknown as DatedRow[]),
      alerts: countByDay(
        allAlerts.filter(
          (a) =>
            a.priority === "critical" && new Date(a.created_at ?? 0).getTime() >= now - 14 * DAY,
        ),
      ),
    };

    /* ── onboarding funnel, current window vs the window before it ────────── */
    const siloByAdmin = new Map<string, number>();
    for (const s of allSilos) {
      const t = new Date(s.created_at ?? 0).getTime();
      const prevT = siloByAdmin.get(s.admin_id);
      if (s.admin_id && (prevT === undefined || t < prevT)) siloByAdmin.set(s.admin_id, t);
    }
    const warehouseByAdmin = new Map<string, number>();
    for (const w of allWarehouses) {
      const t = new Date(w.created_at ?? 0).getTime();
      const prevT = warehouseByAdmin.get(w.admin_id);
      if (w.admin_id && (prevT === undefined || t < prevT)) warehouseByAdmin.set(w.admin_id, t);
    }
    const subbedAdmins = new Set(
      allSubs
        .filter((s) => !["cancelled", "canceled", "expired"].includes(String(s.status)))
        .map((s) => s.admin_id),
    );

    const funnelFor = (fromMs: number, toMs: number) => {
      const cohort = allProfiles.filter((p) => {
        const t = new Date(p.created_at ?? 0).getTime();
        return t >= fromMs && t < toMs;
      });
      const verified = cohort.filter((p) => confirmedAt.has(p.id) || p.email_verified);
      const tenants = verified.filter((p) => !p.admin_id);
      const subscribed = tenants.filter((p) => subbedAdmins.has(p.id));
      const installed = subscribed.filter((p) => siloByAdmin.has(p.id));
      return { cohort, verified, tenants, subscribed, installed };
    };

    const cur = funnelFor(windowStart.getTime(), now);
    const prev = funnelFor(prevStart.getTime(), windowStart.getTime());

    const stageDefs = [
      { key: "signed_up", label: "Signed up", rows: cur.cohort },
      { key: "email_verified", label: "Email verified", rows: cur.verified },
      { key: "tenant_created", label: "Tenant created", rows: cur.tenants },
      { key: "subscribed", label: "Subscribed", rows: cur.subscribed },
      { key: "silo_installed", label: "Silo installed", rows: cur.installed },
    ];
    const total = cur.cohort.length;
    const stages = stageDefs.map((s, i) => {
      const prevCount = i === 0 ? s.rows.length : stageDefs[i - 1].rows.length;
      const lost = i === 0 ? 0 : prevCount - s.rows.length;
      return {
        key: s.key,
        label: s.label,
        count: s.rows.length,
        share: pct(s.rows.length, total),
        keptPct: i === 0 || prevCount === 0 ? null : pct(s.rows.length, prevCount),
        lost,
      };
    });
    const biggestDrop = stages
      .slice(1)
      .reduce(
        (worst, s) => (worst && worst.lost >= s.lost ? worst : s),
        null as null | (typeof stages)[number],
      );

    const convertedPrev = prev.installed.length;
    const converted = cur.installed.length;
    const dropOff = 100 - pct(converted, total);
    const dropOffPrev = 100 - pct(convertedPrev, prev.cohort.length);

    // Time from signup to the first silo, in days (median over the window's cohort).
    const timeToFirstSilo = median(
      cur.cohort
        .filter((p) => siloByAdmin.has(p.id))
        .map((p) => (siloByAdmin.get(p.id)! - new Date(p.created_at).getTime()) / DAY)
        .filter((n) => n >= 0),
    );
    // Verification → operating tenant: confirmed email to first warehouse. Falls back
    // to signup time for accounts with no confirmation timestamp.
    const verifyToTenantHrs = median(
      cur.cohort
        .filter((p) => warehouseByAdmin.has(p.id))
        .map((p) => {
          const from = confirmedAt.get(p.id) ?? new Date(p.created_at).getTime();
          return (warehouseByAdmin.get(p.id)! - from) / 3_600_000;
        })
        .filter((n) => n >= 0),
    );
    const windowOrders = hwOrders.filter(
      (o) => new Date(o.created_at ?? 0).getTime() >= windowStart.getTime(),
    );
    const installCompletion = windowOrders.length
      ? pct(
          windowOrders.filter(
            (o) => o.installed_at || o.status === "completed" || o.status === "installed",
          ).length,
          windowOrders.length,
        )
      : null;

    return {
      health: {
        score: current,
        trend: healthTrend,
        peak: scores.length ? Math.max(...scores) : 0,
        low: scores.length ? Math.min(...scores) : 0,
        asOf: new Date(now).toISOString(),
      },
      insights,
      revenueMonthly,
      funnel: {
        windowDays,
        stages,
        converted,
        convertedDeltaPct:
          convertedPrev > 0
            ? Math.round(((converted - convertedPrev) / convertedPrev) * 100)
            : null,
        convertedPrev,
        dropOff,
        dropOffDeltaPct:
          dropOffPrev > 0 ? Math.round(((dropOff - dropOffPrev) / dropOffPrev) * 100) : null,
        biggestDrop:
          biggestDrop && biggestDrop.lost > 0
            ? {
                label: biggestDrop.label,
                lost: biggestDrop.lost,
                of: stages[stages.findIndex((s) => s.key === biggestDrop.key) - 1],
              }
            : null,
        timeToFirstSiloDays: timeToFirstSilo === null ? null : Math.round(timeToFirstSilo),
        verifyToTenantHrs: verifyToTenantHrs === null ? null : Math.round(verifyToTenantHrs),
        installCompletionPct: installCompletion,
      },
    };
  });
