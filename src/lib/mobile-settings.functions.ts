import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MobileSettingsShape = {
  min_build: number;
  latest_build: number;
  force_update_below: number;
  sync_page_size: number;
  max_sync_page_size: number;
  heartbeat_interval_seconds: number;
  uploads: Record<string, { bucket: string; max_mb: number; allowed_mime: string[] }>;
  feature_flags: Record<string, boolean>;
  deep_link: { scheme: string; universal_host: string };
};

export const DEFAULT_MOBILE_SETTINGS: MobileSettingsShape = {
  min_build: 1,
  latest_build: 1,
  force_update_below: 0,
  sync_page_size: 200,
  max_sync_page_size: 1000,
  heartbeat_interval_seconds: 300,
  uploads: {
    install_photo: {
      bucket: "insurance-attachments",
      max_mb: 10,
      allowed_mime: ["image/jpeg", "image/png"],
    },
  },
  feature_flags: {},
  deep_link: { scheme: "grainhero", universal_host: "app.grainhero.com" },
};

export const getMobileSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("platform_settings")
      .select("config")
      .eq("id", "singleton")
      .maybeSingle();
    const cfg = ((data?.config ?? {}) as Record<string, unknown>).mobile as
      | Partial<MobileSettingsShape>
      | undefined;
    return { settings: { ...DEFAULT_MOBILE_SETTINGS, ...(cfg ?? {}) } as MobileSettingsShape };
  });

const schema: z.ZodType<MobileSettingsShape> = z.object({
  min_build: z.number().int().nonnegative(),
  latest_build: z.number().int().nonnegative(),
  force_update_below: z.number().int().nonnegative(),
  sync_page_size: z.number().int().positive(),
  max_sync_page_size: z.number().int().positive(),
  heartbeat_interval_seconds: z.number().int().positive(),
  uploads: z.record(
    z.string(),
    z.object({
      bucket: z.string(),
      max_mb: z.number().positive(),
      allowed_mime: z.array(z.string()),
    }),
  ),
  feature_flags: z.record(z.string(), z.boolean()),
  deep_link: z.object({ scheme: z.string(), universal_host: z.string() }),
}) as z.ZodType<MobileSettingsShape>;

export const updateMobileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => schema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: existing } = await context.supabase
      .from("platform_settings")
      .select("config")
      .eq("id", "singleton")
      .maybeSingle();
    const cfg = (existing?.config ?? {}) as Record<string, unknown>;
    cfg.mobile = data;
    const { error } = await context.supabase
      .from("platform_settings")
      .upsert({ id: "singleton", config: cfg as never, updated_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });
