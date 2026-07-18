import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public marketplace sync — no auth required. Uses publishable key.
export const Route = createFileRoute("/api/public/v1/sync/marketplace")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return Response.json({ error: "server_misconfigured" }, { status: 500 });
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false },
          global: { fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          } },
        });
        const u = new URL(request.url);
        const since = u.searchParams.get("since");
        const limit = Math.min(Math.max(1, Number(u.searchParams.get("limit")) || 100), 500);
        let q = supabase.from("mobile_marketplace_v").select("*")
          .order("updated_at", { ascending: true }).limit(limit + 1);
        if (since) q = q.gt("updated_at", since);
        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const rows = data ?? [];
        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;
        return Response.json({
          data: page,
          meta: {
            server_time: new Date().toISOString(),
            cursor: page.length ? (page[page.length - 1] as { updated_at?: string }).updated_at ?? null : since,
            has_more: hasMore, page_size: limit, version: "v1",
          },
        });
      },
    },
  },
});