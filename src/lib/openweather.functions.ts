import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const base = "https://api.openweathermap.org";

function key() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new Error("OPENWEATHER_API_KEY not configured");
  return k;
}

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OpenWeather ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json();
}

export const geocodeCity = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ city: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${base}/geo/1.0/direct?q=${encodeURIComponent(data.city)}&limit=1&appid=${key()}`;
    const j = (await fetchJson(url)) as Array<{ lat: number; lon: number; name: string; country: string }>;
    const first = Array.isArray(j) ? j[0] : null;
    if (!first) throw new Error("City not found");
    return { lat: first.lat, lon: first.lon, name: first.name, country: first.country };
  });

export const getWeatherBundle = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ lat: z.number(), lon: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const k = key();
    const q = `lat=${data.lat}&lon=${data.lon}&appid=${k}`;
    const [current, forecast, aqi] = await Promise.all([
      fetchJson(`${base}/data/2.5/weather?${q}&units=metric`),
      fetchJson(`${base}/data/2.5/forecast?${q}&units=metric`),
      fetchJson(`${base}/data/2.5/air_pollution?${q}`),
    ]);
    return { current, forecast, aqi };
  });