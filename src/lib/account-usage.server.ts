/**
 * Account usage — what the tenant is paying for, who is using it, and for how
 * long they have been on the platform.
 *
 * The other half of the all-locations overview. The performance figures say
 * what the business did; these say what the *account* is doing, which is the
 * question an owner asks at renewal rather than at the start of a shift: what
 * am I on, what does it cost, when does it renew, how many of my people are
 * actually in here, and how much of what I bought am I using.
 *
 * Deliberately not location-scoped, and correctly so: a plan is bought per
 * tenant, not per site, and the team belongs to the account rather than to a
 * city. Scoping any of this by location would misreport it — the same reason
 * `getDashboardExtras` marks its subscription and team queries account-wide.
 *
 * Everything here is counted from real rows. `subscriptions` carries
 * `usage_users` and friends, but nothing in the app maintains them, so they are
 * ignored in favour of counting the profiles that actually exist.
 *
 * Relative imports only, so the arithmetic is testable without a Supabase
 * client — the same split `page-scope.server.ts` uses.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** A person on the account. */
export type AccountMember = {
  id: string;
  role: string | null;
  lastActiveAt: string | null;
  loginCount: number;
};

export type AccountUsage = {
  plan: {
    /** Plan name, or null when the account is on no active subscription. */
    name: string | null;
    status: string | null;
    pricePerMonth: number;
    currency: string;
    billingCycle: string | null;
    autoRenew: boolean;
    /** When the subscription next takes payment, if it is set to. */
    nextPaymentDate: string | null;
    /** When the current term ends. */
    endDate: string | null;
    /** Whole days until `endDate`. Negative once expired, null without one. */
    daysRemaining: number | null;
  };
  people: {
    /** Everyone on the account, the owner included. */
    total: number;
    /** How many have been active in the last 30 days. */
    activeLast30d: number;
    /** Sign-ins across the whole team — the closest honest "how much use". */
    totalLogins: number;
    /** Seats the plan allows, or null when it does not cap them. */
    seatLimit: number | null;
  };
  /** When the account was created, and how long ago that is in whole days. */
  memberSince: string | null;
  daysOnPlatform: number | null;
};

/** Whole days between two instants, rounded down, or null if either is absent. */
export function daysBetween(fromISO: string | null, toISO: string | null): number | null {
  if (!fromISO || !toISO) return null;
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.floor((to - from) / 86_400_000);
}

/**
 * How many of these people have been active since `sinceISO`.
 *
 * `last_active_at` is null for anyone who has not been seen since the column
 * was added, and those people are counted as inactive rather than as active —
 * an unknown is not a sign of life, and inflating this figure would make the
 * seat count look better used than it is.
 */
export function countActiveSince(members: AccountMember[], sinceISO: string): number {
  return members.filter((m) => m.lastActiveAt !== null && m.lastActiveAt >= sinceISO).length;
}

type SubscriptionRow = {
  plan_name: string | null;
  status: string | null;
  price_per_month: number | null;
  currency: string | null;
  billing_cycle: string | null;
  auto_renew: boolean | null;
  next_payment_date: string | null;
  end_date: string | null;
};

/** Shape the plan half from the subscription row, or the no-plan default. */
export function toPlan(sub: SubscriptionRow | null, nowISO: string): AccountUsage["plan"] {
  return {
    name: sub?.plan_name ?? null,
    status: sub?.status ?? null,
    pricePerMonth: Number(sub?.price_per_month ?? 0),
    currency: sub?.currency ?? "PKR",
    billingCycle: sub?.billing_cycle ?? null,
    autoRenew: sub?.auto_renew ?? false,
    nextPaymentDate: sub?.next_payment_date ?? null,
    endDate: sub?.end_date ?? null,
    daysRemaining: daysBetween(nowISO, sub?.end_date ?? null),
  };
}

export async function buildAccountUsage(
  sb: SupabaseClient,
  userId: string,
): Promise<AccountUsage> {
  const { resolveTenantAdminId } = await import("./page-scope.server");
  const nowISO = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const empty: AccountUsage = {
    plan: toPlan(null, nowISO),
    people: { total: 0, activeLast30d: 0, totalLogins: 0, seatLimit: null },
    memberSince: null,
    daysOnPlatform: null,
  };

  // A super admin viewing the platform in their own right has no tenant and so
  // no plan of their own. They never see this panel, but resolving to "every
  // profile on the platform" would be the wrong answer if they ever did.
  const adminId = await resolveTenantAdminId(sb, userId);
  if (!adminId) return empty;

  const [subRes, peopleRes, ownerRes] = await Promise.all([
    sb
      .from("subscriptions")
      .select(
        "plan_name, status, price_per_month, currency, billing_cycle, auto_renew, next_payment_date, end_date",
      )
      .eq("admin_id", adminId)
      .is("deleted_at", null)
      .in("status", ["active", "trial"])
      .order("created_at", { ascending: false })
      .limit(1),
    // The owner plus everyone they invited — the same membership test
    // getTenantUsage applies for the max_users allowance, so the count here
    // and the seat limit beside it are talking about the same people.
    sb
      .from("profiles")
      .select("id, role, last_active_at, login_count")
      .or(`admin_id.eq.${adminId},id.eq.${adminId}`)
      .is("deleted_at", null)
      .limit(1000),
    sb.from("profiles").select("created_at").eq("id", adminId).maybeSingle(),
  ]);
  if (subRes.error) throw subRes.error;
  if (peopleRes.error) throw peopleRes.error;

  const members: AccountMember[] = (peopleRes.data ?? []).map((p) => ({
    id: p.id as string,
    role: (p.role as string | null) ?? null,
    lastActiveAt: (p.last_active_at as string | null) ?? null,
    loginCount: Number(p.login_count ?? 0),
  }));

  const { computePlanGate } = await import("./plan-gate");
  // The seat count is already known, so it is passed in rather than counted a
  // second time by the gate.
  const gate = await computePlanGate(sb, userId, "max_users", members.length);
  const seatLimit = typeof gate.limit === "number" && gate.limit > 0 ? gate.limit : null;

  const memberSince = (ownerRes.data?.created_at as string | null) ?? null;

  return {
    plan: toPlan((subRes.data?.[0] as SubscriptionRow) ?? null, nowISO),
    people: {
      total: members.length,
      activeLast30d: countActiveSince(members, thirtyDaysAgo),
      totalLogins: members.reduce((n, m) => n + m.loginCount, 0),
      seatLimit,
    },
    memberSince,
    daysOnPlatform: daysBetween(memberSince, nowISO),
  };
}
