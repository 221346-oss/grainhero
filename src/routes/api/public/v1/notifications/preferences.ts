import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";

const BODY = z.object({
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  categories: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
});

export const Route = createFileRoute("/api/public/v1/notifications/preferences")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const { data } = await ctx.supabase
          .from("notification_channel_prefs")
          .select("email_enabled, sms_enabled, push_enabled, categories")
          .eq("user_id", ctx.userId)
          .maybeSingle();
        return Response.json({
          data: data ?? {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            categories: {},
          },
        });
      },
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        let body: z.infer<typeof BODY>;
        try {
          body = BODY.parse(await request.json());
        } catch (e) {
          return Response.json({ error: "invalid_body", detail: String(e) }, { status: 400 });
        }
        const { error } = await ctx.supabase
          .from("notification_channel_prefs")
          .upsert({ user_id: ctx.userId, ...body } as never, { onConflict: "user_id" });
        if (error)
          return Response.json({ error: "db_error", detail: error.message }, { status: 500 });
        return Response.json({ data: { ok: true }, meta: { version: "v1" } });
      },
    },
  },
});
