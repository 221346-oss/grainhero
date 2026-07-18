import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile, getIdempotent, saveIdempotent } from "@/lib/mobile-auth.server";

const BODY = z.object({
  installation_id: z.string().uuid(),
  step_key: z.string().min(1).max(64),
  status: z.enum(["started", "completed", "skipped", "failed"]),
  notes: z.string().max(1000).optional(),
  attachments: z.array(z.object({ bucket: z.string(), path: z.string() })).max(10).optional(),
});
const ENDPOINT = "v1/actions/install-step";

export const Route = createFileRoute("/api/public/v1/actions/install-step")({
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
        const { data, error } = await ctx.supabase
          .from("hardware_order_visit_events")
          .insert({
            installation_id: body.installation_id,
            actor_user_id: ctx.userId,
            event_type: body.step_key,
            status: body.status,
            notes: body.notes ?? null,
            payload: body.attachments ? { attachments: body.attachments } : {},
          } as never)
          .select("id")
          .maybeSingle();
        if (error) return Response.json({ error: "db_error", detail: error.message }, { status: 500 });
        const resp = { data: { ok: true, event_id: (data as { id?: string } | null)?.id }, meta: { version: "v1" } };
        await saveIdempotent(ctx.supabase, ctx.userId, idem, ENDPOINT, resp);
        return Response.json(resp);
      },
    },
  },
});
