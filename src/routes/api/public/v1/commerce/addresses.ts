import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { withSyncLogging } from "@/lib/sync-monitor.server";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(64).optional(),
  recipient: z.string().min(1).max(120),
  phone: z.string().min(3).max(32),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  region: z.string().max(120).optional(),
  postal: z.string().max(32).optional(),
  country: z.string().min(2).max(2),
  is_default: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/v1/commerce/addresses")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-addresses", actorUserId: ctx.userId }, async () => {
          const buyerId = ctx.userId;
          const { data, error } = await ctx.supabase.from("buyer_addresses")
            .select("*").eq("buyer_id", buyerId).order("is_default", { ascending: false });
          if (error) return { response: Response.json({ error: error.message }, { status: 500 }), rowCount: 0 };
          return { response: Response.json({ data: data ?? [], meta: { version: "v1", server_time: new Date().toISOString() } }), rowCount: data?.length ?? 0 };
        });
      },
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-addresses", actorUserId: ctx.userId }, async () => {
          let body: z.infer<typeof upsertSchema>;
          try { body = upsertSchema.parse(await request.json()); }
          catch (e) { return { response: Response.json({ error: (e as Error).message }, { status: 400 }), rowCount: 0 }; }
          const buyerId = ctx.userId;
          if (body.is_default) {
            await ctx.supabase.from("buyer_addresses").update({ is_default: false } as never).eq("buyer_id", buyerId);
          }
          const payload = { ...body, buyer_id: buyerId };
          const { data, error } = await ctx.supabase.from("buyer_addresses")
            .upsert(payload as never).select("*").maybeSingle();
          if (error) return { response: Response.json({ error: error.message }, { status: 500 }), rowCount: 0 };
          return { response: Response.json({ data, meta: { version: "v1" } }), rowCount: 1 };
        });
      },
      DELETE: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-addresses", actorUserId: ctx.userId }, async () => {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          if (!id) return { response: Response.json({ error: "id_required" }, { status: 400 }), rowCount: 0 };
          const buyerId = ctx.userId;
          const { error } = await ctx.supabase.from("buyer_addresses").delete().eq("id", id).eq("buyer_id", buyerId);
          if (error) return { response: Response.json({ error: error.message }, { status: 500 }), rowCount: 0 };
          return { response: Response.json({ ok: true }), rowCount: 1 };
        });
      },
    },
  },
});