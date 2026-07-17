/**
 * Phase 12 — Marketplace / buyer-comms settings.
 * Single source of truth for storefront branding, buyer email copy, and
 * checkout messaging. Managed by super-admins via /platform/marketplace-settings.
 *
 * All values are read from `platform_settings.config.marketplace` (jsonb),
 * so nothing here is hardcoded — every string is customisable at runtime.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface MarketplaceSettings {
  brandName: string;
  tagline: string;
  supportEmail: string;
  fromEmail: string;
  currency: string;
  storefrontEnabled: boolean;
  showBrandBanner: boolean;
  emailSubjects: {
    placed: string;
    paymentSucceeded: string;
    paymentFailed: string;
    dispatched: string;
    outForDelivery: string;
    delivered: string;
    exception: string;
    reviewPromptBuyer: string;
    reviewPromptSeller: string;
  };
  emailBodies: {
    placed: string;
    paymentSucceeded: string;
    paymentFailed: string;
    dispatched: string;
    outForDelivery: string;
    delivered: string;
    exception: string;
    reviewPromptBuyer: string;
    reviewPromptSeller: string;
  };
  dispatch: {
    couriers: Array<{ key: string; label: string; trackingUrlTemplate: string }>;
    slaHours: { inTransit: number; outForDelivery: number; delivered: number };
  };
  reviews: {
    enabled: boolean;
    autoPublish: boolean;
    minChars: number;
    promptDelayHours: number;
    showOnStorefront: boolean;
    minCountForAverage: number;
  };
}

export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  brandName: "GrainHero Marketplace",
  tagline: "Sensor-verified grain, direct from monitored warehouses.",
  supportEmail: "support@grainhero.app",
  fromEmail: "GrainHero <onboarding@resend.dev>",
  currency: "USD",
  storefrontEnabled: true,
  showBrandBanner: true,
  emailSubjects: {
    placed: "Order {{orderNumber}} received",
    paymentSucceeded: "Payment confirmed — order {{orderNumber}}",
    paymentFailed: "Payment issue on order {{orderNumber}}",
    dispatched: "Order {{orderNumber}} is on its way",
    outForDelivery: "Out for delivery — order {{orderNumber}}",
    delivered: "Delivered — order {{orderNumber}}",
    exception: "Delivery update needed for order {{orderNumber}}",
    reviewPromptBuyer: "How was your order {{orderNumber}}?",
    reviewPromptSeller: "Rate the buyer for order {{orderNumber}}",
  },
  emailBodies: {
    placed:
      "Hi,\n\nThanks for your order of {{quantityKg}} kg of {{listingTitle}} ({{currency}} {{subtotal}}).\nWe'll confirm shipment as soon as payment clears.\n\nTrack it: {{trackingUrl}}",
    paymentSucceeded:
      "Great news — your payment for order {{orderNumber}} was received.\nWe'll notify you the moment the batch is dispatched.\n\nTrack: {{trackingUrl}}",
    paymentFailed:
      "Your payment for order {{orderNumber}} could not be completed.\nPlease retry from your order page: {{trackingUrl}}",
    dispatched:
      "Your order {{orderNumber}} has been dispatched. Expected arrival details will follow.\n\nTrack: {{trackingUrl}}",
    outForDelivery:
      "Your order {{orderNumber}} is out for delivery today.\n\nTrack: {{trackingUrl}}",
    delivered:
      "Your order {{orderNumber}} was marked delivered. Thanks for shopping with us!\n\nLeave a review: {{trackingUrl}}",
    exception:
      "There's a delivery exception on order {{orderNumber}}. We're looking into it — details on your order page: {{trackingUrl}}",
    reviewPromptBuyer:
      "Order {{orderNumber}} is complete. Tell other buyers how it went — it takes a minute: {{trackingUrl}}",
    reviewPromptSeller:
      "Order {{orderNumber}} is complete. Rate the buyer to help future sellers: {{trackingUrl}}",
  },
  dispatch: {
    couriers: [
      { key: "self", label: "Own fleet", trackingUrlTemplate: "" },
      { key: "tcs", label: "TCS", trackingUrlTemplate: "https://www.tcsexpress.com/track/{{trackingNumber}}" },
      { key: "leopards", label: "Leopards Courier", trackingUrlTemplate: "https://www.leopardscourier.com/tracking/{{trackingNumber}}" },
    ],
    slaHours: { inTransit: 48, outForDelivery: 12, delivered: 72 },
  },
  reviews: {
    enabled: true,
    autoPublish: false,
    minChars: 20,
    promptDelayHours: 24,
    showOnStorefront: true,
    minCountForAverage: 3,
  },
};

export function mergeSettings(raw: unknown): MarketplaceSettings {
  const r = (raw ?? {}) as Partial<MarketplaceSettings>;
  return {
    ...DEFAULT_MARKETPLACE_SETTINGS,
    ...r,
    emailSubjects: { ...DEFAULT_MARKETPLACE_SETTINGS.emailSubjects, ...(r.emailSubjects ?? {}) },
    emailBodies: { ...DEFAULT_MARKETPLACE_SETTINGS.emailBodies, ...(r.emailBodies ?? {}) },
  };
}

export async function loadMarketplaceSettings(
  sb: SupabaseClient<Database>,
): Promise<MarketplaceSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any)
    .from("platform_settings").select("config").eq("id", "singleton").maybeSingle();
  const cfg = (data?.config ?? {}) as Record<string, unknown>;
  return mergeSettings(cfg.marketplace);
}

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) =>
    vars[k] === undefined ? "" : String(vars[k]));
}

export const getMarketplaceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { settings: await loadMarketplaceSettings(context.supabase) };
  });

const SCHEMA = z.object({
  brandName: z.string().min(1).max(120),
  tagline: z.string().max(240),
  supportEmail: z.string().email(),
  fromEmail: z.string().min(3).max(200),
  currency: z.string().length(3),
  storefrontEnabled: z.boolean(),
  showBrandBanner: z.boolean(),
  emailSubjects: z.object({
    placed: z.string().min(1),
    paymentSucceeded: z.string().min(1),
    paymentFailed: z.string().min(1),
    dispatched: z.string().min(1),
  }),
  emailBodies: z.object({
    placed: z.string().min(1),
    paymentSucceeded: z.string().min(1),
    paymentFailed: z.string().min(1),
    dispatched: z.string().min(1),
  }),
});

export const updateMarketplaceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => SCHEMA.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row } = await sb.from("platform_settings").select("config").eq("id", "singleton").maybeSingle();
    const cfg = { ...(row?.config ?? {}), marketplace: data };
    const { error } = await sb.from("platform_settings").upsert({
      id: "singleton", config: cfg, updated_by: context.userId, updated_at: new Date().toISOString(),
    } as never);
    if (error) throw error;
    return { ok: true };
  });

// Public read for storefront chrome — no auth required.
export const getPublicMarketplaceBranding = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
  const s = await loadMarketplaceSettings(sb);
  return {
    brandName: s.brandName,
    tagline: s.tagline,
    supportEmail: s.supportEmail,
    storefrontEnabled: s.storefrontEnabled,
    showBrandBanner: s.showBrandBanner,
    currency: s.currency,
  };
});