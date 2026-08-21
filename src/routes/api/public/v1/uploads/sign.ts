import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";

const BODY = z.object({
  purpose: z.string().min(1).max(64),
  filename: z.string().min(1).max(256),
  mime: z.string().min(1).max(128),
  size_bytes: z.number().int().nonnegative(),
});

export const Route = createFileRoute("/api/public/v1/uploads/sign")({
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

        const cfg = ctx.settings.uploads?.[body.purpose];
        if (!cfg) return Response.json({ error: "unknown_purpose" }, { status: 400 });
        if (!cfg.allowed_mime.includes(body.mime)) {
          return Response.json(
            { error: "mime_not_allowed", allowed: cfg.allowed_mime },
            { status: 400 },
          );
        }
        if (body.size_bytes > cfg.max_mb * 1024 * 1024) {
          return Response.json({ error: "file_too_large", max_mb: cfg.max_mb }, { status: 400 });
        }

        const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${ctx.userId}/${body.purpose}/${Date.now()}_${safeName}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from(cfg.bucket)
          .createSignedUploadUrl(path);
        if (error || !data)
          return Response.json({ error: "sign_failed", detail: error?.message }, { status: 500 });
        const { data: readUrl } = await supabaseAdmin.storage
          .from(cfg.bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        return Response.json({
          data: {
            bucket: cfg.bucket,
            path,
            upload_url: data.signedUrl,
            upload_token: data.token,
            read_url: readUrl?.signedUrl ?? null,
            expires_in_seconds: 60 * 5,
          },
          meta: { version: "v1" },
        });
      },
    },
  },
});
