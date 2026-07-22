import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super_admin only");
}

async function loadSub(supabase: any, subscriptionId: string) {
  const { data, error } = await supabase.from("subscriptions").select("*").eq("id", subscriptionId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Subscription not found");
  return data;
}

export const adminChangeUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string(), planId: z.enum(["basic", "intermediate", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { changeStripePlan } = await import("@/lib/billing-sync.server");
    await changeStripePlan(supabaseAdmin, {
      stripeSubscriptionId: sub.stripe_subscription_id,
      planId: data.planId,
      actorId: context.userId,
      reason: "super-admin plan change",
    });
    return { ok: true };
  });

export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string(), immediate: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setCancelAtPeriodEnd, cancelSubscriptionNow } = await import("@/lib/billing-sync.server");
    if (data.immediate) {
      await cancelSubscriptionNow(supabaseAdmin, sub.stripe_subscription_id);
    } else {
      await setCancelAtPeriodEnd(supabaseAdmin, sub.stripe_subscription_id, true);
    }
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      sb: supabaseAdmin,
      tenantAdminId: sub.admin_id,
      actorId: context.userId,
      action: data.immediate ? "billing.admin_cancelled_now" : "billing.admin_cancel_scheduled",
      targetType: "subscription",
      targetId: sub.stripe_subscription_id,
    });
    return { ok: true };
  });

export const adminResumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setCancelAtPeriodEnd } = await import("@/lib/billing-sync.server");
    await setCancelAtPeriodEnd(supabaseAdmin, sub.stripe_subscription_id, false);
    return { ok: true };
  });

export const adminSyncSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const sub = await loadSub(context.supabase, data.subscriptionId);
    if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncSubscriptionFromStripe } = await import("@/lib/billing-sync.server");
    const synced = await syncSubscriptionFromStripe(supabaseAdmin, sub.stripe_subscription_id);
    return { ok: true, plan: synced.planName };
  });

export const adminReconcileAllSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reconcileAllSubscriptions } = await import("@/lib/billing-sync.server");
    const results = await reconcileAllSubscriptions(supabaseAdmin);
    const ok = results.filter((r) => r.ok).length;
    return { ok: true, synced: ok, failed: results.length - ok, results };
  });