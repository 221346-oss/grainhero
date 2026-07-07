import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface LocationOption {
  display_name: string;
  lat: string;
  lon: string;
  address: Record<string, string>;
}

interface LocationAutocompleteProps {
  value: LocationOption | null;
  onChange: (option: LocationOption | null) => void;
  label?: string;
  required?: boolean;
}

export default function LocationAutocomplete({ value, onChange, label = "Location", required = false }: LocationAutocompleteProps) {
  const [input, setInput] = useState(value ? value.display_name : "");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user's country code on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        if (data.address && data.address.country_code) {
          setCountryCode(data.address.country_code);
        }
      } catch {}
    });
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    if (!input || input.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const fetchOptions = async () => {
      try {
        const params = new URLSearchParams({
          q: input,
          format: "json",
          addressdetails: "1",
          limit: "10",
        });
        // Only restrict by country for short queries (less than 4 chars)
        if (countryCode && input.length < 4) params.append("countrycodes", countryCode);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: {
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        const data = await res.json();
        setOptions(data);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
    return () => controller.abort();
  }, [input, countryCode]);

  // Handle selection
  const handleSelect = (option: LocationOption) => {
    setInput(option.display_name);
    setOptions([]);
    setShowDropdown(false);
    onChange(option);
  };

  // Only allow selection from dropdown
  const handleBlur = () => {
    setTimeout(() => {
      if (!value || input !== value.display_name) {
        setInput("");
        onChange(null);
      }
      setShowDropdown(false);
    }, 150);
  };

  return (
    <div className="relative">
      {label && <label className="block font-medium mb-1">{label}</label>}
      <Input
        ref={inputRef}
        value={input}
        onChange={e => {
          setInput(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        required={required}
        autoComplete="off"
        placeholder="Enter address, business, or landmark..."
      />
      {showDropdown && (
        <ul className="absolute z-10 bg-white border rounded shadow w-full mt-1 max-h-60 overflow-auto p-0">
          {options.length === 0 && !loading && input.length > 1 && (
            <li className="px-4 py-3 text-gray-400 text-sm select-none">No locations found.</li>
          )}
          {options.map((option, idx) => {
            // Highlight matched part
            const matchIdx = option.display_name.toLowerCase().indexOf(input.toLowerCase());
            const before = option.display_name.slice(0, matchIdx);
            const match = option.display_name.slice(matchIdx, matchIdx + input.length);
            const after = option.display_name.slice(matchIdx + input.length);
            // Compose address details
            const addressParts = [
              option.address.road,
              option.address.suburb,
              option.address.city,
              option.address.state,
              option.address.country
            ].filter(Boolean);
            const addressStr = addressParts.join(", ");
            return (
              <li
                key={idx}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-100 cursor-pointer text-base border-b last:border-b-0"
                onMouseDown={() => handleSelect(option)}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="truncate">
                    {matchIdx >= 0 ? (
                      <>
                        <span className="text-gray-700">{before}</span>
                        <span className="font-bold text-black">{match}</span>
                        <span className="text-gray-700">{after}</span>
                      </>
                    ) : (
                      <span className="text-gray-700">{option.display_name}</span>
                    )}
                  </span>
                </div>
                {addressStr && (
                  <span className="ml-8 text-gray-500 text-xs truncate">{addressStr}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {loading && <div className="absolute right-2 top-2 text-gray-400 text-xs">Loading...</div>}
    </div>
  );
} 