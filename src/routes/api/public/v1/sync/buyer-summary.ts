import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";

export const Route = createFileRoute("/api/public/v1/sync/buyer-summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const { data, error } = await ctx.supabase
          .from("mobile_buyer_summary_v")
          .select("*")
          .eq("buyer_user_id", ctx.userId)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({
          data: data ?? {
            buyer_user_id: ctx.userId, active_orders: 0, in_flight_orders: 0,
            unread_messages: 0, updated_at: null,
          },
          meta: { server_time: new Date().toISOString(), version: "v1" },
        });
      },
    },
  },
});