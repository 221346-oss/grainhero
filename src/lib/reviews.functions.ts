/**
 * Phase 13 — Two-way marketplace reviews.
 * All moderation policy is read from platform_settings.reviews.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    orderId: z.string().uuid(),
    direction: z.enum(["buyer_to_seller","seller_to_buyer"]),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(160).optional().nullable(),
    body: z.string().max(4000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.reviews.enabled) throw new Error("Reviews are disabled");
    if (data.body.length < settings.reviews.minChars) {
      throw new Error(`Review must be at least ${settings.reviews.minChars} characters`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: order } = await sb.from("buyer_orders")
      .select("id, admin_id, buyer_account_id, status").eq("id", data.orderId).single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (o.status !== "completed") throw new Error("Reviews only allowed after delivery");

    // Reviewer must be participant on the correct side.
    if (data.direction === "buyer_to_seller") {
      const { data: acc } = await sb.from("buyer_accounts")
        .select("user_id").eq("id", o.buyer_account_id).maybeSingle();
      if ((acc as Row | null)?.user_id !== context.userId) throw new Error("Forbidden");
    } else {
      const { data: prof } = await sb.from("profiles")
        .select("id, admin_id").eq("id", context.userId).maybeSingle();
      const tenantId = (prof as Row | null)?.admin_id ?? context.userId;
      if (tenantId !== o.admin_id) throw new Error("Forbidden");
    }

    // Auto-moderation: banned phrases + rating threshold.
    const bodyLc = data.body.toLowerCase();
    const banned = (settings.reviewsPolicy?.bannedPhrases ?? [])
      .some((p) => p && bodyLc.includes(p.toLowerCase()));
    const belowThreshold = data.rating < (settings.reviewsPolicy?.autoPublishThreshold ?? 3);
    const status = banned || belowThreshold
      ? "pending"
      : (settings.reviews.autoPublish ? "published" : "pending");
    const { error } = await sb.from("buyer_reviews").upsert({
      order_id: data.orderId, admin_id: o.admin_id,
      buyer_account_id: o.buyer_account_id,
      reviewer_user_id: context.userId,
      direction: data.direction, rating: data.rating,
      title: data.title ?? null, body: data.body,
      status,
    } as never, { onConflict: "order_id,direction" });
    if (error) throw error;

    await logActivity({
      actorId: context.userId, tenantAdminId: o.admin_id as string,
      action: `review.${data.direction}`, targetType: "buyer_order", targetId: data.orderId,
      meta: { rating: data.rating, status },
    });
    return { ok: true, status };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    reviewId: z.string().uuid(),
    decision: z.enum(["published","rejected"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("buyer_reviews").update({
      status: data.decision, moderated_by: context.userId,
      moderated_at: new Date().toISOString(),
    } as never).eq("id", data.reviewId);
    if (error) throw error;
    return { ok: true };
  });

export const listReviewsForModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data } = await sb.from("buyer_reviews")
      .select("id, order_id, direction, rating, title, body, status, reviewer_user_id, created_at")
      .order("created_at", { ascending: false }).limit(200);
    return { reviews: (data ?? []) as Row[] };
  });

export const listPublishedReviewsForSeller = createServerFn({ method: "GET" })
  .validator((d) => z.object({ adminId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const { data: rows } = await sb.from("buyer_reviews")
      .select("id, rating, title, body, created_at, direction")
      .eq("admin_id", data.adminId).eq("status", "published")
      .eq("direction", "buyer_to_seller")
      .order("created_at", { ascending: false }).limit(20);
    const list = (rows ?? []) as Row[];
    const avg = list.length ? list.reduce((a, r) => a + Number(r.rating), 0) / list.length : null;
    return { reviews: list, average: avg, count: list.length };
  });