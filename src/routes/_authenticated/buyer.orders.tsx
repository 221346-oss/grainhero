import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/buyer-portal.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buyer/orders")({
  component: MyOrders,
});

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  invoiced: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  dispatched: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
};

function MyOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(),
  });
  const orders = data?.orders ?? [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My marketplace orders</h1>
          <p className="text-sm text-muted-foreground">Every order you placed on the GrainHero marketplace.</p>
        </div>
        <Link to="/marketplace" className="text-sm text-emerald-600 hover:underline">Browse listings →</Link>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Package className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">No orders yet</div>
            <Link to="/marketplace" className="text-sm text-emerald-600 hover:underline">Explore the marketplace</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to="/buyer/orders/$orderId" params={{ orderId: o.id }}>
              <Card className="transition hover:border-emerald-500/50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {o.grain_listings?.cover_image_url ? (
                        <img src={o.grain_listings.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{o.grain_listings?.title ?? "Listing"}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.order_number} · {Number(o.quantity_kg).toLocaleString()} kg · {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-sm font-semibold">{o.currency} {Number(o.subtotal).toFixed(2)}</div>
                    <Badge variant="outline" className={`capitalize ${STATUS_TONE[o.status] ?? ""}`}>{o.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}