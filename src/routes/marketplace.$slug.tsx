import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicListing } from "@/lib/marketplace.functions";
import { createBuyerOrder } from "@/lib/buyer-portal.functions";
import { startBuyerCheckout } from "@/lib/buyer-checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/marketplace/$slug")({
  component: ListingDetail,
});

function ListingDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["public-listing", slug],
    queryFn: () => getPublicListing({ data: { slug } }),
  });
  const l = data?.listing;

  const [qty, setQty] = useState<number>(0);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!l) throw new Error("Listing not loaded");
      const created = await createBuyerOrder({ data: { listingId: l.id, quantityKg: qty } });
      const { url } = await startBuyerCheckout({
        data: { orderId: created.id, origin: window.location.origin },
      });
      return { orderId: created.id, url };
    },
    onSuccess: ({ url }) => {
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      if (url) window.location.href = url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!l) return <div className="text-muted-foreground">Listing not found.</div>;

  const min = Number(l.min_order_kg ?? 0);
  const avail = Number(l.available_kg ?? 0);
  const price = Number(l.price_per_kg ?? 0);
  const total = qty > 0 ? (qty * price).toFixed(2) : "0.00";
  const valid = qty >= min && qty <= avail;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to marketplace
        </Link>
        <div className="aspect-video rounded-lg bg-muted overflow-hidden flex items-center justify-center">
          {l.cover_image_url && (
            <img src={l.cover_image_url} alt={l.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">
              {l.grain_type}
            </Badge>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/50">
              <ShieldCheck className="h-3 w-3 mr-1" /> Sensor-verified
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold">{l.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {l.warehouse_location?.city ?? "—"} · {l.warehouse_location?.country ?? ""}
          </p>
        </div>
        {l.description && (
          <p className="text-sm leading-relaxed whitespace-pre-line">{l.description}</p>
        )}
      </div>

      <Card className="sticky top-6 h-fit">
        <CardContent className="p-5 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">Price per kg</div>
            <div className="text-3xl font-semibold text-emerald-600">
              {l.currency} {price.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {avail.toLocaleString()} kg available · min {min.toLocaleString()} kg
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity (kg)</Label>
            <Input
              id="qty"
              type="number"
              min={min}
              max={avail}
              value={qty || ""}
              onChange={(e) => setQty(Number(e.target.value))}
              placeholder={`${min} - ${avail}`}
            />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-lg font-semibold">
              {l.currency} {total}
            </span>
          </div>
          {signedIn ? (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!valid || placeOrder.isPending}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? "Redirecting to checkout…" : "Place order & pay"}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Sign in to order
            </Button>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Payment secured by Stripe · Order tracked in your dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
