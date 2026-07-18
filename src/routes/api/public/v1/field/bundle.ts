import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { withSyncLogging } from "@/lib/sync-monitor.server";

/**
 * Phase 28 — Field ops offline-first bundle.
 * Returns { tasks, incidents, generated_at, expires_at } for the authenticated
 * user. Supports If-None-Match → 304. TTL & limits come from mobile_field_settings.
 */
export const Route = createFileRoute("/api/public/v1/field/bundle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging(
          { endpoint: "field-bundle", actorUserId: ctx.userId },
          async () => {
            const inm = request.headers.get("if-none-match");

            const { data: fsRow } = await ctx.supabase.from("mobile_field_settings")
              .select("bundle_ttl_minutes,bundle_max_tasks,bundle_max_incidents")
              .eq("id", true).maybeSingle();
            const fs = (fsRow ?? {}) as { bundle_ttl_minutes?: number; bundle_max_tasks?: number; bundle_max_incidents?: number };
            const ttl = Math.max(1, fs.bundle_ttl_minutes ?? 15);
            const maxTasks = Math.max(1, fs.bundle_max_tasks ?? 100);
            const maxIncidents = Math.max(1, fs.bundle_max_incidents ?? 50);

            // Check cached bundle
            const { data: cachedRaw } = await ctx.supabase.from("mobile_field_bundles")
              .select("*").eq("user_id", ctx.userId).maybeSingle();
            const cached = cachedRaw as { bundle: unknown; etag: string; generated_at: string; expires_at: string; bundle_bytes: number } | null;
            if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
              if (inm && inm === cached.etag) {
                return { response: new Response(null, { status: 304, headers: { ETag: cached.etag } }), rowCount: 0 };
              }
              return {
                response: Response.json(
                  { data: cached.bundle, meta: { server_time: new Date().toISOString(), etag: cached.etag, generated_at: cached.generated_at, expires_at: cached.expires_at, cached: true, version: "v1" } },
                  { headers: { ETag: cached.etag } },
                ), rowCount: 1,
              };
            }

            // Rebuild bundle
            const [tasks, incidents] = await Promise.all([
              ctx.supabase.from("mobile_field_task_v" as never).select("*").limit(maxTasks),
              ctx.supabase.from("field_incidents").select("*")
                .order("created_at", { ascending: false }).limit(maxIncidents),
            ]);
            if (tasks.error) return { response: Response.json({ error: tasks.error.message }, { status: 500 }), rowCount: 0 };
            if (incidents.error) return { response: Response.json({ error: incidents.error.message }, { status: 500 }), rowCount: 0 };

            const bundle = { tasks: tasks.data ?? [], incidents: incidents.data ?? [] };
            const bytes = Buffer.byteLength(JSON.stringify(bundle), "utf8");
            const etag = `"${createHash("sha1").update(JSON.stringify(bundle)).digest("hex")}"`;
            const generatedAt = new Date().toISOString();
            const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();

            await ctx.supabase.from("mobile_field_bundles").upsert({
              user_id: ctx.userId, bundle: bundle as never, etag,
              generated_at: generatedAt, expires_at: expiresAt, bundle_bytes: bytes,
            } as never, { onConflict: "user_id" });

            if (inm && inm === etag) {
              return { response: new Response(null, { status: 304, headers: { ETag: etag } }), rowCount: 0 };
            }
            return {
              response: Response.json(
                { data: bundle, meta: { server_time: new Date().toISOString(), etag, generated_at: generatedAt, expires_at: expiresAt, cached: false, bytes, version: "v1" } },
                { headers: { ETag: etag } },
              ),
              rowCount: bundle.tasks.length + bundle.incidents.length,
            };
          },
        );
      },
    },
  },
});