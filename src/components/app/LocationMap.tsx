import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";

type Props = {
  address?: string;
  city?: string;
  country?: string;
};

/**
 * Expand-map card: a compact location row that expands on click into an
 * embedded street map with the location details (framer-motion spring).
 */
export function LocationMap({ address, city, country }: Props) {
  const [open, setOpen] = useState(false);
  const parts = [address, city, country].map((p) => p?.trim()).filter(Boolean) as string[];
  const query = parts.join(", ");
  const hasLocation = parts.length > 0;
  const title = hasLocation
    ? [city, country].filter(Boolean).join(", ") || address
    : "No location set";

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-card"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at center, rgba(52,211,153,0.05) 0%, transparent 70%)",
      }}
    >
      <button
        type="button"
        onClick={() => hasLocation && setOpen((o) => !o)}
        disabled={!hasLocation}
        className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-default"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {hasLocation ? query : "Add your address to see it on the map"}
          </span>
        </span>
        {hasLocation && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {open ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && hasLocation && (
          <motion.div
            key="map"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="space-y-3 px-4 pb-4">
              <div className="overflow-hidden rounded-xl border border-border">
                <iframe
                  title="Location map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`}
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  {address && (
                    <span><span className="uppercase tracking-wider text-muted-foreground/70 mr-1.5">Address</span><span className="font-medium text-foreground">{address}</span></span>
                  )}
                  {city && (
                    <span><span className="uppercase tracking-wider text-muted-foreground/70 mr-1.5">City</span><span className="font-medium text-foreground">{city}</span></span>
                  )}
                  {country && (
                    <span><span className="uppercase tracking-wider text-muted-foreground/70 mr-1.5">Country</span><span className="font-medium text-foreground">{country}</span></span>
                  )}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  Open in Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
