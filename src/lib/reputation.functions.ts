/**
 * Phase 15 — Seller reputation & badges.
 * Reads from the `seller_reputation` view and applies weights/badges
 * from platform_settings.marketplace.reputation so nothing is hardcoded.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import type { Database } from "@/integrations/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export interface ReputationBadge {
  key: string; label: string; minScore: number; colorToken: string;
}

export function computeScore(
  row: Row,
  weights: { rating: number; onTime: number; disputeFree: number; transitSpeed: number },
): number {
  const total = weights.rating + weights.onTime + weights.disputeFree + weights.transitSpeed || 1;
  const rating = (Number(row.avg_rating) || 0) / 5;
  const onTime = Number(row.on_time_rate) || 0;
  const disputeFree = 1 - Math.min(1, Number(row.dispute_rate) || 0);
  const hrs = Number(row.avg_transit_hours) || 0;
  const speed = hrs === 0 ? 0 : hrs <= 48 ? 1 : hrs <= 96 ? 0.6 : hrs <= 168 ? 0.3 : 0.1;
  const raw =
    rating * weights.rating +
    onTime * weights.onTime +
    disputeFree * weights.disputeFree +
    speed * weights.transitSpeed;
  return Math.round((raw / total) * 100);
}

function badgesFor(score: number, all: ReputationBadge[]): ReputationBadge[] {
  return all.filter((b) => score >= b.minScore).sort((a, b) => b.minScore - a.minScore);
}

async function loadSettingsPublic() {
  return loadMarketplaceSettings(publicClient());
}

export const getSellerReputation = createServerFn({ method: "GET" })
  .validator((d) => z.object({ adminId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (sb as any)
      .from("seller_reputation").select("*").eq("admin_id", data.adminId).maybeSingle();
    const settings = await loadSettingsPublic();
    if (!row) {
      return {
        adminId: data.adminId,
        stats: null,
        score: 0,
        badges: [],
        verified: false,
      };
    }
    const score = computeScore(row as Row, settings.reputation.weights);
    const badges = badgesFor(score, settings.reputation.badges);
    return {
      adminId: data.adminId,
      stats: row as Row,
      score,
      badges,
      verified: score >= settings.reputation.verifiedMinScore,
    };
  });

export const listSellerRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // Requires super_admin
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows } = await sb.from("seller_reputation").select("*").limit(data.limit);
    const list = (rows ?? []) as Row[];
    if (!list.length) return { sellers: [] };
    const settings = await loadMarketplaceSettings(context.supabase);
    const ids = list.map((r) => r.admin_id).filter(Boolean);
    const { data: profs } = await sb.from("profiles")
      .select("id, name, email, company_name, city, country").in("id", ids);
    const pMap = new Map<string, Row>();
    ((profs ?? []) as Row[]).forEach((p) => pMap.set(p.id, p));
    const sellers: Row[] = list.map((r) => {
      const score = computeScore(r, settings.reputation.weights);
      return {
        ...r,
        score,
        badges: badgesFor(score, settings.reputation.badges),
        verified: score >= settings.reputation.verifiedMinScore,
        profile: pMap.get(r.admin_id) ?? null,
      };
    });
    sellers.sort((a, b) => (b.score as number) - (a.score as number));
    return { sellers };
  });

/** Public storefront: seller header + reputation + published reviews + active listings. */
export const getPublicSellerStorefront = createServerFn({ method: "GET" })
  .validator((d) => z.object({ adminId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const settings = await loadSettingsPublic();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anon = sb as any;
    const [profRes, repRes, revRes, listRes] = await Promise.all([
      anon.from("profiles").select("id, name, company_name, city, country, business_type").eq("id", data.adminId).maybeSingle(),
      anon.from("seller_reputation").select("*").eq("admin_id", data.adminId).maybeSingle(),
      anon.from("buyer_reviews").select("id, rating, title, body, seller_response, seller_response_at, helpful_count, created_at")
        .eq("admin_id", data.adminId).eq("status", "published").eq("direction", "buyer_to_seller")
        .order("created_at", { ascending: false }).limit(20),
      anon.from("public_listings_v").select("*").eq("admin_id", data.adminId).limit(24),
    ]);
    const stats = (repRes.data ?? null) as Row | null;
    const score = stats ? computeScore(stats, settings.reputation.weights) : 0;
    return {
      seller: (profRes.data ?? null) as Row | null,
      reputation: {
        stats, score,
        badges: badgesFor(score, settings.reputation.badges),
        verified: score >= settings.reputation.verifiedMinScore,
      },
      reviews: (revRes.data ?? []) as Row[],
      listings: (listRes.data ?? []) as Row[],
      brand: {
        brandName: settings.brandName, tagline: settings.tagline, currency: settings.currency,
      },
    };
  });