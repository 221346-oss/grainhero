import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPublicSellerStorefront } from "@/lib/reputation.functions";

export const Route = createFileRoute("/marketplace/seller/$adminId")({
  component: SellerStorefront,
  head: ({ params }) => ({
    meta: [
      { title: `Seller ${params.adminId.slice(0, 8)} — Marketplace` },
      { name: "description", content: "Public seller storefront with reputation, reviews, and active listings." },
    ],
  }),
});

function SellerStorefront() {
  const { adminId } = Route.useParams();
  const load = useServerFn(getPublicSellerStorefront);
  const { data, isLoading } = useQuery({
    queryKey: ["public-storefront", adminId],
    queryFn: () => load({ data: { adminId } }),
  });
  if (isLoading || !data) {
    return <div className="min-h-screen p-6 text-sm text-muted-foreground">Loading storefront…</div>;
  }
  const { seller, reputation, reviews, listings, brand } = data;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 sm:p-6 space-y-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-700">{brand.brandName}</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {seller?.company_name || seller?.name || "Seller"}
          </h1>
          <div className="text-sm text-slate-500">{[seller?.city, seller?.country].filter(Boolean).join(", ")}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-emerald-700">{reputation.score}</div>
          <div className="text-xs text-muted-foreground">reputation score</div>
          <div className="flex flex-wrap gap-1 mt-2 justify-end">
            {reputation.badges.map((b) => (
              <Badge key={b.key} variant="secondary">{b.label}</Badge>
            ))}
            {reputation.verified && <Badge className="bg-emerald-600">Verified</Badge>}
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Active listings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No active listings.</CardContent></Card>
          )}
          {listings.map((l) => (
            <a key={l.id} href={`/marketplace/${l.slug ?? l.id}`}
              className="block rounded-lg border bg-white hover:border-emerald-500 hover:shadow-sm transition">
              <div className="p-4">
                <div className="font-medium text-slate-900">{l.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.available_kg} kg · {brand.currency} {Number(l.price_per_kg).toFixed(2)}/kg</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent reviews</h2>
        <div className="space-y-2">
          {reviews.length === 0 && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No published reviews yet.</CardContent></Card>
          )}
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-amber-600 font-semibold">{"★".repeat(Number(r.rating) || 0)}{"☆".repeat(5 - (Number(r.rating) || 0))}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                {r.title && <div className="text-sm font-medium">{r.title}</div>}
                {r.body && <div className="text-sm text-slate-700">{r.body}</div>}
                {r.seller_response && (
                  <div className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900 border border-emerald-100">
                    <span className="font-semibold">Seller response:</span> {r.seller_response}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">{r.helpful_count ?? 0} people found this helpful</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}