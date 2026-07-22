import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";

export const Route = createFileRoute("/api/public/v1/meta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return Response.json({
          data: {
            server_time: new Date().toISOString(),
            user_id: ctx.userId,
            min_build: ctx.settings.min_build,
            latest_build: ctx.settings.latest_build,
            force_update_below: ctx.settings.force_update_below,
            feature_flags: ctx.settings.feature_flags,
            heartbeat_interval_seconds: ctx.settings.heartbeat_interval_seconds,
            deep_link: ctx.settings.deep_link,
          },
          meta: { version: "v1" },
        });
      },
    },
  },
});
