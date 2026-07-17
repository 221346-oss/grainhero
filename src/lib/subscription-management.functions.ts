import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getMyStripeSubscription(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("admin_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) throw new Error("No subscription found");
  if (!sub.stripe_subscription_id) throw new Error("Subscription not linked to Stripe");
  return sub;
}

export const changeMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ planId: z.enum(["basic", "intermediate", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sub = await getMyStripeSubscription(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { changeStripePlan } = await import("@/lib/billing-sync.server");
    await changeStripePlan(supabaseAdmin, {
      stripeSubscriptionId: sub.stripe_subscription_id,
      planId: data.planId,
      actorId: context.userId,
      reason: "self-serve upgrade/downgrade",
    });
    return { ok: true };
  });

export const cancelAtPeriodEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sub = await getMyStripeSubscription(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setCancelAtPeriodEnd } = await import("@/lib/billing-sync.server");
    await setCancelAtPeriodEnd(supabaseAdmin, sub.stripe_subscription_id, true);
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      sb: supabaseAdmin,
      tenantAdminId: context.userId,
      actorId: context.userId,
      action: "billing.cancel_scheduled",
      targetType: "subscription",
      targetId: sub.stripe_subscription_id,
    });
    const { emitNotification } = await import("@/lib/notify");
    await emitNotification(supabaseAdmin, {
      recipientId: context.userId,
      tenantAdminId: context.userId,
      category: "billing",
      severity: "warning",
      title: "Subscription set to cancel",
      body: "Your subscription will end at the current period end. You can resume anytime before then.",
      link: "/subscription",
      entityType: "subscription",
      entityId: sub.stripe_subscription_id,
    });
    return { ok: true };
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sub = await getMyStripeSubscription(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setCancelAtPeriodEnd } = await import("@/lib/billing-sync.server");
    await setCancelAtPeriodEnd(supabaseAdmin, sub.stripe_subscription_id, false);
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      sb: supabaseAdmin,
      tenantAdminId: context.userId,
      actorId: context.userId,
      action: "billing.resumed",
      targetType: "subscription",
      targetId: sub.stripe_subscription_id,
    });
    return { ok: true };
  });
