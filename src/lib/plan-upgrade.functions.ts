/**
 * Admin-only prorated plan change flow (PKR).
 *
 *  - Upgrade / cycle upsize → Stripe Checkout for the prorated PKR difference.
 *    Applied to the profile only after `checkout.session.completed` webhook.
 *  - Downgrade / neutral change → scheduled at current_period_end; cron applies.
 *
 *  Yearly = 10 × monthly (12 months, 2 free).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

type Cycle = "monthly" | "yearly";

const PLAN_IDS = ["basic", "intermediate", "pro"] as const;
type PlanId = (typeof PLAN_IDS)[number];

const PLAN_RANK: Record<PlanId, number> = { basic: 1, intermediate: 2, pro: 3 };

function cycleDays(c: Cycle) { return c === "yearly" ? 365 : 30; }
function yearlyPriceRs(monthlyRs: number) { return monthlyRs * 10; }
function priceForCycle(monthlyRs: number, c: Cycle) {
  return c === "yearly" ? yearlyPriceRs(monthlyRs) : monthlyRs;
}

async function assertAdmin(supabase: any, userId: string) {
  const role = await getEffectiveRole(supabase, userId);
  if (role !== "admin") throw new Error("Only tenant admins can change plans");
}

type PlanRow = {
  plan_id: string;
  name: string | null;
  price_cents: number | null;
  currency: string | null;
  max_users: number | null;
  max_silos: number | null;
  max_batches: number | null;
  max_sensors: number | null;
  sort_order: number | null;
};

async function loadPlans(supabase: any) {
  const { data, error } = await supabase
    .from("plan_thresholds")
    .select("plan_id, name, price_cents, currency, max_users, max_silos, max_batches, max_sensors, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

async function loadProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, admin_id, subscription_plan, billing_cycle, current_period_end, plan_usage_silos, plan_usage_users, plan_usage_sensors, plan_usage_actuators, retention_discount_pct, retention_discount_until, retention_offer_used_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Profile not found");
  return data as {
    id: string;
    admin_id: string | null;
    subscription_plan: string | null;
    billing_cycle: Cycle | null;
    current_period_end: string | null;
    plan_usage_silos: number | null;
    plan_usage_users: number | null;
    plan_usage_sensors: number | null;
    plan_usage_actuators: number | null;
    retention_discount_pct: number | null;
    retention_discount_until: string | null;
    retention_offer_used_at: string | null;
  };
}

function computeProration(args: {
  currentPriceRs: number;
  newPriceRs: number;
  currentCycle: Cycle;
  newCycle: Cycle;
  currentPeriodEnd: string | null;
}) {
  const now = Date.now();
  const periodEnd = args.currentPeriodEnd
    ? new Date(args.currentPeriodEnd).getTime()
    : now + cycleDays(args.currentCycle) * 86400_000;
  const daysRemaining = Math.max(1, Math.ceil((periodEnd - now) / 86400_000));
  const curDays = cycleDays(args.currentCycle);
  const newDays = cycleDays(args.newCycle);
  const credit = (args.currentPriceRs * daysRemaining) / curDays;
  const newCharge = (args.newPriceRs * daysRemaining) / newDays;
  const proratedRs = Math.max(0, Math.round(newCharge - credit));
  return { daysRemaining, proratedRs, periodEndIso: new Date(periodEnd).toISOString() };
}

/* -------------------- getMyPlanState -------------------- */

