import { MapPin, Navigation } from "lucide-react";

interface Props {
  originAddress?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destAddress?: string | null;
  destLat?: number | null;
  destLng?: number | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function RouteMapCard({
  originAddress,
  originLat,
  originLng,
  destAddress,
  destLat,
  destLng,
}: Props) {
  const hasCoords =
    typeof originLat === "number" &&
    typeof originLng === "number" &&
    typeof destLat === "number" &&
    typeof destLng === "number";
  const km = hasCoords ? haversineKm(originLat!, originLng!, destLat!, destLng!) : null;
  const etaMin = km !== null ? Math.max(5, Math.round(km * 1.2)) : null;

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
    : originAddress && destAddress
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddress)}&destination=${encodeURIComponent(destAddress)}`
      : null;

  return (
    <div className="rounded-2xl border-border bg-card overflow-hidden">
      <div className="relative h-[240px] bg-gradient-to-br from-primary/5 via-muted/40 to-primary/10 dark:from-primary/10 dark:via-muted/20 dark:to-primary/20">
        {/* faux street lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30 dark:opacity-25"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
        >
          <g stroke="currentColor" strokeWidth="0.6" className="text-muted-foreground">
            {[...Array(9)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={24 * (i + 1)} x2="400" y2={24 * (i + 1)} />
            ))}
            {[...Array(15)].map((_, i) => (
              <line key={`v${i}`} x1={24 * (i + 1)} y1="0" x2={24 * (i + 1)} y2="240" />
            ))}
          </g>
          {/* curved route line */}
          <path
            d="M 60 190 C 140 160, 200 120, 340 60"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 6"
          />
        </svg>
        {/* origin marker */}
        <div className="absolute" style={{ left: "12%", top: "76%" }}>
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-background">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        {/* destination marker */}
        <div className="absolute" style={{ right: "12%", top: "20%" }}>
          <div className="h-9 w-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg ring-4 ring-background">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        {/* ETA pill */}
        {etaMin !== null && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {etaMin} mins away
          </div>
        )}
      </div>
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground uppercase tracking-wide font-semibold">
              Origin
            </div>
            <div className="text-foreground truncate">{originAddress ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mt-1 shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground uppercase tracking-wide font-semibold">
              Destination
            </div>
            <div className="text-foreground truncate">{destAddress ?? "—"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-muted-foreground">
            {km !== null ? `${km.toFixed(1)} km` : "Add coordinates to see distance"}
          </span>
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
