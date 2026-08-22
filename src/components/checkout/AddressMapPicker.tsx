/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2, Search, Crosshair } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Google Maps JS API loader (singleton across the app)
declare global {
  interface Window {
    google?: typeof google;
    __ghMapsLoading?: Promise<typeof google>;
    __ghInitMap?: () => void;
  }
}

function loadMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__ghMapsLoading) return window.__ghMapsLoading;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Google Maps browser key missing"));
  window.__ghMapsLoading = new Promise<typeof google>((resolve, reject) => {
    window.__ghInitMap = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Maps failed to initialize"));
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: "places",
      loading: "async",
      callback: "__ghInitMap",
      v: "weekly",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__ghMapsLoading;
}

export interface PickedLocation {
  address: string;
  lat: number | null;
  lng: number | null;
  city?: string;
  country?: string;
}

interface Props {
  value: { address: string; lat: number | null; lng: number | null };
  onChange: (loc: PickedLocation) => void;
  defaultCenter?: { lat: number; lng: number };
}

// Rawalpindi HQ default
const DEFAULT_CENTER = { lat: 33.5651, lng: 73.0169 };

export function AddressMapPicker({ value, onChange, defaultCenter }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const inputEl = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [query, setQuery] = useState(value.address ?? "");
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; primary: string; secondary: string }>>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const pickingRef = useRef(false);

  const emit = useCallback((address: string, lat: number | null, lng: number | null, comps?: google.maps.GeocoderAddressComponent[]) => {
    let city: string | undefined;
    let country: string | undefined;
    for (const c of comps ?? []) {
      if (c.types.includes("locality")) city = c.long_name;
      else if (!city && c.types.includes("administrative_area_level_2")) city = c.long_name;
      if (c.types.includes("country")) country = c.long_name;
    }
    onChange({ address, lat, lng, city, country });
  }, [onChange]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    try {
      const res = await geocoder.geocode({ location: { lat, lng } });
      const first = res.results?.[0];
      if (first) {
        setQuery(first.formatted_address);
        emit(first.formatted_address, lat, lng, first.address_components);
      } else {
        emit(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng);
      }
    } catch {
      emit(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng);
    }
  }, [emit]);

  // Initialize map
  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then((g) => {
        if (cancelled || !mapEl.current) return;
        const initialCenter = value.lat != null && value.lng != null
          ? { lat: value.lat, lng: value.lng }
          : defaultCenter ?? DEFAULT_CENTER;
        const map = new g.maps.Map(mapEl.current, {
          center: initialCenter,
          zoom: value.lat != null ? 15 : 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        const marker = new g.maps.Marker({
          position: initialCenter,
          map,
          draggable: true,
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) reverseGeocode(p.lat(), p.lng());
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          reverseGeocode(e.latLng.lat(), e.latLng.lng());
        });
        mapRef.current = map;
        markerRef.current = marker;
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
        setStatus("idle");
      })
      .catch((e: Error) => {
        setStatus("error");
        setError(e.message);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocomplete suggestions (debounced)
  useEffect(() => {
    if (!window.google?.maps.places || !query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        // Places API (New) — AutocompleteSuggestion
        const places = window.google!.maps.places as unknown as {
          AutocompleteSuggestion?: {
            fetchAutocompleteSuggestions: (req: {
              input: string;
              sessionToken: google.maps.places.AutocompleteSessionToken;
            }) => Promise<{ suggestions: Array<{ placePrediction?: { placeId: string; text?: { text: string }; mainText?: { text: string }; secondaryText?: { text: string } } }> }>;
          };
        };
        if (!places.AutocompleteSuggestion || !sessionTokenRef.current) return;
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(
          suggestions
            .map((s) => s.placePrediction)
            .filter((p): p is NonNullable<typeof p> => !!p)
            .slice(0, 6)
            .map((p) => ({
              placeId: p.placeId,
              primary: p.mainText?.text ?? p.text?.text ?? "",
              secondary: p.secondaryText?.text ?? "",
            })),
        );
        setOpen(true);
      } catch {
        // silent
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const pickSuggestion = async (placeId: string, primary: string, secondary: string) => {
    if (!window.google) return;
    setOpen(false);
    const label = [primary, secondary].filter(Boolean).join(", ");
    setQuery(label);
    // Fetch place details via legacy Places lib for coordinates (works with browser key)
    // Use new Place API
    const Place = (window.google.maps.places as unknown as {
      Place?: new (o: { id: string }) => {
        fetchFields: (o: { fields: string[] }) => Promise<void>;
        location?: { lat: () => number; lng: () => number };
        formattedAddress?: string;
        addressComponents?: google.maps.GeocoderAddressComponent[];
      };
    }).Place;
    if (!Place) return;
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: ["location", "formattedAddress", "addressComponents"] });
    const loc = place.location;
    if (!loc) return;
    const lat = loc.lat();
    const lng = loc.lng();
    const addr = place.formattedAddress ?? label;
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(16);
    markerRef.current?.setPosition({ lat, lng });
    setQuery(addr);
    emit(addr, lat, lng, place.addressComponents);
    // Refresh session token after selection (billing best-practice)
    if (window.google) sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  };

  // Manual fallback: commits whatever the user typed as the address, with no
  // coordinates. This is the only path that works when Google Maps fails to
  // load or the Places API is rejected (RefererNotAllowedMapError, 403, etc.)
  // — without it, typing into the box never reaches the parent form's state
  // and checkout/signup can never proceed.
  const commitManualAddress = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || trimmed === value.address.trim()) return;
    emit(trimmed, null, null);
  }, [query, value.address, emit]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.panTo({ lat: latitude, lng: longitude });
        mapRef.current?.setZoom(16);
        markerRef.current?.setPosition({ lat: latitude, lng: longitude });
        reverseGeocode(latitude, longitude);
      },
      () => { /* denied */ },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputEl}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setOpen(true)}
            onBlur={() => setTimeout(() => {
              setOpen(false);
              if (!pickingRef.current) commitManualAddress();
            }, 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setOpen(false);
                if (!pickingRef.current) commitManualAddress();
              }
            }}
            placeholder="Search address, area, landmark…"
            className="pl-9 pr-10"
            maxLength={300}
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            title="Use my current location"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md bg-popover text-popover-foreground shadow-lg max-h-72 overflow-auto">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickingRef.current = true;
                  pickSuggestion(s.placeId, s.primary, s.secondary).finally(() => { pickingRef.current = false; });
                }}
                className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 border-b last:border-b-0"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.primary}</p>
                  {s.secondary && <p className="text-xs text-muted-foreground truncate">{s.secondary}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden" style={{ height: 300 }}>
        <div ref={mapEl} className="absolute inset-0 bg-muted" />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading map…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60 p-4 text-center">
            <p className="text-sm text-red-600">Couldn't load map: {error}</p>
            <p className="text-xs text-muted-foreground max-w-xs">No problem — just type your address in the box above and continue. You won't need the map to finish checkout.</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry map</Button>
          </div>
        )}
      </div>

      {value.lat != null && value.lng != null && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-emerald-600" />
          Pinned at {value.lat.toFixed(5)}, {value.lng.toFixed(5)} — drag the marker or tap the map to fine-tune.
        </p>
      )}
    </div>
  );
}

export default AddressMapPicker;