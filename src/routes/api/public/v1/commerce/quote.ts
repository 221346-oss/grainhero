import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { computeQuote } from "@/lib/mobile-checkout.server";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        listing_id: z.string().uuid(),
        quantity_kg: z.number().positive().max(1_000_000),
        unit_price_cents: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(50),
  address_id: z.string().uuid().nullish(),
});

export const Route = createFileRoute("/api/public/v1/commerce/quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 400 });
        }
        try {
          const quote = await computeQuote(
            ctx.supabase,
            body.items,
            body.address_id ?? null,
            ctx.userId,
          );
          return Response.json({ data: quote, meta: { version: "v1" } });
        } catch (e) {
          const msg = (e as Error).message;
          const status =
            msg === "checkout_disabled"
              ? 403
              : msg === "address_forbidden"
                ? 403
                : msg === "address_not_found"
                  ? 404
                  : msg === "cart_empty" || msg === "no_valid_lines"
                    ? 400
                    : 500;
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
