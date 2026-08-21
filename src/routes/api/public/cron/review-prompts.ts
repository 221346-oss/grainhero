/**
 * Phase 15 — Post-delivery review-prompt sweep.
 * Sends `reviewPromptBuyer` email for completed orders older than the
 * configured prompt delay that haven't been reviewed yet.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/review-prompts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (cronSecret && auth !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;
        const settings = await loadMarketplaceSettings(sb);
        if (!settings.reviews.enabled)
          return Response.json({ ok: true, skipped: "reviews disabled" });
        const delayMs = (settings.reviews.promptDelayHours ?? 24) * 3_600_000;
        const cutoff = new Date(Date.now() - delayMs).toISOString();
        const { data: orders } = await sb
          .from("buyer_orders")
          .select("id, order_number, admin_id, review_prompt_sent_at, delivered_at, status")
          .eq("status", "completed")
          .is("review_prompt_sent_at", null)
          .lte("delivered_at", cutoff)
          .limit(200);
        let sent = 0;
        let failed = 0;
        for (const o of (orders ?? []) as Array<{ id: string; admin_id: string }>) {
          // Skip if a buyer review already exists.
          const { data: existing } = await sb
            .from("buyer_reviews")
            .select("id")
            .eq("order_id", o.id)
            .eq("direction", "buyer_to_seller")
            .maybeSingle();
          if (existing) {
            await sb
              .from("buyer_orders")
              .update({ review_prompt_sent_at: new Date().toISOString() } as never)
              .eq("id", o.id);
            continue;
          }
          try {
            const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
            await sendBuyerOrderEmail(sb, o.id, "reviewPromptBuyer");
            await sb
              .from("buyer_orders")
              .update({ review_prompt_sent_at: new Date().toISOString() } as never)
              .eq("id", o.id);
            sent++;
          } catch (e) {
            console.warn("[review-prompts] email failed", (e as Error).message);
            failed++;
          }
        }
        return Response.json({ ok: true, sent, failed });
      },
    },
  },
});
