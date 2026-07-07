import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/expiry-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") || request.headers.get("authorization")?.replace("Bearer ", "");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!auth || !expected || auth !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runExpiryReminders } = await import("@/lib/expiry-reminders.server");
        try {
          const result = await runExpiryReminders();
          return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
