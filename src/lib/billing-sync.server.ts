/**
 * Phase 6 — shared Stripe ↔ Supabase billing helpers.
 * Server-only. Do not import from client-reachable modules at module scope.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import pricingData, { resolvePlanId } from "@/lib/pricing-data";

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) body.append(k, String(v));
  return body;
}

async function stripeFetch(
  path: string,
  body: URLSearchParams | null,
  method: "GET" | "POST" | "DELETE" = "POST",
): Promise<Record<string, unknown>> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body ?? undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const PLAN_NAME_MAP: Record<string, string> = {
  basic: "Grain Starter",
  starter: "Grain Starter",
  intermediate: "Grain Professional",
  growth: "Grain Professional",
  professional: "Grain Professional",
  pro: "Grain Enterprise",
  scale: "Grain Enterprise",
  enterprise: "Grain Enterprise",
};

const PLAN_LIMITS: Record<string, { users: number; devices: number; storage: number; batches: number }> = {
  basic: { users: 5, devices: 3, storage: 10, batches: 100 },
  intermediate: { users: 10, devices: 6, storage: 50, batches: 500 },
  pro: { users: 999999, devices: 15, storage: 999999, batches: 999999 },
};

/**
 * Pulls the latest Stripe subscription and upserts the local `subscriptions` row.
 * Returns the resulting Supabase row shape.
 */
export async function syncSubscriptionFromStripe(
  supabaseAdmin: SupabaseClient,
  stripeSubscriptionId: string,
) {
  const sub = (await stripeFetch(`/subscriptions/${stripeSubscriptionId}`, null, "GET")) as {
    id: string;
    customer: string;
    status: string;
    current_period_start?: number;
    current_period_end?: number;
    cancel_at?: number | null;
    canceled_at?: number | null;
    cancel_at_period_end?: boolean;
    latest_invoice?: string | null;
    metadata?: Record<string, string>;
    items?: { data: Array<{ price: { unit_amount: number; currency: string; recurring?: { interval: string } } }> };
  };

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", sub.customer)
    .maybeSingle();
  const adminId = (prof as { id?: string } | null)?.id ?? sub.metadata?.user_id ?? null;
  if (!adminId) throw new Error(`No local profile for customer ${sub.customer}`);

  const rawPlanId = String(sub.metadata?.plan_id ?? "").toLowerCase();
  const planId = resolvePlanId(rawPlanId) ?? rawPlanId ?? "basic";
  const planName = PLAN_NAME_MAP[planId] ?? "Custom";
  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.basic;
  const price = sub.items?.data[0]?.price;
  const interval = price?.recurring?.interval ?? "month";
  const billingCycle = interval === "year" ? "yearly" : interval === "quarter" ? "quarterly" : "monthly";
  const validStatuses = new Set(["active", "inactive", "cancelled", "expired", "trial", "trialing", "past_due"]);
  const status = validStatuses.has(sub.status) ? sub.status : "active";

  const row = {
    admin_id: adminId,
    plan_name: planName,
    plan_description: `Stripe subscription (${planId})`,
    status,
    auto_renew: !(sub.cancel_at_period_end ?? false),
    start_date: sub.current_period_start
      ? new Date(sub.current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    end_date: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 86400_000).toISOString(),
    next_payment_date: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    latest_invoice_id: (sub.latest_invoice as string | null) ?? null,
    price_per_month: price ? Number(price.unit_amount) / 100 : 0,
    currency: (price?.currency ?? "usd").toUpperCase(),
    billing_cycle: billingCycle,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    max_users: limits.users,
    max_devices: limits.devices,
    max_storage_gb: limits.storage,
    max_batches: limits.batches,
    last_synced_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row as never, { onConflict: "stripe_subscription_id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return { row: data, adminId, planId, planName };
}

/**
 * Shared plan-change path. Updates Stripe with proration, syncs the local row,
 * writes activity + notification. Used by self-serve and super-admin flows.
 */
export async function changeStripePlan(
  supabaseAdmin: SupabaseClient,
  args: {
    stripeSubscriptionId: string;
    planId: "basic" | "intermediate" | "pro";
    actorId: string;
    reason?: string;
  },
) {
  const plan = pricingData.find((p: { id: string }) => p.id === args.planId);
  if (!plan) throw new Error(`Unknown plan ${args.planId}`);

  const stripeSub = (await stripeFetch(
    `/subscriptions/${args.stripeSubscriptionId}`,
    null,
    "GET",
  )) as { items?: { data: Array<{ id: string }> } };
  const itemId = stripeSub.items?.data?.[0]?.id;
  if (!itemId) throw new Error("Stripe subscription item missing");
  const currency = String(plan.currency ?? "usd").toLowerCase();
  await stripeFetch(
    `/subscriptions/${args.stripeSubscriptionId}`,
    form({
      "items[0][id]": itemId,
      "items[0][price_data][currency]": currency,
      "items[0][price_data][product_data][name]": `GrainHero ${plan.name}`,
      "items[0][price_data][unit_amount]": String(Math.round(Number(plan.price) * 100)),
      "items[0][price_data][recurring][interval]": plan.interval ?? "month",
      proration_behavior: "create_prorations",
      cancel_at_period_end: "false",
      "metadata[plan_id]": plan.id,
    }),
  );

  const synced = await syncSubscriptionFromStripe(supabaseAdmin, args.stripeSubscriptionId);

  // Activity + notification (best-effort; do not fail the plan change on these).
  try {
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      sb: supabaseAdmin,
      tenantAdminId: synced.adminId,
      actorId: args.actorId,
      action: "billing.plan_changed",
      targetType: "subscription",
      targetId: args.stripeSubscriptionId,
      meta: { plan_id: args.planId, reason: args.reason ?? null },
    });
  } catch (e) {
    console.warn("[billing-sync] logActivity failed", (e as Error).message);
  }
  try {
    const { emitNotification } = await import("@/lib/notify");
    await emitNotification(supabaseAdmin, {
      recipientId: synced.adminId,
      tenantAdminId: synced.adminId,
      category: "billing",
      severity: "success",
      title: `Plan changed to ${synced.planName}`,
      body: args.reason ? `Reason: ${args.reason}` : "Your subscription was updated.",
      link: "/subscription",
      entityType: "subscription",
      entityId: args.stripeSubscriptionId,
    });
  } catch (e) {
    console.warn("[billing-sync] emitNotification failed", (e as Error).message);
  }

  return synced;
}

