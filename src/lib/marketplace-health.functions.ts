/**
 * Phase 15 — Super-admin marketplace health snapshot.
 * All thresholds and windows come from platform_settings.marketplace.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { computeScore } from "@/lib/reputation.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const getMarketplaceHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");
    const settings = await loadMarketplaceSettings(context.supabase);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;

    const [listingsRes, ordersRes, disputesRes, refundsRes, reputationRes, reviewsRes] =
      await Promise.all([
        sb.from("grain_listings").select("id, status, created_at").gte("created_at", since),
        sb
          .from("buyer_orders")
          .select("id, status, subtotal, currency, created_at, cancellation_reason, admin_id")
          .gte("created_at", since),
        sb
          .from("buyer_disputes")
          .select("id, category, status, created_at")
          .gte("created_at", since),
        sb
          .from("buyer_refunds")
          .select("id, amount, currency, reason_code, status, created_at")
          .gte("created_at", since),
        sb.from("seller_reputation").select("*"),
        sb
          .from("buyer_reviews")
          .select("id, order_id, status, created_at")
          .gte("created_at", since),
      ]);

    const listings = (listingsRes.data ?? []) as Row[];
    const orders = (ordersRes.data ?? []) as Row[];
    const disputes = (disputesRes.data ?? []) as Row[];
    const refunds = (refundsRes.data ?? []) as Row[];
    const reputation = (reputationRes.data ?? []) as Row[];
    const reviews = (reviewsRes.data ?? []) as Row[];

    const gmv = orders
      .filter((o) => ["paid", "dispatched", "completed"].includes(o.status))
      .reduce((s, o) => s + Number(o.subtotal || 0), 0);
    const refundedTotal = refunds
      .filter((r) => r.status === "succeeded")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    const funnel = {
      listingsCreated: listings.length,
      ordersPlaced: orders.length,
      ordersPaid: orders.filter((o) => ["paid", "dispatched", "completed"].includes(o.status))
        .length,
      ordersDelivered: orders.filter((o) => o.status === "completed").length,
      ordersReviewed: new Set(reviews.map((r) => r.order_id)).size,
    };

    const cancelReasons = countBy(
      orders.filter((o) => o.status === "cancelled"),
      (o) => o.cancellation_reason || "unspecified",
    );
    const disputeCategories = countBy(disputes, (d) => d.category || "other");
    const refundReasons = countBy(refunds, (r) => r.reason_code || "unspecified");

    const sellersRanked = reputation.map((r) => {
      const score = computeScore(r, settings.reputation.weights);
      return {
        adminId: r.admin_id,
        score,
        disputeRate: Number(r.dispute_rate) || 0,
        avgRating: Number(r.avg_rating) || 0,
      };
    });
    const topSellers = [...sellersRanked].sort((a, b) => b.score - a.score).slice(0, 10);
    const worstByDisputes = [...sellersRanked]
      .sort((a, b) => b.disputeRate - a.disputeRate)
      .slice(0, 10);

    return {
      windowDays: data.days,
      currency: settings.currency,
      gmv,
      refundedTotal,
      netRevenue: gmv - refundedTotal,
      funnel,
      cancelReasons,
      disputeCategories,
      refundReasons,
      topSellers,
      worstByDisputes,
      verifiedThreshold: settings.reputation.verifiedMinScore,
    };
  });

function countBy<T>(rows: T[], key: (r: T) => string): Array<{ key: string; count: number }> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count);
}
