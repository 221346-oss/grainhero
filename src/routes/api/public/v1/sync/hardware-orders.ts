import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";
import { runSync } from "@/lib/mobile-sync.server";

export const Route = createFileRoute("/api/public/v1/sync/hardware-orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const result = await runSync(ctx.supabase, ctx.settings,
          url.searchParams.get("since"),
          Number(url.searchParams.get("limit")) || null,
          { table: "hardware_orders", cursorColumn: "updated_at" });
        return Response.json(result);
      },
    },
  },
});
