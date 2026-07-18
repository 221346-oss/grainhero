import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { withSyncLogging } from "@/lib/sync-monitor.server";

const itemSchema = z.object({
  listing_id: z.string().uuid(),
  quantity_kg: z.number().positive().max(1_000_000),
  unit_price_cents: z.number().int().nonnegative(),
});
const cartSchema = z.object({
  items: z.array(itemSchema).max(50),
  currency: z.string().min(3).max(8).default("USD"),
});

export const Route = createFileRoute("/api/public/v1/commerce/cart")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-cart", actorUserId: ctx.userId }, async () => {
          const buyerId = ctx.userId;
          const { data, error } = await ctx.supabase.from("buyer_carts")
            .select("*").eq("buyer_id", buyerId).maybeSingle();
          if (error) return { response: Response.json({ error: error.message }, { status: 500 }), rowCount: 0 };
          return { response: Response.json({ data, meta: { version: "v1" } }), rowCount: data ? 1 : 0 };
        });
      },
      PUT: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-cart", actorUserId: ctx.userId }, async () => {
          let body: z.infer<typeof cartSchema>;
          try { body = cartSchema.parse(await request.json()); }
          catch (e) { return { response: Response.json({ error: (e as Error).message }, { status: 400 }), rowCount: 0 }; }
          const buyerId = ctx.userId;

          const subtotalCents = body.items.reduce(
            (s, it) => s + Math.round(it.quantity_kg * it.unit_price_cents), 0);

          // Enforce commerce settings bounds
          const { data: cfgRaw } = await ctx.supabase.from("mobile_commerce_settings" as never)
            .select("min_order_cents,max_order_cents,checkout_enabled").limit(1).maybeSingle();
          const cfg = cfgRaw as { min_order_cents: number; max_order_cents: number; checkout_enabled: boolean } | null;
          if (cfg && !cfg.checkout_enabled) {
            return { response: Response.json({ error: "checkout_disabled" }, { status: 403 }), rowCount: 0 };
          }
          const expires = new Date(Date.now() + 60 * 60_000).toISOString();
          const payload = {
            buyer_id: buyerId, items: body.items as never, currency: body.currency,
            subtotal_cents: subtotalCents, expires_at: expires,
          };
          const { data, error } = await ctx.supabase.from("buyer_carts")
            .upsert(payload as never, { onConflict: "buyer_id" }).select("*").maybeSingle();
          if (error) return { response: Response.json({ error: error.message }, { status: 500 }), rowCount: 0 };
          return {
            response: Response.json({ data, warnings: cfg ? {
              below_min: subtotalCents < cfg.min_order_cents,
              above_max: subtotalCents > cfg.max_order_cents,
            } : undefined, meta: { version: "v1" } }),
            rowCount: 1,
          };
        });
      },
      DELETE: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        return withSyncLogging({ endpoint: "commerce-cart", actorUserId: ctx.userId }, async () => {
          const buyerId = ctx.userId;
          await ctx.supabase.from("buyer_carts").delete().eq("buyer_id", buyerId);
          return { response: Response.json({ ok: true }), rowCount: 1 };
        });
      },
    },
  },
});