import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile, getIdempotent, saveIdempotent } from "@/lib/mobile-auth.server";

const BODY = z.object({ alert_id: z.string().uuid(), note: z.string().max(500).optional() });
const ENDPOINT = "v1/actions/ack-alert";

export const Route = createFileRoute("/api/public/v1/actions/ack-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const idem = request.headers.get("idempotency-key");
        const cached = await getIdempotent(ctx.supabase, ctx.userId, idem, ENDPOINT);
        if (cached) return Response.json(cached);
        let body: z.infer<typeof BODY>;
        try { body = BODY.parse(await request.json()); }
        catch (e) { return Response.json({ error: "invalid_body", detail: String(e) }, { status: 400 }); }
        const { error } = await ctx.supabase
          .from("grain_alerts")
          .update({
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: ctx.userId,
            resolution_notes: body.note ?? null,
          } as never)
          .eq("id", body.alert_id);
        if (error) return Response.json({ error: "db_error", detail: error.message }, { status: 500 });
        const resp = { data: { ok: true, alert_id: body.alert_id }, meta: { version: "v1" } };
        await saveIdempotent(ctx.supabase, ctx.userId, idem, ENDPOINT, resp);
        return Response.json(resp);
      },
    },
  },
});