export async function setCancelAtPeriodEnd(
  supabaseAdmin: SupabaseClient,
  stripeSubscriptionId: string,
  cancel: boolean,
) {
  await stripeFetch(
    `/subscriptions/${stripeSubscriptionId}`,
    form({ cancel_at_period_end: cancel ? "true" : "false" }),
  );
  return syncSubscriptionFromStripe(supabaseAdmin, stripeSubscriptionId);
}

export async function cancelSubscriptionNow(
  supabaseAdmin: SupabaseClient,
  stripeSubscriptionId: string,
) {
  await stripeFetch(`/subscriptions/${stripeSubscriptionId}`, null, "DELETE");
  // Deleted subs still return a payload; sync captures canceled_at.
  return syncSubscriptionFromStripe(supabaseAdmin, stripeSubscriptionId);
}

/**
 * Nightly reconciler — scans local subs with Stripe IDs and refreshes each.
 * Called by cron or a super-admin button. Returns per-row status.
 */
export async function reconcileAllSubscriptions(supabaseAdmin: SupabaseClient) {
  const { data: rows } = await supabaseAdmin
    .from("subscriptions")
    .select("id, stripe_subscription_id")
    .not("stripe_subscription_id", "is", null);
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const r of (rows ?? []) as Array<{ id: string; stripe_subscription_id: string }>) {
    try {
      await syncSubscriptionFromStripe(supabaseAdmin, r.stripe_subscription_id);
      results.push({ id: r.id, ok: true });
    } catch (e) {
      results.push({ id: r.id, ok: false, error: (e as Error).message });
    }
  }
  return results;
}

/**
 * Idempotency: returns true if this Stripe event was already seen.
 */
export async function stripeEventAlreadyProcessed(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  eventType: string,
) {
  const { data } = await supabaseAdmin.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
  if (data) return true;
  await supabaseAdmin.from("stripe_events").insert({ id: eventId, type: eventType } as never);
  return false;
}
