/**
 * Phase 12 — Public marketplace reads (no auth).
 * Uses server publishable client with the `public_listings_v` view.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const FILTER = z.object({
  grainType: z.string().optional(),
  maxPricePerKg: z.number().positive().optional(),
  region: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(48),
});

export const listPublicListings = createServerFn({ method: "GET" })
  .validator((d: unknown) => FILTER.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (sb as any).from("public_listings_v").select("*").limit(data.limit);
    if (data.grainType) q = q.eq("grain_type", data.grainType);
    if (data.maxPricePerKg !== undefined) q = q.lte("price_per_kg", data.maxPricePerKg);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    let listings = (rows ?? []) as Row[];
    if (data.region) {
      const r = data.region.toLowerCase();
      listings = listings.filter((l) => {
        const loc = l.warehouse_location ?? {};
        const hay = JSON.stringify(loc).toLowerCase();
        return hay.includes(r);
      });
    }
    return { listings };
  });

export const getPublicListing = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (sb as any)
      .from("public_listings_v").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Listing not found");
    return { listing: row as Row };
  });