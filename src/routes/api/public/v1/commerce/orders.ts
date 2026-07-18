import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateMobile } from "@/lib/mobile-auth.server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute("/api/public/v1/commerce/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        let q: z.infer<typeof querySchema>;
        try { q = querySchema.parse(Object.fromEntries(url.searchParams)); }
        catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }

        let query = ctx.supabase.from("buyer_orders")
          .select("id, order_number, status, subtotal, currency, quantity_kg, listing_id, admin_id, channel, created_at, paid_at, dispatched_at, delivered_at, cancelled_at")
          .eq("buyer_id", ctx.userId)
          .order("created_at", { ascending: false })
          .limit(q.limit + 1);
        if (q.cursor) query = query.lt("created_at", q.cursor);
        if (q.status) query = query.eq("status", q.status as never);

        const { data, error } = await query;
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const rows = (data ?? []) as Array<{ created_at: string }>;
        const hasMore = rows.length > q.limit;
        const page = hasMore ? rows.slice(0, q.limit) : rows;
        const nextCursor = hasMore ? page[page.length - 1].created_at : null;
        return Response.json({ data: page, meta: { version: "v1", next_cursor: nextCursor } });
      },
    },
  },
});