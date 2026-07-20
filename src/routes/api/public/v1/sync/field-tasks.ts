import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { runSync } from "@/lib/mobile-sync.server";
import { withSyncLogging } from "@/lib/sync-monitor.server";

export const Route = createFileRoute("/api/public/v1/sync/field-tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        return withSyncLogging(
          { endpoint: "field-tasks", actorUserId: ctx.userId, requestMeta: { since: url.searchParams.get("since") } },
          async () => {
            const result = await runSync(ctx.supabase, ctx.settings,
              url.searchParams.get("since"),
              Number(url.searchParams.get("limit")) || null,
              { table: "mobile_field_task_v", cursorColumn: "updated_at" });
            return { response: Response.json(result), rowCount: result.data.length };
          },
        );
      },
    },
  },
});