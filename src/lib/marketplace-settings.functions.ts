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
  emailSubjects: Record<string, string>;
  emailBodies: Record<string, string>;
  dispatch: {
    couriers: Array<{ key: string; label: string; trackingUrlTemplate: string }>;
    slaHours: { inTransit: number; outForDelivery: number; delivered: number };
    eventPresets: Array<{ code: string; label: string; setStatus?: string }>;
    alertCooldownMinutes: number;
    deliveryRateAlertDropPct: number;
    overdueGraceMinutes: number;
  };
  reviews: {
    enabled: boolean;
    autoPublish: boolean;
    minChars: number;
    promptDelayHours: number;
    showOnStorefront: boolean;
    minCountForAverage: number;
  };
  invoicing: {
    numberPrefix: string;
    footerNote: string;
    autoGenerateOnPaid: boolean;
    emailInvoiceOnPaid: boolean;
  };
  disputes: {
    enabled: boolean;
    windowDays: number;
    categories: Array<{ key: string; label: string }>;
    resolutions: Array<{ key: string; label: string; refund: "none" | "partial" | "full" }>;
  };
  refunds: {
    allowSellerInitiated: boolean;
    allowBuyerRequest: boolean;
    reasonCodes: Array<{ key: string; label: string }>;
    autoCancelUnpaidAfterHours: number;
  };
  reputation: {
    weights: { rating: number; onTime: number; disputeFree: number; transitSpeed: number };
    badges: Array<{ key: string; label: string; minScore: number; colorToken: string }>;
    verifiedMinScore: number;
  };
  reviewsPolicy: {
    autoPublishThreshold: number; // ratings STRICTLY BELOW this stay pending
    bannedPhrases: string[];
    sellerResponseWindowDays: number;
  };
  messaging: {
    enabled: boolean;
    attachmentsAllowed: boolean;
    autoModerationKeywords: string[];
    maxBodyChars: number;
  };
  returns: {
    enabled: boolean;
    windowDays: number;
    autoApproveHours: number;
    varianceThresholdPct: number;
    reasons: Array<{ key: string; label: string; refundEligible: boolean }>;
    resolutions: Array<{
      key: string;
      label: string;
      refund: "none" | "partial" | "full" | "replace";
    }>;
  };
  quality: {
    requiredForListings: boolean;
    certificateValidityDays: number;
    metrics: Array<{ key: string; label: string; unit: string; min?: number; max?: number }>;
  };
  logistics: {
    carriersEnabled: boolean;
    defaultPickupWindowHours: number;
    defaultDeliveryWindowHours: number;
    fuelCostPerLitre: number;
    driverPayoutPerKm: number;
    routeOptimizer: "nearest_neighbour" | "off";
    distanceProvider: "haversine" | "osrm";
    osrmBaseUrl: string;
    pollingIntervalMinutes: number;
    autoCloseAfterDeliveryHours: number;
    deliveryDelayGraceMinutes: number;
    licenseExpiryWarnDays: number[];
  };
  finance: {
    payoutSchedule: "manual" | "weekly" | "biweekly" | "monthly";
    payoutDay: number; // 0-6 for weekly, 1-31 for monthly
    minimumPayoutAmount: number;
    platformFeePct: number;
    holdPeriodDays: number;
    defaultCurrency: string;
    supportedCurrencies: string[];
    taxMode: "inclusive" | "exclusive";
    payoutMethods: Array<{ key: string; label: string; feePct: number; enabled: boolean }>;
    statementHeading: string;
    statementFooter: string;
    dailyDigestEnabled: boolean;
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
    invoiceReady: "Invoice for order {{orderNumber}}",
    disputeOpened: "Dispute opened on order {{orderNumber}}",
    disputeResolved: "Dispute resolved on order {{orderNumber}}",
    refundIssued: "Refund issued for order {{orderNumber}}",
    orderCancelled: "Order {{orderNumber}} cancelled",
    messageReceived: "New message on order {{orderNumber}}",
    returnRequested: "Return requested on order {{orderNumber}}",
    returnApproved: "Return approved for order {{orderNumber}}",
    returnDenied: "Return denied for order {{orderNumber}}",
    returnRefunded: "Refund issued for return on order {{orderNumber}}",
    qualityCertificateAdded: "Quality certificate added for batch {{batchId}}",
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
    invoiceReady:
      "Your invoice for order {{orderNumber}} is ready.\nDownload / view it here: {{trackingUrl}}",
    disputeOpened:
      "A dispute was opened on order {{orderNumber}}. We'll review and get back to you shortly.\n{{trackingUrl}}",
    disputeResolved:
      "The dispute on order {{orderNumber}} has been resolved. Details: {{trackingUrl}}",
    refundIssued:
      "A refund for order {{orderNumber}} has been issued. It should appear on your statement in a few business days.\n{{trackingUrl}}",
    orderCancelled:
      "Order {{orderNumber}} has been cancelled. If this was unexpected, contact support.\n{{trackingUrl}}",
    messageReceived:
      "You have a new message on order {{orderNumber}}. Read and reply here: {{trackingUrl}}",
    returnRequested:
      "A return has been requested on order {{orderNumber}} — reason: {{reason}}. Review it here: {{trackingUrl}}",
    returnApproved:
      "Your return request for order {{orderNumber}} was approved. Next steps: {{trackingUrl}}",
    returnDenied:
      "Your return request for order {{orderNumber}} was denied. Details: {{trackingUrl}}",
    returnRefunded:
      "A refund has been issued for your return on order {{orderNumber}}. It should appear in a few business days.\n{{trackingUrl}}",
    qualityCertificateAdded:
      "A new quality certificate was uploaded for batch {{batchId}}. View it here: {{trackingUrl}}",
  },
  dispatch: {
    couriers: [
      { key: "self", label: "Own fleet", trackingUrlTemplate: "" },
      {
        key: "tcs",
        label: "TCS",
        trackingUrlTemplate: "https://www.tcsexpress.com/track/{{trackingNumber}}",
      },
      {
        key: "leopards",
        label: "Leopards Courier",
        trackingUrlTemplate: "https://www.leopardscourier.com/tracking/{{trackingNumber}}",
      },
    ],
    slaHours: { inTransit: 48, outForDelivery: 12, delivered: 72 },
    eventPresets: [
      { code: "picked_up", label: "Picked up" },
      { code: "in_transit", label: "In transit", setStatus: "in_transit" },
      { code: "out_for_delivery", label: "Out for delivery", setStatus: "out_for_delivery" },
      { code: "delivered", label: "Delivered", setStatus: "delivered" },
      { code: "exception", label: "Exception", setStatus: "exception" },
    ],
    alertCooldownMinutes: 60,
    deliveryRateAlertDropPct: 5,
    overdueGraceMinutes: 30,
  },
  reviews: {
    enabled: true,
    autoPublish: false,
    minChars: 20,
    promptDelayHours: 24,
    showOnStorefront: true,
    minCountForAverage: 3,
  },
  invoicing: {
    numberPrefix: "INV",
    footerNote: "Thank you for your business.",
    autoGenerateOnPaid: true,
    emailInvoiceOnPaid: true,
  },
  disputes: {
    enabled: true,
    windowDays: 14,
    categories: [
      { key: "not_received", label: "Not received" },
      { key: "damaged", label: "Damaged on arrival" },
      { key: "quality", label: "Quality issue" },
      { key: "wrong_item", label: "Wrong item / quantity" },
      { key: "other", label: "Other" },
    ],
    resolutions: [
      { key: "refund_full", label: "Full refund", refund: "full" },
      { key: "refund_partial", label: "Partial refund", refund: "partial" },
      { key: "replacement", label: "Replacement / redispatch", refund: "none" },
      { key: "reject", label: "Reject claim", refund: "none" },
    ],
  },
  refunds: {
    allowSellerInitiated: true,
    allowBuyerRequest: true,
    reasonCodes: [
      { key: "requested_by_customer", label: "Requested by customer" },
      { key: "duplicate", label: "Duplicate charge" },
      { key: "fraudulent", label: "Fraudulent" },
      { key: "quality", label: "Quality issue" },
    ],
    autoCancelUnpaidAfterHours: 48,
  },
  reputation: {
    weights: { rating: 40, onTime: 30, disputeFree: 20, transitSpeed: 10 },
    badges: [
      { key: "verified", label: "Verified seller", minScore: 75, colorToken: "emerald" },
      { key: "top", label: "Top rated", minScore: 90, colorToken: "amber" },
      { key: "reliable", label: "Reliable delivery", minScore: 60, colorToken: "sky" },
    ],
    verifiedMinScore: 75,
  },
  reviewsPolicy: {
    autoPublishThreshold: 3,
    bannedPhrases: [],
    sellerResponseWindowDays: 30,
  },
  messaging: {
    enabled: true,
    attachmentsAllowed: true,
    autoModerationKeywords: [],
    maxBodyChars: 4000,
  },
  returns: {
    enabled: true,
    windowDays: 14,
    autoApproveHours: 72,
    varianceThresholdPct: 5,
    reasons: [
      { key: "quality_issue", label: "Quality issue", refundEligible: true },
      { key: "wrong_grain", label: "Wrong grain / grade", refundEligible: true },
      { key: "short_weight", label: "Short weight", refundEligible: true },
      { key: "damaged", label: "Damaged in transit", refundEligible: true },
      { key: "other", label: "Other", refundEligible: false },
    ],
    resolutions: [
      { key: "refund_full", label: "Full refund", refund: "full" },
      { key: "refund_partial", label: "Partial refund", refund: "partial" },
      { key: "replace", label: "Replace / redispatch", refund: "replace" },
      { key: "reject", label: "Reject", refund: "none" },
    ],
  },
  quality: {
    requiredForListings: false,
    certificateValidityDays: 90,
    metrics: [
      { key: "moisture", label: "Moisture", unit: "%", min: 0, max: 14 },
      { key: "purity", label: "Purity", unit: "%", min: 95 },
      { key: "foreign_matter", label: "Foreign matter", unit: "%", max: 2 },
    ],
  },
  logistics: {
    carriersEnabled: true,
    defaultPickupWindowHours: 24,
    defaultDeliveryWindowHours: 72,
    fuelCostPerLitre: 285,
    driverPayoutPerKm: 12,
    routeOptimizer: "nearest_neighbour",
    distanceProvider: "haversine",
    osrmBaseUrl: "",
    pollingIntervalMinutes: 60,
    autoCloseAfterDeliveryHours: 48,
    deliveryDelayGraceMinutes: 30,
    licenseExpiryWarnDays: [14, 7, 1],
  },
  finance: {
    payoutSchedule: "manual",
    payoutDay: 1,
    minimumPayoutAmount: 100,
    platformFeePct: 5,
    holdPeriodDays: 3,
    defaultCurrency: "USD",
    supportedCurrencies: ["USD"],
    taxMode: "exclusive",
    payoutMethods: [{ key: "bank_transfer", label: "Bank transfer", feePct: 0, enabled: true }],
    statementHeading: "Payout statement",
    statementFooter: "Thank you for selling on GrainHero Marketplace.",
    dailyDigestEnabled: true,
  },
};

