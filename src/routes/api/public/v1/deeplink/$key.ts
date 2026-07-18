import { createFileRoute } from "@tanstack/react-router";
import { authenticateMobile } from "@/lib/mobile-auth.server";

function fill(template: string, params: URLSearchParams): string {
  return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, p) => {
    const v = params.get(p);
    return v ? encodeURIComponent(v) : `:${p}`;
  });
}

export const Route = createFileRoute("/api/public/v1/deeplink/$key")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const ctx = await authenticateMobile(request);
        if (ctx instanceof Response) return ctx;
        const { data } = await ctx.supabase
          .from("mobile_deep_link_routes")
          .select("native_route, web_fallback, active")
          .eq("key", params.key)
          .maybeSingle();
        if (!data || !data.active) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }
        const url = new URL(request.url);
        const nativePath = fill(data.native_route, url.searchParams);
        const webPath = fill(data.web_fallback, url.searchParams);
        const { scheme, universal_host } = ctx.settings.deep_link;
        return Response.json({
          data: {
            key: params.key,
            native: `${scheme}://${universal_host}${nativePath}`,
            web: `https://${universal_host}${webPath}`,
            path: nativePath,
          },
          meta: { version: "v1" },
        });
      },
    },
  },
});
