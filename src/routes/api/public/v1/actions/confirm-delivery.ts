import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile, getIdempotent, saveIdempotent } from "@/lib/mobile-auth.server";

const BODY = z.object({
  order_id: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});
const ENDPOINT = "v1/actions/confirm-delivery";

export const Route = createFileRoute("/api/public/v1/actions/confirm-delivery")({
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
        const { error: eEvt } = await ctx.supabase
          .from("buyer_order_events")
          .insert({
            order_id: body.order_id,
            event_type: "buyer_confirmed_delivery",
            actor_user_id: ctx.userId,
            notes: body.notes ?? null,
          } as never);
        if (eEvt) return Response.json({ error: "db_error", detail: eEvt.message }, { status: 500 });
        const resp = { data: { ok: true }, meta: { version: "v1" } };
        await saveIdempotent(ctx.supabase, ctx.userId, idem, ENDPOINT, resp);
        return Response.json(resp);
      },
    },
  },
});
