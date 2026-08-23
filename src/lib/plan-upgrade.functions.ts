/**
 * Admin-only plan change flow — Stripe is the source of truth for pricing,
 * proration, and cycle math.
 *
 *  - First-time subscribe  → Stripe Checkout in mode=subscription.
 *  - Upgrade / cycle upsize on an existing subscription
 *      → `subscription.update` with `proration_behavior=always_invoice`.
 *        Stripe issues a prorated invoice immediately on the customer's
 *        saved payment method.
 *  - Downgrade / same-price cycle switch
 *      → subscription schedule that swaps price at `current_period_end`.
 *
 *  Yearly price = 10 × monthly (2 months free).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

type Cycle = "monthly" | "yearly";

const PLAN_IDS = ["basic", "intermediate", "pro"] as const;
type PlanId = (typeof PLAN_IDS)[number];

const PLAN_RANK: Record<PlanId, number> = { basic: 1, intermediate: 2, pro: 3 };

function cycleDays(c: Cycle) {
  return c === "yearly" ? 365 : 30;
}
function yearlyPriceRs(monthlyRs: number) {
  return monthlyRs * 10;
}
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
    .select(
      "plan_id, name, price_cents, currency, max_users, max_silos, max_batches, max_sensors, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

async function loadProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, admin_id, subscription_plan, billing_cycle, current_period_end, plan_usage_silos, plan_usage_users, plan_usage_sensors, plan_usage_actuators, retention_discount_pct, retention_discount_until, retention_offer_used_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_item_id, stripe_subscription_status, stripe_schedule_id",
    )
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
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_subscription_item_id: string | null;
    stripe_subscription_status: string | null;
    stripe_schedule_id: string | null;
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
  // Yearly plans are billed as a full annual charge up front (with credit for
  // any unused portion of the current cycle). Monthly plans stay prorated
  // over the days remaining in the new cycle.
  const newCharge =
    args.newCycle === "yearly" ? args.newPriceRs : (args.newPriceRs * daysRemaining) / newDays;
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

    const applyNow =
      direction === "upgrade" || (direction === "cycle_change" && newPriceRs > currentPriceRs);

    // Fallback estimate — used before a Stripe subscription exists or if the
    // upcoming-invoice preview fails. UI shows this as "estimate".
    const fallback = computeProration({
      currentPriceRs,
      newPriceRs,
      currentCycle,
      newCycle: data.billing_cycle,
      currentPeriodEnd: profile.current_period_end,
    });

    let stripeQuoteCents: number | null = null;
    let stripeQuoteCurrency: string | null = null;
    let quoteSource: "stripe" | "estimate" = "estimate";

    if (applyNow && profile.stripe_subscription_id && profile.stripe_subscription_item_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ensurePlanStripeIds, priceIdForCycle, previewUpcomingInvoice } =
          await import("@/lib/stripe-billing.server");
        const ids = await ensurePlanStripeIds(supabaseAdmin, data.requested_plan);
        const newPriceId = priceIdForCycle(ids, data.billing_cycle);
        const quote = await previewUpcomingInvoice({
          customerId: profile.stripe_customer_id!,
          subscriptionId: profile.stripe_subscription_id,
          subscriptionItemId: profile.stripe_subscription_item_id,
          newPriceId,
        });
        stripeQuoteCents = quote.amountDueCents;
        stripeQuoteCurrency = quote.currency.toUpperCase();
        quoteSource = "stripe";
      } catch (e) {
        console.warn(
          "[preview] Stripe upcoming-invoice failed, using estimate:",
          (e as Error).message,
        );
      }
    }

    const chargeRs =
      stripeQuoteCents !== null
        ? Math.round(stripeQuoteCents / 100)
        : applyNow
          ? fallback.proratedRs
          : 0;

    return {
      direction,
      apply_now: applyNow,
      current_plan: currentPlanId,
      current_cycle: currentCycle,
      new_plan: data.requested_plan,
      new_cycle: data.billing_cycle,
      current_price_pkr: currentPriceRs,
      new_price_pkr: newPriceRs,
      prorated_charge_pkr: chargeRs,
      quote_source: quoteSource,
      quote_currency: stripeQuoteCurrency ?? "PKR",
      days_remaining: fallback.daysRemaining,
      current_period_end: fallback.periodEndIso,
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
    const applyNow =
      direction === "upgrade" || (direction === "cycle_change" && newPriceRs > currentPriceRs);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { emitToSuperAdmins } = await import("@/lib/notify");
    const { logActivity } = await import("@/lib/activity");
    const { ensurePlanStripeIds, ensureStripeCustomer, priceIdForCycle } =
      await import("@/lib/stripe-billing.server");
    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe not configured");

    // Make sure Product + Prices exist for the target plan.
    const ids = await ensurePlanStripeIds(supabaseAdmin, data.requested_plan);
    const newPriceId = priceIdForCycle(ids, data.billing_cycle);

    // Fallback period-end estimate for scheduled downgrades.
    const nowMs = Date.now();
    const defaultPeriodEndIso =
      profile.current_period_end ??
      new Date(nowMs + cycleDays(currentCycle) * 86400_000).toISOString();

    if (!applyNow) {
      // ────── DOWNGRADE / same-price cycle switch ──────
      // Attach a Stripe subscription schedule so the price flips at the
      // real Stripe period_end (source of truth).
      let applyAt = defaultPeriodEndIso;
      if (profile.stripe_subscription_id) {
        try {
          const sub = (await stripeFetch(
            `/subscriptions/${profile.stripe_subscription_id}`,
            null,
            "GET",
          )) as {
            current_period_end: number;
            items: { data: Array<{ id: string; price: { id: string } }> };
          };
          const periodEndSec = sub.current_period_end;
          const currentPriceId = sub.items.data[0]?.price.id;
          applyAt = new Date(periodEndSec * 1000).toISOString();

          if (profile.stripe_schedule_id) {
            await stripeFetch(
              `/subscription_schedules/${profile.stripe_schedule_id}/cancel`,
              new URLSearchParams(),
            ).catch(() => null);
          }
          const created = (await stripeFetch(
            "/subscription_schedules",
            stripeForm({
              from_subscription: profile.stripe_subscription_id,
            }),
          )) as { id: string };
          const phaseBody = new URLSearchParams();
          phaseBody.set("end_behavior", "release");
          phaseBody.set("phases[0][items][0][price]", currentPriceId);
          phaseBody.set("phases[0][items][0][quantity]", "1");
          phaseBody.set("phases[0][end_date]", String(periodEndSec));
          phaseBody.set("phases[0][proration_behavior]", "none");
          phaseBody.set("phases[1][items][0][price]", newPriceId);
          phaseBody.set("phases[1][items][0][quantity]", "1");
          phaseBody.set("phases[1][proration_behavior]", "none");
          await stripeFetch(`/subscription_schedules/${created.id}`, phaseBody);

          await supabaseAdmin
            .from("profiles")
            .update({ stripe_schedule_id: created.id } as never)
            .eq("id", tenantAdminId);
        } catch (e) {
          console.warn(
            "[plan-schedule] Stripe schedule failed, falling back to cron:",
            (e as Error).message,
          );
        }
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("tenant_plan_change_requests")
        .insert({
          tenant_admin_id: tenantAdminId,
          requested_plan: data.requested_plan,
          current_plan: currentPlanId,
          direction,
          status: "pending",
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
        sb: supabaseAdmin,
        tenantAdminId,
        actorId: context.userId,
        action: "billing.plan_change_scheduled",
        targetType: "plan_change_request",
        targetId: (inserted as { id?: string } | null)?.id ?? null,
        meta: { direction, from: currentPlanId, to: data.requested_plan, apply_at: applyAt },
      });
      return { scheduled: true, apply_at: applyAt, id: (inserted as { id?: string } | null)?.id };
    }

    // ────── UPGRADE / cycle upsize ──────
    // Case A: no active Stripe subscription yet → Checkout in subscription mode.
    if (!profile.stripe_subscription_id) {
      const customerId = await ensureStripeCustomer(supabaseAdmin, context.userId);
      const originHeader =
        (context as any)?.request?.headers?.get?.("origin") ??
        (context as any)?.request?.headers?.get?.("referer") ??
        process.env.PUBLIC_APP_URL ??
        "";
      const origin = originHeader ? new URL(originHeader).origin : "";
      const success = `${origin}/plan-management?upgrade=success`;
      const cancel = `${origin}/plan-management?upgrade=cancel`;

      const { data: req, error: reqErr } = await supabaseAdmin
        .from("tenant_plan_change_requests")
        .insert({
          tenant_admin_id: tenantAdminId,
          requested_plan: data.requested_plan,
          current_plan: currentPlanId,
          direction,
          status: "pending",
          billing_cycle: data.billing_cycle,
          requested_by: context.userId,
          note: "Awaiting Stripe checkout payment",
        } as never)
        .select("id")
        .single();
      if (reqErr || !req) {
        throw new Error(
          `Failed to create plan change request: ${reqErr?.message ?? "no row returned"}`,
        );
      }
      const requestId = (req as { id: string }).id;

      const body = new URLSearchParams();
      body.set("mode", "subscription");
      body.set("customer", customerId);
      body.set("success_url", success);
      body.set("cancel_url", cancel);
      body.set("line_items[0][price]", newPriceId);
      body.set("line_items[0][quantity]", "1");
      body.set("subscription_data[metadata][tenant_admin_id]", tenantAdminId);
      body.set("subscription_data[metadata][plan_id]", data.requested_plan);
      body.set("subscription_data[metadata][billing_cycle]", data.billing_cycle);
      body.set("metadata[plan_change_request_id]", requestId);
      body.set("metadata[user_id]", context.userId);

      const session = (await stripeFetch("/checkout/sessions", body)) as {
        id: string;
        url: string;
      };
      await supabaseAdmin
        .from("tenant_plan_change_requests")
        .update({ stripe_session_id: session.id } as never)
        .eq("id", requestId);
      return { scheduled: false, apply_now: true, url: session.url, id: requestId };
    }

    // Case B: active subscription → subscription.update with proration_behavior=always_invoice.
    try {
      const sub = (await stripeFetch(
        `/subscriptions/${profile.stripe_subscription_id}`,
        null,
        "GET",
      )) as { items: { data: Array<{ id: string }> } };
      const currentItemId = sub.items.data[0]?.id;
      if (!currentItemId) throw new Error("Subscription has no item to update");

      if (profile.stripe_schedule_id) {
        await stripeFetch(
          `/subscription_schedules/${profile.stripe_schedule_id}/cancel`,
          new URLSearchParams(),
        ).catch(() => null);
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_schedule_id: null } as never)
          .eq("id", tenantAdminId);
      }

      const updBody = new URLSearchParams();
      updBody.set("items[0][id]", currentItemId);
      updBody.set("items[0][price]", newPriceId);
      updBody.set("proration_behavior", "always_invoice");
      updBody.set("payment_behavior", "error_if_incomplete");
      updBody.set("metadata[plan_id]", data.requested_plan);
      updBody.set("metadata[billing_cycle]", data.billing_cycle);
      await stripeFetch(`/subscriptions/${profile.stripe_subscription_id}`, updBody);

      // Cache locally; webhook confirms.
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_plan: data.requested_plan,
          billing_cycle: data.billing_cycle,
        } as never)
        .eq("id", tenantAdminId);

      await logActivity({
        sb: supabaseAdmin,
        tenantAdminId,
        actorId: context.userId,
        action: "billing.plan_upgrade_applied",
        targetType: "profile",
        targetId: tenantAdminId,
        meta: {
          direction,
          from: currentPlanId,
          to: data.requested_plan,
          cycle: data.billing_cycle,
        },
      });
      await emitToSuperAdmins(supabaseAdmin, {
        category: "plan",
        severity: "success",
        title: "Plan upgraded",
        body: `${currentPlanId} → ${data.requested_plan} (${data.billing_cycle}) — invoiced by Stripe.`,
        link: "/platform/plans",
      });
      return { scheduled: false, apply_now: true, url: null, id: null, invoiced: true };
    } catch (e) {
      throw new Error(
        `Upgrade could not be charged automatically: ${(e as Error).message}. ` +
          `Open the billing portal to update your payment method and try again.`,
      );
    }
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
      id: string;
      admin_id: string | null;
      subscription_plan: string | null;
      billing_cycle: Cycle | null;
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
      sb: supabaseAdmin,
      tenantAdminId: p.admin_id ?? p.id,
      actorId: context.userId,
      action: "billing.retention_offer_accepted",
      targetType: "profile",
      targetId: p.id,
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

/* -------------------- openBillingPortal -------------------- */
// Returns a short-lived Stripe Billing Portal URL so admins can update
// payment methods, download invoices, and manage their subscription.
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureStripeCustomer } = await import("@/lib/stripe-billing.server");
    const { stripeFetch, stripeForm } = await import("@/lib/stripe-api.server");
    const customerId = await ensureStripeCustomer(supabaseAdmin, context.userId);
    const originHeader =
      (context as any)?.request?.headers?.get?.("origin") ??
      (context as any)?.request?.headers?.get?.("referer") ??
      process.env.PUBLIC_APP_URL ??
      "";
    const origin = originHeader ? new URL(originHeader).origin : "";
    const session = (await stripeFetch(
      "/billing_portal/sessions",
      stripeForm({
        customer: customerId,
        return_url: `${origin}/plan-management`,
      }),
    )) as { url: string };
    return { url: session.url };
  });
