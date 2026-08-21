/**
 * Phase 13 — Two-way marketplace reviews.
 * All moderation policy is read from platform_settings.reviews.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

type Row = Record<string, any>;

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        direction: z.enum(["buyer_to_seller", "seller_to_buyer"]),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(160).optional().nullable(),
        body: z.string().max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.reviews.enabled) throw new Error("Reviews are disabled");
    if (data.body.length < settings.reviews.minChars) {
      throw new Error(`Review must be at least ${settings.reviews.minChars} characters`);
    }

    const sb = context.supabase as any;
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, buyer_account_id, status")
      .eq("id", data.orderId)
      .single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (o.status !== "completed") throw new Error("Reviews only allowed after delivery");

    // Reviewer must be participant on the correct side.
    if (data.direction === "buyer_to_seller") {
      const { data: acc } = await sb
        .from("buyer_accounts")
        .select("user_id")
        .eq("id", o.buyer_account_id)
        .maybeSingle();
      if ((acc as Row | null)?.user_id !== context.userId) throw new Error("Forbidden");
    } else {
      const { data: prof } = await sb
        .from("profiles")
        .select("id, admin_id")
        .eq("id", context.userId)
        .maybeSingle();
      const tenantId = (prof as Row | null)?.admin_id ?? context.userId;
      if (tenantId !== o.admin_id) throw new Error("Forbidden");
    }

    // Auto-moderation: banned phrases + rating threshold.
    const bodyLc = data.body.toLowerCase();
    const banned = (settings.reviewsPolicy?.bannedPhrases ?? []).some(
      (p) => p && bodyLc.includes(p.toLowerCase()),
    );
    const belowThreshold = data.rating < (settings.reviewsPolicy?.autoPublishThreshold ?? 3);
    const status =
      banned || belowThreshold ? "pending" : settings.reviews.autoPublish ? "published" : "pending";
    const { error } = await sb.from("buyer_reviews").upsert(
      {
        order_id: data.orderId,
        admin_id: o.admin_id,
        buyer_account_id: o.buyer_account_id,
        reviewer_user_id: context.userId,
        direction: data.direction,
        rating: data.rating,
        title: data.title ?? null,
        body: data.body,
        status,
      } as never,
      { onConflict: "order_id,direction" },
    );
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: o.admin_id as string,
      action: `review.${data.direction}`,
      targetType: "buyer_order",
      targetId: data.orderId,
      meta: { rating: data.rating, status },
    });
    return { ok: true, status };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        reviewId: z.string().uuid(),
        decision: z.enum(["published", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");

    const sb = context.supabase as any;
    const { error } = await sb
      .from("buyer_reviews")
      .update({
        status: data.decision,
        moderated_by: context.userId,
        moderated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.reviewId);
    if (error) throw error;
    return { ok: true };
  });

export const listReviewsForModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");

    const sb = context.supabase as any;
    const { data } = await sb
      .from("buyer_reviews")
      .select("id, order_id, direction, rating, title, body, status, reviewer_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
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
    const { data: rows } = await sb
      .from("buyer_reviews")
      .select("id, rating, title, body, created_at, direction")
      .eq("admin_id", data.adminId)
      .eq("status", "published")
      .eq("direction", "buyer_to_seller")
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (rows ?? []) as Row[];
    const avg = list.length ? list.reduce((a, r) => a + Number(r.rating), 0) / list.length : null;
    return { reviews: list, average: avg, count: list.length };
  });

/** Seller responds to a review (once, within the configured window). */
export const respondToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        reviewId: z.string().uuid(),
        response: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);

    const sb = context.supabase as any;
    const { data: r } = await sb
      .from("buyer_reviews")
      .select("id, admin_id, seller_response, seller_response_at, created_at")
      .eq("id", data.reviewId)
      .maybeSingle();
    const row = r as Row | null;
    if (!row) throw new Error("Review not found");
    // Caller must be tenant admin of the review.
    const { data: prof } = await sb
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = (prof as Row | null)?.admin_id ?? context.userId;
    if (tenantId !== row.admin_id) throw new Error("Forbidden");
    if (row.seller_response) throw new Error("Response already posted");
    const windowMs = (settings.reviewsPolicy?.sellerResponseWindowDays ?? 30) * 86400000;
    if (Date.now() - new Date(row.created_at as string).getTime() > windowMs) {
      throw new Error("Response window closed");
    }
    const { error } = await sb
      .from("buyer_reviews")
      .update({
        seller_response: data.response,
        seller_response_at: new Date().toISOString(),
      } as never)
      .eq("id", data.reviewId);
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      tenantAdminId: row.admin_id as string,
      action: "review.responded",
      targetType: "buyer_review",
      targetId: row.id as string,
    });
    return { ok: true };
  });

/** Buyer marks a review as helpful (idempotent). */
export const markReviewHelpful = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ reviewId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: acc } = await sb
      .from("buyer_accounts")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const account = acc as Row | null;
    if (!account) throw new Error("Buyer account required");
    const { error } = await sb.from("buyer_review_helpful").insert({
      review_id: data.reviewId,
      buyer_account_id: account.id,
    } as never);
    // ignore unique-violation as idempotent
    if (error && !String(error.message).match(/duplicate|unique/i)) throw error;
    // Recount and stamp
    const { count } = await sb
      .from("buyer_review_helpful")
      .select("id", { count: "exact", head: true })
      .eq("review_id", data.reviewId);
    await sb
      .from("buyer_reviews")
      .update({ helpful_count: count ?? 0 } as never)
      .eq("id", data.reviewId);
    return { ok: true, helpful: count ?? 0 };
  });

/** Anyone signed in can report a review; flags it for super-admin. */
export const reportReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        reviewId: z.string().uuid(),
        reason: z.string().min(3).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb
      .from("buyer_reviews")
      .update({
        reported_at: new Date().toISOString(),
        reported_reason: data.reason,
      } as never)
      .eq("id", data.reviewId);
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      action: "review.reported",
      targetType: "buyer_review",
      targetId: data.reviewId,
      meta: { reason: data.reason },
    });
    return { ok: true };
  });
