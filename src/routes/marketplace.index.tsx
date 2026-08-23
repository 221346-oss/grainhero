import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublicListings } from "@/lib/marketplace.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/marketplace/")({
  component: MarketplaceIndex,
});

function MarketplaceIndex() {
  const [region, setRegion] = useState("");
  const [grain, setGrain] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["public-listings", grain, region],
    queryFn: () =>
      listPublicListings({ data: { grainType: grain || undefined, region: region || undefined } }),
  });
  const listings = data?.listings ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verified grain listings</h1>
        <p className="text-sm text-muted-foreground">
          Sensor-monitored batches ready for dispatch from GrainHero warehouses.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Grain type (e.g. wheat)"
          value={grain}
          onChange={(e) => setGrain(e.target.value)}
        />
        <Input
          placeholder="Region / city"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <div className="text-sm text-muted-foreground flex items-center">
          {isLoading ? "Loading…" : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <Link key={l.id} to="/marketplace/$slug" params={{ slug: l.slug }}>
            <Card className="h-full transition hover:border-emerald-500/50">
              <CardContent className="p-4 space-y-3">
                <div className="aspect-video rounded-md bg-muted overflow-hidden flex items-center justify-center">
                  {l.cover_image_url && (
                    <img
                      src={l.cover_image_url}
                      alt={l.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{l.title}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {l.grain_type}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {l.warehouse_location?.city ?? l.warehouse_location?.country ?? "—"}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Price / kg</div>
                    <div className="text-lg font-semibold text-emerald-600">
                      {l.currency} {Number(l.price_per_kg).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Available</div>
                    <div className="text-sm font-medium">
                      {Number(l.available_kg).toLocaleString()} kg
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!isLoading && listings.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No listings match your filters yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
