import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";

const BODY = z.object({
  platform: z.enum(["ios", "android"]),
  push_token: z.string().min(1).max(4096).nullable().optional(),
  app_version: z.string().max(32).optional(),
  os_version: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
});

export const Route = createFileRoute("/api/public/v1/devices/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        let body: z.infer<typeof BODY>;
        try {
          body = BODY.parse(await request.json());
        } catch (e) {
          return Response.json({ error: "invalid_body", detail: String(e) }, { status: 400 });
        }
        const { data, error } = await ctx.supabase
          .from("mobile_devices")
          .upsert(
            {
              user_id: ctx.userId,
              platform: body.platform,
              push_token: body.push_token ?? null,
              app_version: body.app_version ?? null,
              os_version: body.os_version ?? null,
              locale: body.locale ?? null,
              last_seen_at: new Date().toISOString(),
              revoked_at: null,
            },
            { onConflict: "user_id,push_token" },
          )
          .select("id, platform, last_seen_at")
          .maybeSingle();
        if (error)
          return Response.json({ error: "db_error", detail: error.message }, { status: 500 });
        return Response.json({ data, meta: { version: "v1" } });
      },
    },
  },
});
