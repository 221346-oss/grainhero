import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";

const BODY = z.object({ device_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/v1/devices/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        let body: z.infer<typeof BODY>;
        try { body = BODY.parse(await request.json()); }
        catch (e) { return Response.json({ error: "invalid_body", detail: String(e) }, { status: 400 }); }
        const { error } = await ctx.supabase
          .from("mobile_devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", body.device_id)
          .eq("user_id", ctx.userId);
        if (error) return Response.json({ error: "db_error", detail: error.message }, { status: 500 });
        return Response.json({ data: { ok: true }, meta: { version: "v1" } });
      },
    },
  },
});
