import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart3, Cloud, MapPin, Thermometer, Droplets, Wind, Gauge, Sun, Eye,
  Sunrise, Sunset, CloudRain, Snowflake, CloudLightning, Activity,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { NEON, NeonPatternDefs, neonFill, neonGrid, neonAxis, neonTooltipStyle, ChartEmpty, HairlineGrid, NeonPanel } from "@/components/charts/neon";
import { geocodeCity, getWeatherBundle } from "@/lib/openweather.functions";
import { useFirebaseAllSensors } from "@/hooks/use-firebase-sensor";

export const Route = createFileRoute("/_authenticated/environmental")({
  component: EnvironmentalPage,
});

interface OWCurrent {
  main?: { temp?: number; feels_like?: number; humidity?: number; pressure?: number; temp_min?: number; temp_max?: number; grnd_level?: number };
  wind?: { speed?: number; deg?: number; gust?: number };
  visibility?: number;
  clouds?: { all?: number };
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
  weather?: Array<{ main?: string; description?: string; icon?: string }>;
  name?: string;
  sys?: { country?: string; sunrise?: number; sunset?: number };
}
interface OWForecastItem {
  dt: number;
  main: { temp: number; humidity: number; feels_like?: number; pressure?: number };
  wind?: { speed?: number };
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
  clouds?: { all?: number };
}
interface AQIComponents { co?: number; no?: number; no2?: number; o3?: number; so2?: number; pm2_5?: number; pm10?: number; nh3?: number }