export function mergeSettings(raw: unknown): MarketplaceSettings {
  const r = (raw ?? {}) as Partial<MarketplaceSettings>;
  return {
    ...DEFAULT_MARKETPLACE_SETTINGS,
    ...r,
    emailSubjects: { ...DEFAULT_MARKETPLACE_SETTINGS.emailSubjects, ...(r.emailSubjects ?? {}) },
    emailBodies: { ...DEFAULT_MARKETPLACE_SETTINGS.emailBodies, ...(r.emailBodies ?? {}) },
    dispatch: {
      ...DEFAULT_MARKETPLACE_SETTINGS.dispatch,
      ...(r.dispatch ?? {}),
      slaHours: {
        ...DEFAULT_MARKETPLACE_SETTINGS.dispatch.slaHours,
        ...(r.dispatch?.slaHours ?? {}),
      },
      couriers: r.dispatch?.couriers ?? DEFAULT_MARKETPLACE_SETTINGS.dispatch.couriers,
      eventPresets: r.dispatch?.eventPresets ?? DEFAULT_MARKETPLACE_SETTINGS.dispatch.eventPresets,
    },
    reviews: { ...DEFAULT_MARKETPLACE_SETTINGS.reviews, ...(r.reviews ?? {}) },
    invoicing: { ...DEFAULT_MARKETPLACE_SETTINGS.invoicing, ...(r.invoicing ?? {}) },
    disputes: {
      ...DEFAULT_MARKETPLACE_SETTINGS.disputes,
      ...(r.disputes ?? {}),
      categories: r.disputes?.categories ?? DEFAULT_MARKETPLACE_SETTINGS.disputes.categories,
      resolutions: r.disputes?.resolutions ?? DEFAULT_MARKETPLACE_SETTINGS.disputes.resolutions,
    },
    refunds: {
      ...DEFAULT_MARKETPLACE_SETTINGS.refunds,
      ...(r.refunds ?? {}),
      reasonCodes: r.refunds?.reasonCodes ?? DEFAULT_MARKETPLACE_SETTINGS.refunds.reasonCodes,
    },
    reputation: {
      ...DEFAULT_MARKETPLACE_SETTINGS.reputation,
      ...(r.reputation ?? {}),
      weights: {
        ...DEFAULT_MARKETPLACE_SETTINGS.reputation.weights,
        ...(r.reputation?.weights ?? {}),
      },
      badges: r.reputation?.badges ?? DEFAULT_MARKETPLACE_SETTINGS.reputation.badges,
    },
    reviewsPolicy: {
      ...DEFAULT_MARKETPLACE_SETTINGS.reviewsPolicy,
      ...(r.reviewsPolicy ?? {}),
      bannedPhrases:
        r.reviewsPolicy?.bannedPhrases ?? DEFAULT_MARKETPLACE_SETTINGS.reviewsPolicy.bannedPhrases,
    },
    messaging: {
      ...DEFAULT_MARKETPLACE_SETTINGS.messaging,
      ...(r.messaging ?? {}),
      autoModerationKeywords:
        r.messaging?.autoModerationKeywords ??
        DEFAULT_MARKETPLACE_SETTINGS.messaging.autoModerationKeywords,
    },
    returns: {
      ...DEFAULT_MARKETPLACE_SETTINGS.returns,
      ...(r.returns ?? {}),
      reasons: r.returns?.reasons ?? DEFAULT_MARKETPLACE_SETTINGS.returns.reasons,
      resolutions: r.returns?.resolutions ?? DEFAULT_MARKETPLACE_SETTINGS.returns.resolutions,
    },
    quality: {
      ...DEFAULT_MARKETPLACE_SETTINGS.quality,
      ...(r.quality ?? {}),
      metrics: r.quality?.metrics ?? DEFAULT_MARKETPLACE_SETTINGS.quality.metrics,
    },
    logistics: {
      ...DEFAULT_MARKETPLACE_SETTINGS.logistics,
      ...(r.logistics ?? {}),
      licenseExpiryWarnDays:
        r.logistics?.licenseExpiryWarnDays ??
        DEFAULT_MARKETPLACE_SETTINGS.logistics.licenseExpiryWarnDays,
    },
    finance: {
      ...DEFAULT_MARKETPLACE_SETTINGS.finance,
      ...(r.finance ?? {}),
      supportedCurrencies:
        r.finance?.supportedCurrencies ?? DEFAULT_MARKETPLACE_SETTINGS.finance.supportedCurrencies,
      payoutMethods: r.finance?.payoutMethods ?? DEFAULT_MARKETPLACE_SETTINGS.finance.payoutMethods,
    },
  };
}