export const getMyPlanState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [plans, profile] = await Promise.all([
      loadPlans(context.supabase),
      loadProfile(context.supabase, context.userId),
    ]);
    const { data: pending } = await context.supabase
      .from("tenant_plan_change_requests")
      .select("*")
      .eq("tenant_admin_id", profile.admin_id ?? profile.id)
      .in("status", ["scheduled", "pending_payment"])
      .order("created_at", { ascending: false })
      .limit(1);

    return {
      current_plan: (profile.subscription_plan ?? "basic") as string,
      current_cycle: (profile.billing_cycle ?? "monthly") as Cycle,
      current_period_end: profile.current_period_end,
      usage: {
        silos: profile.plan_usage_silos ?? 0,
        users: profile.plan_usage_users ?? 0,
        sensors: profile.plan_usage_sensors ?? 0,
        actuators: profile.plan_usage_actuators ?? 0,
      },
      retention: {
        discount_pct: profile.retention_discount_pct ?? 0,
        active_until: profile.retention_discount_until,
        offer_used_at: profile.retention_offer_used_at,
        offer_available: !profile.retention_offer_used_at,
      },
      plans: plans.map((p) => ({
        plan_id: p.plan_id,
        name: p.name ?? p.plan_id,
        price_monthly_pkr: Math.round((p.price_cents ?? 0) / 100),
        price_yearly_pkr: yearlyPriceRs(Math.round((p.price_cents ?? 0) / 100)),
        currency: p.currency ?? "PKR",
        limits: {
          users: p.max_users ?? 0,
          silos: p.max_silos ?? 0,
          batches: p.max_batches ?? 0,
          sensors: p.max_sensors ?? 0,
        },
      })),
      pending: (pending?.[0] ?? null) as unknown as {
        id: string;
        status: string;
        direction: string;
        requested_plan: string;
        current_plan: string | null;
        billing_cycle: string | null;
        apply_at: string | null;
        charge_amount_cents: number | null;
        stripe_session_id: string | null;
        created_at: string;
      } | null,
    };
  });

/* -------------------- previewPlanChange -------------------- */

const changeSchema = z.object({
  requested_plan: z.enum(PLAN_IDS),
  billing_cycle: z.enum(["monthly", "yearly"]),
});

const initiateSchema = changeSchema.extend({
  downgrade_reason: z.string().max(120).optional(),
  downgrade_reason_details: z.string().max(1000).optional(),
  retention_offer_declined: z.boolean().optional(),
});

export const previewPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => changeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [plans, profile] = await Promise.all([
      loadPlans(context.supabase),
      loadProfile(context.supabase, context.userId),
    ]);
    const currentPlanId = (profile.subscription_plan ?? "basic") as PlanId;
    const currentCycle: Cycle = profile.billing_cycle ?? "monthly";
    const cur = plans.find((p) => p.plan_id === currentPlanId);
    const next = plans.find((p) => p.plan_id === data.requested_plan);
    if (!next) throw new Error("Requested plan not found");

    const currentMonthly = Math.round((cur?.price_cents ?? 0) / 100);
    const newMonthly = Math.round((next.price_cents ?? 0) / 100);
    const currentPriceRs = priceForCycle(currentMonthly, currentCycle);
    const newPriceRs = priceForCycle(newMonthly, data.billing_cycle);

    const curRank = PLAN_RANK[currentPlanId] ?? 1;
    const newRank = PLAN_RANK[data.requested_plan as PlanId];
    let direction: "upgrade" | "downgrade" | "cycle_change" | "same";
    if (newRank > curRank) direction = "upgrade";
    else if (newRank < curRank) direction = "downgrade";
    else if (currentCycle !== data.billing_cycle) direction = "cycle_change";
    else direction = "same";

    const { proratedRs, daysRemaining, periodEndIso } = computeProration({
      currentPriceRs,
      newPriceRs,
      currentCycle,
      newCycle: data.billing_cycle,
      currentPeriodEnd: profile.current_period_end,
    });

    const applyNow =
      direction === "upgrade" ||
      (direction === "cycle_change" && newPriceRs > currentPriceRs);

    return {
      direction,
      apply_now: applyNow,
      current_plan: currentPlanId,
      current_cycle: currentCycle,
      new_plan: data.requested_plan,
      new_cycle: data.billing_cycle,
      current_price_pkr: currentPriceRs,
      new_price_pkr: newPriceRs,
      prorated_charge_pkr: applyNow ? proratedRs : 0,
      days_remaining: daysRemaining,
      current_period_end: periodEndIso,
    };
  });

/* -------------------- initiatePlanChange -------------------- */