function windDir(deg?: number) {
  if (deg === undefined) return "--";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
function fmtTime(unix?: number) { return unix ? new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"; }
function aqiLabel(v: number | null) { return v === null ? "--" : (["", "Good", "Fair", "Moderate", "Poor", "Very Poor"][v] ?? "--"); }
function aqiColor(v: number | null) { return v === null ? "text-slate-500" : (["", "text-emerald-600", "text-lime-600", "text-yellow-600", "text-orange-600", "text-red-600"][v] ?? "text-slate-500"); }

function EnvironmentalPage() {
  const geoFn = useServerFn(geocodeCity);
  const bundleFn = useServerFn(getWeatherBundle);

  const [cityQuery, setCityQuery] = useState("Lahore");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const geo = useMutation({
    mutationFn: (city: string) => geoFn({ data: { city } }),
    onSuccess: (d) => { setCoords({ lat: d.lat, lon: d.lon }); toast.success(`${d.name}, ${d.country}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const weather = useQuery({
    queryKey: ["weather-bundle", coords?.lat, coords?.lon],
    queryFn: () => bundleFn({ data: coords! }),
    enabled: !!coords,
    refetchInterval: 5 * 60_000,
  });

  const current = weather.data?.current as OWCurrent | undefined;
  const forecastList = (weather.data?.forecast as { list?: OWForecastItem[] } | undefined)?.list ?? [];
  const aqiPayload = weather.data?.aqi as { list?: Array<{ main?: { aqi?: number }; components?: AQIComponents }> } | undefined;
  const aqi = aqiPayload?.list?.[0]?.main?.aqi ?? null;
  const aqiComp = aqiPayload?.list?.[0]?.components ?? null;

  const forecastSeries = useMemo(() => forecastList.map((it) => ({
    ts: new Date(it.dt * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
    temp: it.main?.temp ?? null,
    feels: it.main?.feels_like ?? null,
    humidity: it.main?.humidity ?? null,
    wind: it.wind?.speed ?? null,
    rain: it.rain?.["3h"] ?? 0,
    snow: it.snow?.["3h"] ?? 0,
  })), [forecastList]);

  useEffect(() => { if (!coords) geo.mutate(cityQuery); /* eslint-disable-next-line */ }, []);

  // Show skeleton while initial geocoding + weather fetches resolve
  const isInitialLoading = geo.isPending || (!!coords && weather.isFetching && !weather.data);
  
  if (isInitialLoading) return <KpiChartHubSkeleton />;

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => toast.error(`Location error: ${err.message}`),
    );
  };

  // Live silo microclimate from Firebase (all sensors)
  const { readings: liveSensors } = useFirebaseAllSensors();
  const firstDeviceId = Object.keys(liveSensors)[0];
  const liveSilo = firstDeviceId ? liveSensors[firstDeviceId] : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <NeonPatternDefs />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Environmental Data</h1>
          <p className="text-sm text-muted-foreground mt-1">OpenWeather snapshot · AQI · 5-day forecast · Live silo microclimate</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-sky-50 to-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-600" /> Select Location</CardTitle>
          <CardDescription>Type a city or use your current location</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input className="w-[260px]" placeholder="e.g. Lahore" value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") geo.mutate(cityQuery); }} />
          <Button onClick={() => geo.mutate(cityQuery)} disabled={geo.isPending}>Search</Button>
          <Button variant="outline" onClick={useMyLocation}>Use My Location</Button>
          {coords && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{coords.lat.toFixed(3)}, {coords.lon.toFixed(3)}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5 text-yellow-500" /> Current Weather</CardTitle>
              <CardDescription>{current ? `${current.name ?? "Selected"}${current.sys?.country ? ", " + current.sys.country : ""} • ${new Date().toLocaleString()}` : "Waiting for data"}</CardDescription>
            </div>
            {current?.weather?.[0]?.icon && (
              <div className="flex items-center gap-2">
                <img src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`} alt="" width={56} height={56} />
                <span className="text-sm font-medium capitalize text-slate-600">{current.weather[0].description}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 text-sm">
            <Metric icon={Thermometer} label="Temp" value={current?.main?.temp !== undefined ? `${current.main.temp.toFixed(1)}°C` : "--"} sub={`Feels ${current?.main?.feels_like?.toFixed(1) ?? "--"}°C`} color="orange" />
            <Metric icon={Droplets} label="Humidity" value={`${current?.main?.humidity ?? "--"}%`} color="blue" />
            <Metric icon={Gauge} label="Pressure" value={`${current?.main?.pressure ?? "--"} hPa`} color="purple" />
            <Metric icon={Wind} label="Wind" value={`${current?.wind?.speed ?? "--"} m/s`} sub={windDir(current?.wind?.deg)} color="cyan" />
            <Metric icon={CloudRain} label="Rain" value={`${current?.rain?.["1h"] ?? 0} mm/h`} color="indigo" />
            <Metric icon={Snowflake} label="Snow" value={`${current?.snow?.["1h"] ?? 0} mm/h`} color="slate" />
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5 mt-3 text-sm">
            <MiniMetric icon={Eye} label="Visibility" value={current?.visibility !== undefined ? `${(current.visibility / 1000).toFixed(1)} km` : "--"} />
            <MiniMetric icon={Cloud} label="Cloudiness" value={`${current?.clouds?.all ?? "--"}%`} />
            <MiniMetric icon={Thermometer} label="Min / Max" value={`${current?.main?.temp_min?.toFixed(1) ?? "--"}° / ${current?.main?.temp_max?.toFixed(1) ?? "--"}°`} />
            <MiniMetric icon={Sunrise} label="Sunrise" value={fmtTime(current?.sys?.sunrise)} />
            <MiniMetric icon={Sunset} label="Sunset" value={fmtTime(current?.sys?.sunset)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CloudLightning className="h-5 w-5 text-emerald-600" /> Air Quality Index</CardTitle>
          <CardDescription>Real-time pollutants from OpenWeather</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-4xl font-bold ${aqiColor(aqi)}`}>{aqi ?? "--"}</div>
            <div>
              <div className={`text-lg font-semibold ${aqiColor(aqi)}`}>{aqiLabel(aqi)}</div>
              <div className="text-xs text-slate-500">1 = Good … 5 = Very Poor</div>
            </div>
          </div>
          {aqiComp && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
              {[
                ["PM2.5", aqiComp.pm2_5, "text-red-600"],
                ["PM10", aqiComp.pm10, "text-orange-600"],
                ["O₃", aqiComp.o3, "text-blue-600"],
                ["NO₂", aqiComp.no2, "text-purple-600"],
                ["SO₂", aqiComp.so2, "text-amber-600"],
                ["CO", aqiComp.co, "text-slate-600"],
                ["NO", aqiComp.no, "text-teal-600"],
                ["NH₃", aqiComp.nh3, "text-lime-600"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="p-2 rounded-lg border bg-white">
                  <div className="text-xs text-slate-500">{label as string}</div>
                  <div className={`text-lg font-bold ${color as string}`}>{typeof value === "number" ? value.toFixed(1) : "--"} <span className="text-xs font-normal text-slate-400">μg/m³</span></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 5-Day Forecast (3-hourly)</CardTitle>
        </CardHeader>
        <CardContent>
          {forecastSeries.length > 0 ? (
            <HairlineGrid cols="grid-cols-1" className="!bg-transparent !border-0">
              <NeonPanel title="Temperature & Feels-like" className="border border-border rounded-md">
                <ForecastChart>
                  <LineChart data={forecastSeries}>
                    <CartesianGrid {...neonGrid} />
                    <XAxis dataKey="ts" interval={Math.floor(forecastSeries.length / 8)} {...neonAxis} />
                    <YAxis {...neonAxis} />
                    <Tooltip {...neonTooltipStyle} />
                    <Line type="monotone" dataKey="temp" stroke={NEON.brand} strokeWidth={2} dot={false} name="Temp (°C)" />
                    <Line type="monotone" dataKey="feels" stroke={NEON.amber} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Feels (°C)" />
                  </LineChart>
                </ForecastChart>
              </NeonPanel>
              <NeonPanel title="Precipitation" className="border border-border rounded-md">
                <ForecastChart>
                  <AreaChart data={forecastSeries}>
                    <CartesianGrid {...neonGrid} />
                    <XAxis dataKey="ts" interval={Math.floor(forecastSeries.length / 8)} {...neonAxis} />
                    <YAxis {...neonAxis} />
                    <Tooltip {...neonTooltipStyle} />
                    <Area type="monotone" dataKey="rain" name="Rain mm/3h" {...neonFill(NEON.info)} />
                    <Area type="monotone" dataKey="snow" name="Snow mm/3h" {...neonFill(NEON.brand2)} />
                  </AreaChart>
                </ForecastChart>
              </NeonPanel>
              <NeonPanel title="Humidity & Wind" className="border border-border rounded-md">
                <ForecastChart>
                  <LineChart data={forecastSeries}>
                    <CartesianGrid {...neonGrid} />
                    <XAxis dataKey="ts" interval={Math.floor(forecastSeries.length / 8)} {...neonAxis} />
                    <YAxis yAxisId="left" {...neonAxis} /><YAxis yAxisId="right" orientation="right" {...neonAxis} />
                    <Tooltip {...neonTooltipStyle} />
                    <Line yAxisId="left" type="monotone" dataKey="humidity" stroke={NEON.brand} strokeWidth={2} dot={false} name="Humidity %" />
                    <Line yAxisId="right" type="monotone" dataKey="wind" stroke={NEON.info} strokeWidth={2} dot={false} name="Wind m/s" />
                  </LineChart>
                </ForecastChart>
              </NeonPanel>
            </HairlineGrid>
          ) : (
            <ChartEmpty label={weather.isFetching ? "Loading forecast…" : "Search for a city to see forecast."} height={200} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" /> Indoor Silo Microclimate
            {liveSilo && <Badge variant="outline" className="text-emerald-600 border-emerald-300 ml-auto">● Live</Badge>}
          </CardTitle>
          <CardDescription>{liveSilo ? `Firebase RTDB · ${firstDeviceId} · ${new Date(liveSilo.ts ?? Date.now()).toLocaleString()}` : "Waiting for silo data…"}</CardDescription>
        </CardHeader>
        <CardContent>
          {liveSilo ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 text-sm">
              <TileStat label="Temp" value={`${(liveSilo.temperature ?? 0).toFixed(1)}°C`} tone="red" />
              <TileStat label="Humidity" value={`${(liveSilo.humidity ?? 0).toFixed(1)}%`} tone="cyan" />
              <TileStat label="TVOC" value={`${liveSilo.voc ?? 0} ppb`} tone="violet" />
              <TileStat label="CO₂" value={`${liveSilo.co2 ?? 0} ppm`} tone="slate" />
              <TileStat label="Fan" value={String(liveSilo.fan_state ?? "off").toUpperCase()} tone="amber" />
              <TileStat label="Lid" value={String(liveSilo.lid_state ?? "closed").toUpperCase()} tone="sky" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No live device data yet. Ensure device is streaming to Firebase RTDB /devices/{"{deviceId}"}/live.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg bg-gradient-to-br from-${color}-50 to-${color}-100/40 border border-${color}-100`}>
      <div className={`text-xs uppercase text-${color}-600 flex items-center gap-1`}><Icon className="h-3 w-3" /> {label}</div>
      <div className={`text-2xl font-bold text-${color}-700`}>{value}</div>
      {sub && <div className={`text-xs text-${color}-500 mt-0.5`}>{sub}</div>}
    </div>
  );
}
function MiniMetric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="text-xs uppercase text-slate-500 flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function TileStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`p-3 rounded-lg bg-${tone}-50 border border-${tone}-100 text-center`}>
      <div className={`text-xs uppercase text-${tone}-500`}>{label}</div>
      <div className={`text-xl font-bold text-${tone}-700`}>{value}</div>
    </div>
  );
}
function ForecastChart({ children }: { children: React.ReactElement }) {
  return (
    <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
  );
}