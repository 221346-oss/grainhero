import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordSettingsAudit } from "./settings-audit.server";

const schema = z.object({
  hero_headline: z.string().min(1).max(160),
  hero_subheadline: z.string().min(1).max(280),
  featured_commodities: z.array(z.string().min(1)).min(1).max(20),
  min_app_build: z.number().int().nonnegative(),
  kill_switch: z.boolean(),
  kill_switch_message: z.string().max(500).nullish(),
  allowed_attachment_types: z.array(z.string()).min(1),
  max_message_length: z.number().int().positive().max(20000),
  moderation_banner: z.string().max(500).nullish(),
});

export const getMarketplaceMobileSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mobile_marketplace_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateMarketplaceMobileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => schema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: before } = await context.supabase
      .from("mobile_marketplace_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const { error } = await context.supabase
      .from("mobile_marketplace_settings")
      .update({ ...data, updated_by: context.userId } as never)
      .eq("id", true);
    if (error) throw new Error(error.message);
    await recordSettingsAudit({
      actorUserId: context.userId,
      settingsKey: "mobile_marketplace",
      before,
      after: { ...data, updated_by: context.userId },
    });
    return { ok: true };
  });

export const listSettingsAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        settings_key: z.string().min(1),
        limit: z.number().int().positive().max(200).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: rows, error } = await context.supabase
      .from("platform_settings_audit")
      .select("*")
      .eq("settings_key", data.settings_key)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
