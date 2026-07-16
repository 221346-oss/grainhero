import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { blockIfImpersonating } from "./impersonation-guard";

export type PlatformConfig = {
  maintenance_mode: boolean;
  feature_flags: Record<string, boolean>;
  default_thresholds: Record<string, number>;
};

const DEFAULT_CONFIG: PlatformConfig = {
  maintenance_mode: false,
  feature_flags: {},
  default_thresholds: {},
};

export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformConfig> => {
    const { data, error } = await context.supabase
      .from("platform_settings")
      .select("config")
      .eq("id", "singleton")
      .maybeSingle();
    if (error) throw error;
    const cfg = (data?.config ?? {}) as Partial<PlatformConfig>;
    return {
      maintenance_mode: cfg.maintenance_mode ?? DEFAULT_CONFIG.maintenance_mode,
      feature_flags: cfg.feature_flags ?? DEFAULT_CONFIG.feature_flags,
      default_thresholds: cfg.default_thresholds ?? DEFAULT_CONFIG.default_thresholds,
    };
  });

const configSchema = z.object({
  maintenance_mode: z.boolean(),
  feature_flags: z.record(z.string(), z.boolean()),
  default_thresholds: z.record(z.string(), z.number()),
});

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, blockIfImpersonating])
  .inputValidator((data) => configSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) {
      throw new Error("Forbidden");
    }
    const { error } = await context.supabase
      .from("platform_settings")
      .upsert({ id: "singleton", config: data, updated_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });