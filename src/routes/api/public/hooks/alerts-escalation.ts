import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/alerts-escalation")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Escalate open alerts older than 30 minutes to 'escalated'
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
          .from("grain_alerts")
          .update({ status: "escalated", updated_at: new Date().toISOString() })
          .in("status", ["pending", "acknowledged"])
          .lt("created_at", cutoff)
          .select("id");

        if (error) {
          console.error("alerts-escalation error:", error);
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, escalated: data?.length ?? 0, at: new Date().toISOString() }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});