export const initiatePlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => initiateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const gate = checkRateLimit(`plan-initiate:${context.userId}`, { limit: 5, windowMs: 60_000 });
    if (!gate.ok) throw new Error(`Too many requests. Try again in ${gate.retryAfter}s.`);

    const [plans, profile] = await Promise.all([
      loadPlans(context.supabase),
      loadProfile(context.supabase, context.userId),
    ]);
    const tenantAdminId = profile.admin_id ?? profile.id;
    const currentPlanId = (profile.subscription_plan ?? "basic") as PlanId;
    const currentCycle: Cycle = profile.billing_cycle ?? "monthly";
    const cur = plans.find((p) => p.plan_id === currentPlanId);
    const next = plans.find((p) => p.plan_id === data.requested_plan);
    if (!next) throw new Error("Requested plan not found");
    if (currentPlanId === data.requested_plan && currentCycle === data.billing_cycle) {
      throw new Error("Already on this plan");
    }

    const currentMonthly = Math.round((cur?.price_cents ?? 0) / 100);
    const newMonthly = Math.round((next.price_cents ?? 0) / 100);
    const currentPriceRs = priceForCycle(currentMonthly, currentCycle);
    const newPriceRs = priceForCycle(newMonthly, data.billing_cycle);
    const curRank = PLAN_RANK[currentPlanId] ?? 1;
    const newRank = PLAN_RANK[data.requested_plan as PlanId];
    let direction: "upgrade" | "downgrade" | "cycle_change";
    if (newRank > curRank) direction = "upgrade";
    else if (newRank < curRank) direction = "downgrade";
    else direction = "cycle_change";
    const proration = computeProration({
      currentPriceRs,
      newPriceRs,
      currentCycle,
      newCycle: data.billing_cycle,
      currentPeriodEnd: profile.current_period_end,
    });
    const applyNow = direction === "upgrade" || (direction === "cycle_change" && newPriceRs > currentPriceRs);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { emitToSuperAdmins } = await import("@/lib/notify");
    const { logActivity } = await import("@/lib/activity");

    if (!applyNow) {
      // Downgrade or same-price cycle switch → schedule at period end.
      const applyAt = proration.periodEndIso;
      const { data: inserted, error } = await supabaseAdmin
        .from("tenant_plan_change_requests")
        .insert({
          tenant_admin_id: tenantAdminId,
          requested_plan: data.requested_plan,
          current_plan: currentPlanId,
          direction,
          status: "scheduled",
          billing_cycle: data.billing_cycle,
          apply_at: applyAt,
          requested_by: context.userId,
          note: `Auto-scheduled ${direction} to apply at period end`,
          downgrade_reason: data.downgrade_reason ?? null,
          downgrade_reason_details: data.downgrade_reason_details ?? null,
          retention_offer_declined: data.retention_offer_declined ?? false,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await emitToSuperAdmins(supabaseAdmin, {
        category: "plan",
        severity: "info",
        title: `Plan ${direction} scheduled`,
        body: `Tenant scheduled ${currentPlanId} → ${data.requested_plan} (${data.billing_cycle}) at ${new Date(applyAt).toLocaleDateString()}.`,
        link: "/platform/plans",
        entityType: "plan_change_request",
        entityId: (inserted as { id?: string } | null)?.id ?? null,
      });
      await logActivity({
        sb: supabaseAdmin, tenantAdminId, actorId: context.userId,
        action: "billing.plan_change_scheduled",
        targetType: "plan_change_request",
        targetId: (inserted as { id?: string } | null)?.id ?? null,
        meta: { direction, from: currentPlanId, to: data.requested_plan, apply_at: applyAt },
      });
      return { scheduled: true, apply_at: applyAt, id: (inserted as { id?: string } | null)?.id };
    }

    // Upgrade path → Stripe Checkout for prorated amount in PKR.
    if (proration.proratedRs <= 0) {
      // Edge case: nothing to charge; apply immediately.
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_plan: data.requested_plan,
          billing_cycle: data.billing_cycle,
          current_period_end: new Date(Date.now() + cycleDays(data.billing_cycle) * 86400_000).toISOString(),
        } as never)
        .eq("id", tenantAdminId);
      return { scheduled: false, apply_now: true, prorated_pkr: 0 };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe not configured");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("tenant_plan_change_requests")
      .insert({
        tenant_admin_id: tenantAdminId,
        requested_plan: data.requested_plan,
        current_plan: currentPlanId,
        direction,
        status: "pending_payment",
        billing_cycle: data.billing_cycle,
        charge_amount_cents: proration.proratedRs * 100,
        requested_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (reqErr) throw reqErr;
    const requestId = (req as { id: string }).id;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const email = (prof as { email?: string } | null)?.email ?? null;
    const stripeCustomerId = (prof as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;

    // Same-origin success/cancel URLs.
    const originHeader = (context as any)?.request?.headers?.get?.("origin")
      ?? (context as any)?.request?.headers?.get?.("referer")
      ?? process.env.PUBLIC_APP_URL
      ?? "";
    const origin = originHeader ? new URL(originHeader).origin : "";
    const success = `${origin}/plan-management?upgrade=success`;
    const cancel = `${origin}/plan-management?upgrade=cancel`;

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", success);
    body.set("cancel_url", cancel);
    if (stripeCustomerId) body.set("customer", stripeCustomerId);
    else if (email) body.set("customer_email", email);
    body.set("line_items[0][price_data][currency]", "pkr");
    body.set("line_items[0][price_data][product_data][name]",
      `Plan ${currentPlanId} → ${data.requested_plan} (${data.billing_cycle}) — prorated`);
    body.set("line_items[0][price_data][unit_amount]", String(proration.proratedRs * 100));
    body.set("line_items[0][quantity]", "1");
    body.set("metadata[plan_change_request_id]", requestId);
    body.set("metadata[tenant_admin_id]", tenantAdminId);
    body.set("metadata[user_id]", context.userId);
    body.set("metadata[requested_plan]", data.requested_plan);
    body.set("metadata[billing_cycle]", data.billing_cycle);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
    const session = JSON.parse(text) as { id: string; url: string };

    await supabaseAdmin
      .from("tenant_plan_change_requests")
      .update({ stripe_session_id: session.id } as never)
      .eq("id", requestId);

    await logActivity({
      sb: supabaseAdmin, tenantAdminId, actorId: context.userId,
      action: "billing.plan_change_checkout_started",
      targetType: "plan_change_request",
      targetId: requestId,
        meta: { direction, from: currentPlanId, to: data.requested_plan, amount_pkr: proration.proratedRs },
    });

    return { scheduled: false, apply_now: true, url: session.url, prorated_pkr: proration.proratedRs, id: requestId };
  });

/* -------------------- cancelScheduledPlanChange -------------------- */

export const cancelScheduledPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("tenant_plan_change_requests")
      .update({ status: "cancelled" } as never)
      .eq("id", data.id)
      .eq("requested_by", context.userId)
      .in("status", ["scheduled", "pending_payment"]);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- acceptRetentionOffer -------------------- */
// 20% off current plan for the next 3 billing cycles. One-time per tenant.
export const acceptRetentionOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logActivity } = await import("@/lib/activity");
    const { emitToSuperAdmins } = await import("@/lib/notify");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, admin_id, subscription_plan, billing_cycle, retention_offer_used_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (!prof) throw new Error("Profile not found");
    const p = prof as {
      id: string; admin_id: string | null;
      subscription_plan: string | null; billing_cycle: Cycle | null;
      retention_offer_used_at: string | null;
    };
    if (p.retention_offer_used_at) throw new Error("Retention offer already used");

    const cycle: Cycle = p.billing_cycle ?? "monthly";
    const cycles = 3;
    const until = new Date(Date.now() + cycles * cycleDays(cycle) * 86400_000).toISOString();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        retention_discount_pct: 20,
        retention_discount_until: until,
        retention_offer_used_at: new Date().toISOString(),
      } as never)
      .eq("id", p.id);
    if (error) throw error;

    // cancel any scheduled downgrade in-flight
    await supabaseAdmin
      .from("tenant_plan_change_requests")
      .update({ status: "cancelled", note: "Cancelled — retention offer accepted" } as never)
      .eq("tenant_admin_id", p.admin_id ?? p.id)
      .eq("status", "scheduled");

    await logActivity({
      sb: supabaseAdmin, tenantAdminId: p.admin_id ?? p.id, actorId: context.userId,
      action: "billing.retention_offer_accepted",
      targetType: "profile", targetId: p.id,
      meta: { discount_pct: 20, until, plan: p.subscription_plan, cycle },
    });
    await emitToSuperAdmins(supabaseAdmin, {
      category: "plan",
      severity: "info",
      title: "Retention offer accepted",
      body: `Tenant kept ${p.subscription_plan} plan with 20% off for 3 cycles.`,
      link: "/platform/plans",
      entityType: "profile",
      entityId: p.id,
    });
    return { ok: true, discount_pct: 20, active_until: until };
  });