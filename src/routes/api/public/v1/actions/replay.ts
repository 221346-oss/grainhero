import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile, getIdempotent, saveIdempotent } from "@/lib/mobile-auth.server";
import { ACTIONS } from "@/lib/mobile-action-registry.server";

const BODY = z.object({
  ops: z.array(z.object({
    endpoint: z.string().min(1).max(64),
    idempotency_key: z.string().min(1).max(128),
    body: z.unknown(),
  })).min(1).max(50),
});

export const Route = createFileRoute("/api/public/v1/actions/replay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        let body: z.infer<typeof BODY>;
        try { body = BODY.parse(await request.json()); }
        catch (e) { return Response.json({ error: "invalid_body", detail: String(e) }, { status: 400 }); }

        const results: Array<{ endpoint: string; status: "ok" | "error" | "cached"; response?: unknown; error?: string }> = [];
        for (const op of body.ops) {
          const handler = ACTIONS[op.endpoint];
          if (!handler) { results.push({ endpoint: op.endpoint, status: "error", error: "unknown_endpoint" }); continue; }
          const endpointKey = `replay/${op.endpoint}`;
          const cached = await getIdempotent(ctx.supabase, ctx.userId, op.idempotency_key, endpointKey);
          if (cached) { results.push({ endpoint: op.endpoint, status: "cached", response: cached }); continue; }
          try {
            const response = await handler({ supabase: ctx.supabase, userId: ctx.userId }, op.body);
            await saveIdempotent(ctx.supabase, ctx.userId, op.idempotency_key, endpointKey, response);
            results.push({ endpoint: op.endpoint, status: "ok", response });
          } catch (e) {
            results.push({ endpoint: op.endpoint, status: "error", error: (e as Error).message.slice(0, 300) });
          }
        }
        return Response.json({ data: { results }, meta: { version: "v1" } });
      },
    },
  },
});
