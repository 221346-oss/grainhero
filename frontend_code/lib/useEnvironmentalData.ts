"use client";

import { useEffect, useMemo, useState } from "react";

export interface EnvironmentalRecord {
  _id?: string;
  timestamp: string;
  silo_id?: string;
  device_id?: string;
  batch_id?: string;
  environmental_context?: {
    weather?: {
      temperature?: number;
      humidity?: number;
      pressure?: number;
      wind_speed?: number;
      precipitation?: number;
      visibility?: number;
      cloudiness?: number;
      [key: string]: number | string | boolean | undefined;
    };
    air_quality_index?: number;
    sys?: {
      sunrise?: number;
      sunset?: number;
    };
  };
  derived_metrics?: {
    dew_point?: number;
    dew_point_gap?: number;
    condensation_risk?: boolean;
    airflow?: number;
    voc_baseline_24h?: number;
    voc_relative?: number;
    voc_relative_5min?: number;
    voc_relative_30min?: number;
    voc_rate_5min?: number;
    voc_rate_30min?: number;
    pest_presence_score?: number;
    pest_presence_flag?: boolean;
    guardrails?: {
      venting_blocked?: boolean;
      reasons?: string[];
    };
    ml_risk_class?: string;
    ml_risk_score?: number;
    fan_recommendation?: string;
    fan_guardrails_active?: boolean;
    [key: string]: number | string | boolean | object | undefined;
  };
  actuation_state?: {
    fan_state?: number;
    fan_status?: string;
    fan_speed_factor?: number;
    fan_duty_cycle?: number;
    fan_rpm?: number;
    last_command_source?: string;
    [key: string]: number | string | boolean | object | undefined;
  };
  temperature?: { value?: number };
  humidity?: { value?: number };
  ambient?: {
    temperature?: { value?: number };
    humidity?: { value?: number };
    light?: { value?: number };
  };
  moisture?: { value?: number };
}

export interface LocationOption {
  city: string;
  latitude: number;
  longitude: number;
  address?: string;
  silo_count: number;
  silos: Array<{ silo_id: string; name: string }>;
  weather?: Record<string, unknown>;
  air_quality?: Record<string, unknown>;
  impact_assessment?: Record<string, unknown>;
  aqi_level?: Record<string, unknown>;
  regional_analysis?: Record<string, unknown>;
}

interface UseEnvHistoryOptions {
  limit?: number; // Default: 50 for quick loads, use 288 for full 24h analysis
  latitude?: number;
  longitude?: number;
  forceFresh?: boolean; // Set to true to bypass cache and get real-time data
}

const backendUrl =
  (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__BACKEND_URL as string) ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

// Simple in-memory cache for API responses (client-side)
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 1000; // 15 seconds

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse<T>(key: string, data: T) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

export function useEnvironmentalHistory(options: UseEnvHistoryOptions = {}) {
  // Smart default: 50 for quick loads, but allow override for detailed analysis
  // Use 288 (24h of 5-min data) when you need full day visualization
  // Use 50 for dashboard cards and quick overviews
  const { limit = 50, latitude, longitude, forceFresh = false } = options;
  const [data, setData] = useState<EnvironmentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const customerId =
          (typeof window !== "undefined" && localStorage.getItem("customerId")) ||
          "default";

        const params = new URLSearchParams({ limit: String(limit) });
        if (latitude && longitude) {
          params.append("lat", String(latitude));
          params.append("lon", String(longitude));
        }
        // Allow bypassing cache for real-time data
        if (forceFresh) {
          params.append("fresh", "true");
        }

        // Check cache first (only if not forcing fresh)
        const cacheKey = `env-history-${customerId}-${limit}-${latitude}-${longitude}`;
        if (!forceFresh) {
          const cached = getCachedResponse<EnvironmentalRecord[]>(cacheKey);
          if (cached && mounted) {
            setData(cached);
            setLoading(false);
            return;
          }
        }

        const resp = await fetch(
          `${backendUrl}/api/environmental/history/${customerId}?${params.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!resp.ok) {
          throw new Error(`History request failed (${resp.status})`);
        }

        const json = await resp.json();
        const records: EnvironmentalRecord[] = json.data || [];
        
        // Cache the response
        setCachedResponse(cacheKey, records);
        
        if (mounted) {
          setData(records);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [limit, latitude, longitude, forceFresh]);

  const latest = useMemo(
    () => (data.length ? data[data.length - 1] : undefined),
    [data],
  );

  return { data, latest, loading, error };
}

export function useEnvironmentalLocations() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first (locations don't change often)
        const cacheKey = "env-locations";
        const cached = getCachedResponse<LocationOption[]>(cacheKey);
        if (cached && mounted) {
          setLocations(cached);
          setLoading(false);
          return;
        }
        
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const resp = await fetch(
          `${backendUrl}/api/environmental/my-locations`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!resp.ok) throw new Error(`Locations request failed`);
        const json = await resp.json();
        const options: LocationOption[] =
          json.data?.locations ||
          json.locations ||
          json.data ||
          [];
        
        // Cache the response (longer TTL for locations - 60 seconds)
        setCachedResponse(cacheKey, options);
        
        if (mounted) setLocations(options);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { locations, loading, error };
}

