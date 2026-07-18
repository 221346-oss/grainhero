import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordSettingsAudit } from "./settings-audit.server";

const schema = z.object({
  checkout_enabled: z.boolean(),
  allowed_payment_methods: z.array(z.string().min(1)).min(1).max(10),
  min_order_cents: z.number().int().nonnegative(),
  max_order_cents: z.number().int().positive(),
  platform_fee_bps: z.number().int().min(0).max(10000),
  currency_default: z.string().min(3).max(6),
  terms_url: z.string().url().nullish(),
  refund_policy_url: z.string().url().nullish(),
  stripe_publishable_key_override: z.string().max(200).nullish(),
});

export const getCommerceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mobile_commerce_settings").select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateCommerceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => schema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");

    const { data: existing } = await context.supabase
      .from("mobile_commerce_settings").select("*").limit(1).maybeSingle();
    if (!existing) throw new Error("Commerce settings row missing");
    if (data.max_order_cents <= data.min_order_cents) throw new Error("max_order_cents must exceed min_order_cents");

    const { error } = await context.supabase.from("mobile_commerce_settings")
      .update({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() } as never)
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(error.message);

    await recordSettingsAudit({
      actorUserId: context.userId,
      settingsKey: "mobile_commerce",
      before: existing,
      after: { ...data, updated_by: context.userId },
    });
    return { ok: true };
  });