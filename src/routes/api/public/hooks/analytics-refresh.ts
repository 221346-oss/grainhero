/**
 * Phase 21 — Warehouse refresh cron webhook.
 * Called every 15 minutes by pg_cron. Auth via Supabase anon apikey header.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/analytics-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const url = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (admin as any).schema("analytics").rpc("refresh_all");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, ran_at: new Date().toISOString(), data }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
