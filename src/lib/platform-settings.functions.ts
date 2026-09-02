import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IotPricingItem = {
  id: string; // e.g. "silo_standard"
  name: string; // e.g. "Standard Silo Kit"
  description: string;
  price_pkr: number; // unit price in PKR
  unit: string; // e.g. "per silo", "per sensor"
};

export type PlatformConfig = {
  maintenance_mode: boolean;
  feature_flags: Record<string, boolean>;
  default_thresholds: Record<string, number>;
  iot_pricing: IotPricingItem[];
};

const DEFAULT_IOT_PRICING: IotPricingItem[] = [
  {
    id: "silo_standard",
    name: "Standard Silo Kit",
    description: "Full silo hardware bundle — sensors + actuators",
    price_pkr: 2300000,
    unit: "per silo",
  },
  {
    id: "silo_premium",
    name: "Premium Silo Kit",
    description: "Premium bundle with extended sensor suite",
    price_pkr: 2800000,
    unit: "per silo",
  },
  {
    id: "sensor_add_on",
    name: "Sensor Add-on",
    description: "Additional sensor module for existing silo",
    price_pkr: 85000,
    unit: "per sensor",
  },
];

const DEFAULT_CONFIG: PlatformConfig = {
  maintenance_mode: false,
  feature_flags: {},
  default_thresholds: {},
  iot_pricing: DEFAULT_IOT_PRICING,
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
      iot_pricing: cfg.iot_pricing ?? DEFAULT_CONFIG.iot_pricing,
    };
  });

const iotPricingItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price_pkr: z.number().int().min(0),
  unit: z.string().min(1),
});

const configSchema = z.object({
  maintenance_mode: z.boolean(),
  feature_flags: z.record(z.string(), z.boolean()),
  default_thresholds: z.record(z.string(), z.number()),
  iot_pricing: z.array(iotPricingItemSchema),
});

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
