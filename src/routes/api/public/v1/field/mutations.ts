import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile, getIdempotent, saveIdempotent } from "@/lib/mobile-auth.server";
import { ACTIONS } from "@/lib/mobile-action-registry.server";
import { withSyncLogging } from "@/lib/sync-monitor.server";

const batchSchema = z.object({
  mutations: z
    .array(
      z.object({
        client_id: z.string().min(1).max(64),
        kind: z.string().min(1).max(64),
        payload: z.unknown(),
        occurred_at: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Phase 28 — Field mutation batch endpoint. Each item's client_id is used as
 * an idempotency key; kind must resolve to a handler in the shared
 * action registry. Returns a per-item result so partial failures don't reject
 * the whole batch.
 */
export const Route = createFileRoute("/api/public/v1/field/mutations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging(
          { endpoint: "field-mutations", actorUserId: ctx.userId },
          async () => {
            let parsed: z.infer<typeof batchSchema>;
            try {
              parsed = batchSchema.parse(await request.json());
            } catch (e) {
              return {
                response: Response.json({ error: (e as Error).message }, { status: 400 }),
                rowCount: 0,
              };
            }

            const results: Array<{
              client_id: string;
              status: "ok" | "error" | "deduped";
              result?: unknown;
              error?: string;
            }> = [];
            let failureCount = 0;

            for (const m of parsed.mutations) {
              const handler = ACTIONS[m.kind];
              if (!handler) {
                results.push({
                  client_id: m.client_id,
                  status: "error",
                  error: `unknown_kind:${m.kind}`,
                });
                failureCount++;
                continue;
              }
              const prior = await getIdempotent(
                ctx.supabase,
                ctx.userId,
                m.client_id,
                `field-mutations:${m.kind}`,
              );
              if (prior !== null) {
                results.push({ client_id: m.client_id, status: "deduped", result: prior });
                continue;
              }
              try {
                const result = await handler(
                  { supabase: ctx.supabase, userId: ctx.userId },
                  m.payload,
                );
                await saveIdempotent(
                  ctx.supabase,
                  ctx.userId,
                  m.client_id,
                  `field-mutations:${m.kind}`,
                  result,
                );
                results.push({ client_id: m.client_id, status: "ok", result });
              } catch (err) {
                failureCount++;
                results.push({
                  client_id: m.client_id,
                  status: "error",
                  error: (err as Error).message?.slice(0, 500),
                });
              }
            }

            // Invalidate cached bundle so next fetch is fresh
            await ctx.supabase
              .from("mobile_field_bundles")
              .update({ expires_at: new Date().toISOString() } as never)
              .eq("user_id", ctx.userId);

            if (failureCount > 0) {
              console.warn(
                `[field-mutations] user=${ctx.userId} failed=${failureCount}/${parsed.mutations.length}`,
              );
            }

            return {
              response: Response.json({
                data: { results },
                meta: { server_time: new Date().toISOString(), version: "v1" },
              }),
              rowCount: results.length,
            };
          },
        );
      },
    },
  },
});
