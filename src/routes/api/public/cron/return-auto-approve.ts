import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 16 — Auto-approve returns older than the configured window.
 * Scheduled via pg_cron; secured by `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/return-auto-approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const apikey = request.headers.get("apikey") ?? "";
        if (!anon || apikey !== anon) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = await loadMarketplaceSettings(supabaseAdmin as any);
        if (!settings.returns.enabled || settings.returns.autoApproveHours <= 0) {
          return Response.json({ ok: true, processed: 0, skipped: "disabled" });
        }
        const cutoff = new Date(Date.now() - settings.returns.autoApproveHours * 3600_000).toISOString();
        const defaultResolution = settings.returns.resolutions[0]?.key ?? "refund_full";

        const { data: rows } = await supabaseAdmin.from("buyer_returns")
          .select("id, admin_id, status, created_at, order_id")
          .eq("status", "requested")
          .lt("created_at", cutoff)
          .limit(50);

        let processed = 0;
        for (const r of (rows ?? []) as Array<{ id: string; admin_id: string; order_id: string; status: string }>) {
          await supabaseAdmin.from("buyer_returns").update({
            status: "approved", resolution: defaultResolution,
          } as never).eq("id", r.id);
          await supabaseAdmin.from("buyer_return_events").insert({
            return_id: r.id, from_state: r.status, to_state: "approved",
            actor_user_id: null, actor_role: "system",
            note: `Auto-approved after ${settings.returns.autoApproveHours}h`,
          } as never);
          processed += 1;
        }
        return Response.json({ ok: true, processed, cutoff });
      },
    },
  },
});