export async function loadMarketplaceSettings(
  sb: SupabaseClient<Database>,
): Promise<MarketplaceSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any)
    .from("platform_settings")
    .select("config")
    .eq("id", "singleton")
    .maybeSingle();
  const cfg = (data?.config ?? {}) as Record<string, unknown>;
  return mergeSettings(cfg.marketplace);
}

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) =>
    vars[k] === undefined ? "" : String(vars[k]),
  );
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
  emailSubjects: z.record(z.string(), z.string().min(1)),
  emailBodies: z.record(z.string(), z.string().min(1)),
  dispatch: z.object({
    couriers: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.string().min(1),
          trackingUrlTemplate: z.string(),
        }),
      )
      .max(20),
    slaHours: z.object({
      inTransit: z.number().min(0).max(1000),
      outForDelivery: z.number().min(0).max(1000),
      delivered: z.number().min(0).max(2000),
    }),
    eventPresets: z
      .array(
        z.object({
          code: z.string().min(1),
          label: z.string().min(1),
          setStatus: z.string().optional(),
        }),
      )
      .max(20)
      .optional()
      .default([]),
    alertCooldownMinutes: z.number().int().min(0).max(1440).optional().default(60),
    deliveryRateAlertDropPct: z.number().min(0).max(100).optional().default(5),
    overdueGraceMinutes: z.number().int().min(0).max(2000).optional().default(30),
  }),
  reviews: z.object({
    enabled: z.boolean(),
    autoPublish: z.boolean(),
    minChars: z.number().int().min(0).max(2000),
    promptDelayHours: z.number().int().min(0).max(720),
    showOnStorefront: z.boolean(),
    minCountForAverage: z.number().int().min(0).max(100),
  }),
  invoicing: z.object({
    numberPrefix: z.string().min(1).max(10),
    footerNote: z.string().max(500),
    autoGenerateOnPaid: z.boolean(),
    emailInvoiceOnPaid: z.boolean(),
  }),
  disputes: z.object({
    enabled: z.boolean(),
    windowDays: z.number().int().min(0).max(365),
    categories: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) })).max(30),
    resolutions: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.string().min(1),
          refund: z.enum(["none", "partial", "full"]),
        }),
      )
      .max(30),
  }),
  refunds: z.object({
    allowSellerInitiated: z.boolean(),
    allowBuyerRequest: z.boolean(),
    reasonCodes: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) })).max(30),
    autoCancelUnpaidAfterHours: z.number().int().min(0).max(720),
  }),
  reputation: z
    .object({
      weights: z.object({
        rating: z.number().min(0).max(100),
        onTime: z.number().min(0).max(100),
        disputeFree: z.number().min(0).max(100),
        transitSpeed: z.number().min(0).max(100),
      }),
      badges: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            minScore: z.number().min(0).max(100),
            colorToken: z.string().min(1),
          }),
        )
        .max(20),
      verifiedMinScore: z.number().min(0).max(100),
    })
    .optional()
    .default({
      weights: { rating: 40, onTime: 30, disputeFree: 20, transitSpeed: 10 },
      badges: [],
      verifiedMinScore: 75,
    }),
  reviewsPolicy: z
    .object({
      autoPublishThreshold: z.number().int().min(1).max(5),
      bannedPhrases: z.array(z.string()).max(200),
      sellerResponseWindowDays: z.number().int().min(0).max(365),
    })
    .optional()
    .default({ autoPublishThreshold: 3, bannedPhrases: [], sellerResponseWindowDays: 30 }),
  messaging: z
    .object({
      enabled: z.boolean(),
      attachmentsAllowed: z.boolean(),
      autoModerationKeywords: z.array(z.string()).max(200),
      maxBodyChars: z.number().int().min(100).max(20000),
    })
    .optional()
    .default({
      enabled: true,
      attachmentsAllowed: true,
      autoModerationKeywords: [],
      maxBodyChars: 4000,
    }),
  returns: z
    .object({
      enabled: z.boolean(),
      windowDays: z.number().int().min(0).max(365),
      autoApproveHours: z.number().int().min(0).max(2000),
      varianceThresholdPct: z.number().min(0).max(100),
      reasons: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            refundEligible: z.boolean(),
          }),
        )
        .max(30),
      resolutions: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            refund: z.enum(["none", "partial", "full", "replace"]),
          }),
        )
        .max(30),
    })
    .optional()
    .default({
      enabled: true,
      windowDays: 14,
      autoApproveHours: 72,
      varianceThresholdPct: 5,
      reasons: [],
      resolutions: [],
    }),
  quality: z
    .object({
      requiredForListings: z.boolean(),
      certificateValidityDays: z.number().int().min(0).max(3650),
      metrics: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            unit: z.string().max(20),
            min: z.number().optional(),
            max: z.number().optional(),
          }),
        )
        .max(30),
    })
    .optional()
    .default({ requiredForListings: false, certificateValidityDays: 90, metrics: [] }),
  logistics: z
    .object({
      carriersEnabled: z.boolean(),
      defaultPickupWindowHours: z.number().int().min(0).max(720),
      defaultDeliveryWindowHours: z.number().int().min(0).max(2000),
      fuelCostPerLitre: z.number().min(0),
      driverPayoutPerKm: z.number().min(0),
      routeOptimizer: z.enum(["nearest_neighbour", "off"]),
      distanceProvider: z.enum(["haversine", "osrm"]),
      osrmBaseUrl: z.string().max(300),
      pollingIntervalMinutes: z.number().int().min(5).max(1440),
      autoCloseAfterDeliveryHours: z.number().int().min(0).max(2000),
      deliveryDelayGraceMinutes: z.number().int().min(0).max(2000),
      licenseExpiryWarnDays: z.array(z.number().int().min(0).max(365)).max(10),
    })
    .optional()
    .default({
      carriersEnabled: true,
      defaultPickupWindowHours: 24,
      defaultDeliveryWindowHours: 72,
      fuelCostPerLitre: 285,
      driverPayoutPerKm: 12,
      routeOptimizer: "nearest_neighbour",
      distanceProvider: "haversine",
      osrmBaseUrl: "",
      pollingIntervalMinutes: 60,
      autoCloseAfterDeliveryHours: 48,
      deliveryDelayGraceMinutes: 30,
      licenseExpiryWarnDays: [14, 7, 1],
    }),
  finance: z
    .object({
      payoutSchedule: z.enum(["manual", "weekly", "biweekly", "monthly"]),
      payoutDay: z.number().int().min(0).max(31),
      minimumPayoutAmount: z.number().min(0),
      platformFeePct: z.number().min(0).max(100),
      holdPeriodDays: z.number().int().min(0).max(365),
      defaultCurrency: z.string().length(3),
      supportedCurrencies: z.array(z.string().length(3)).min(1).max(20),
      taxMode: z.enum(["inclusive", "exclusive"]),
      payoutMethods: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            feePct: z.number().min(0).max(100),
            enabled: z.boolean(),
          }),
        )
        .max(10),
      statementHeading: z.string().max(200),
      statementFooter: z.string().max(500),
      dailyDigestEnabled: z.boolean(),
    })
    .optional()
    .default({
      payoutSchedule: "manual",
      payoutDay: 1,
      minimumPayoutAmount: 100,
      platformFeePct: 5,
      holdPeriodDays: 3,
      defaultCurrency: "USD",
      supportedCurrencies: ["USD"],
      taxMode: "exclusive",
      payoutMethods: [{ key: "bank_transfer", label: "Bank transfer", feePct: 0, enabled: true }],
      statementHeading: "Payout statement",
      statementFooter: "Thank you for selling on GrainHero Marketplace.",
      dailyDigestEnabled: true,
    }),
});

export const updateMarketplaceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => SCHEMA.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row } = await sb
      .from("platform_settings")
      .select("config")
      .eq("id", "singleton")
      .maybeSingle();
    const cfg = { ...(row?.config ?? {}), marketplace: data };
    const { error } = await sb.from("platform_settings").upsert({
      id: "singleton",
      config: cfg,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
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
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
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
