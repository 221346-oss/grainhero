"use client"

import { useMemo, useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  BarChart3, Cloud, MapPin, Thermometer, Droplets, Wind, Gauge, Sun, Eye,
  Sunrise, Sunset, CloudRain, Snowflake, CloudLightning
} from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts"

/* ---------- Expanded OpenWeather Interfaces ---------- */
interface OWCurrent {
  main?: {
    temp?: number
    feels_like?: number
    humidity?: number
    pressure?: number
    temp_min?: number
    temp_max?: number
    sea_level?: number
    grnd_level?: number
  }
  wind?: { speed?: number; deg?: number; gust?: number }
  visibility?: number
  clouds?: { all?: number }
  rain?: { "1h"?: number; "3h"?: number }
  snow?: { "1h"?: number; "3h"?: number }
  weather?: Array<{ id?: number; main?: string; description?: string; icon?: string }>
  name?: string
  coord?: { lat: number; lon: number }
  sys?: { country?: string; sunrise?: number; sunset?: number }
  dt?: number
  timezone?: number
}

interface OWForecastItem {
  dt: number
  main: { temp: number; humidity: number; feels_like?: number; pressure?: number }
  wind?: { speed?: number; deg?: number; gust?: number }
  rain?: { "3h"?: number }
  snow?: { "3h"?: number }
  clouds?: { all?: number }
  weather?: Array<{ description?: string; icon?: string }>
}

interface AQIComponents {
  co?: number
  no?: number
  no2?: number
  o3?: number
  so2?: number
  pm2_5?: number
  pm10?: number
  nh3?: number
}

/* ---------- Component ---------- */
export default function EnvironmentalPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [cityQuery, setCityQuery] = useState("")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [current, setCurrent] = useState<OWCurrent | null>(null)
  const [forecast, setForecast] = useState<OWForecastItem[]>([])
  const [aqi, setAqi] = useState<number | null>(null)
  const [aqiComponents, setAqiComponents] = useState<AQIComponents | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<Array<{ error: string; solution: string }>>([])

  const apiKey =
    (typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).__OW_KEY as string : undefined) ||
    process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY

  const resolveCity = async () => {
    try {
      if (!apiKey) {
        setDiagnostics(prev => [...prev, { error: "Missing OpenWeather API key", solution: "Set NEXT_PUBLIC_OPENWEATHER_API_KEY in frontend .env.local" }])
        toast.error("Missing OpenWeather API key")
        return null
      }
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityQuery)}&limit=1&appid=${apiKey}`
      const res = await fetch(url)
      const json = await res.json()
      const first = Array.isArray(json) ? json[0] : null
      if (!first) { toast.error("City not found"); return null }
      return { lat: first.lat as number, lon: first.lon as number }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown"
      toast.error(`Geocode error: ${msg}`)
      return null
    }
  }

  const loadWeather = async (lat: number, lon: number) => {
    try {
      if (!apiKey) return
      const base = "https://api.openweathermap.org/data/2.5"
      const [curRes, forecastRes, aqiRes] = await Promise.all([
        fetch(`${base}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
        fetch(`${base}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
        fetch(`${base}/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`),
      ])
      const cur = await curRes.json().catch(() => ({}))
      const fc = await forecastRes.json().catch(() => ({}))
      const aq = await aqiRes.json().catch(() => ({}))
      setCurrent(cur as OWCurrent)
      setForecast((fc?.list ?? []) as OWForecastItem[])
      const aqiIndex = aq?.list?.[0]?.main?.aqi ?? null
      setAqi(aqiIndex)
      setAqiComponents(aq?.list?.[0]?.components ?? null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown"
      toast.error(`Weather load error: ${msg}`)
      setDiagnostics(prev => [...prev, { error: `Weather load error: ${msg}`, solution: "Check API key and network" }])
    }
  }

  const useMyLocation = async () => {
    try {
      if (!navigator.geolocation) { toast.error("Geolocation not available"); return }
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setCoords(c)
        await loadWeather(c.lat, c.lon)
      }, (err) => { toast.error(`Location error: ${err.message}`) })
    } catch { /* ignore */ }
  }

  /* 5-day forecast data */
  const forecastSeries = useMemo(
    () => forecast.map((it) => ({
      ts: new Date(it.dt * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      temp: it.main?.temp ?? null,
      feels: it.main?.feels_like ?? null,
      humidity: it.main?.humidity ?? null,
      pressure: it.main?.pressure ?? null,
      wind: it.wind?.speed ?? null,
      rain: it.rain?.["3h"] ?? 0,
      snow: it.snow?.["3h"] ?? 0,
      clouds: it.clouds?.all ?? 0,
    })),
    [forecast],
  )

  /* Live silo telemetry */
  const [liveSilo, setLiveSilo] = useState<null | {
    temperature: number; humidity: number; tvoc: number; fanState: string;
    lidState: string; mlDecision: string; riskIndex: number | null;
    dewPoint: number | null; pressure: number | null; timestamp: number;
  }>(null)
  const backendUrl2 = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>).__BACKEND_URL : undefined) as string || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  useEffect(() => {
    let mounted = true
    const devId = process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760'
    const poll = async () => {
      try {
        const r = await fetch(`${backendUrl2}/api/iot/silos/${devId}/telemetry-public`)
        if (!r.ok || !mounted) return
        const d = await r.json()
        if (mounted) setLiveSilo(d)
      } catch { /* ignore */ }
    }
    poll()
    const i = setInterval(poll, 3000)
    return () => { mounted = false; clearInterval(i) }
  }, [backendUrl2])

  /* Helpers */
  const formatTime = (unix?: number) => unix ? new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'
  const windDir = (deg?: number) => {
    if (deg === undefined) return '--'
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return dirs[Math.round(deg / 22.5) % 16]
  }
  const aqiLabel = (v: number | null) => {
    if (v === null) return '--'
    return ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][v] || '--'
  }
  const aqiColor = (v: number | null) => {
    if (v === null) return 'text-gray-500'
    return ['', 'text-green-600', 'text-lime-600', 'text-yellow-600', 'text-orange-600', 'text-red-600'][v] || 'text-gray-500'
  }
  const weatherIcon = (code?: string) => {
    if (!code) return null
    return `https://openweathermap.org/img/wn/${code}@2x.png`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Environmental Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full OpenWeather snapshot • AQI pollutants • 5-day forecast • Live silo microclimate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Diagnostics</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Errors & Solutions</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {diagnostics.length === 0
                  ? <p className="text-sm text-gray-600">No errors captured.</p>
                  : diagnostics.map((d, idx) => (
                    <div key={idx} className="p-3 border rounded-md">
                      <div className="text-sm font-medium">{d.error}</div>
                      <div className="text-xs text-gray-600 mt-1">{d.solution}</div>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Location picker */}
      <Card className="bg-gradient-to-br from-sky-50 to-blue-50/40 border-2 border-transparent hover:border-sky-200 transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-600" /> Select Location</CardTitle>
          <CardDescription>Type a city or use your current location</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input className="w-[260px]" placeholder="Enter city (e.g., Lahore)" value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} />
          <Button onClick={async () => { const c = await resolveCity(); if (c) { setCoords(c); await loadWeather(c.lat, c.lon) } }}>Search</Button>
          <Button variant="outline" onClick={useMyLocation}>Use My Location</Button>
          {!!coords && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════ CURRENT SNAPSHOT ═══════════════════ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" /> Current Weather
              </CardTitle>
              <CardDescription>
                {current ? `${current.name || 'Selected location'}${current.sys?.country ? ', ' + current.sys.country : ''} • ${new Date().toLocaleString()}` : "Waiting for data"}
              </CardDescription>
            </div>
            {current?.weather?.[0] && (
              <div className="flex items-center gap-2">
                {weatherIcon(current.weather[0].icon) && (
                  <Image src={weatherIcon(current.weather[0].icon)!} alt="Weather icon" width={56} height={56} className="-my-2" />
                )}
                <span className="text-sm font-medium capitalize text-gray-600">{current.weather[0].description}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Row 1: Primary metrics */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 text-sm">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/40 border border-orange-100">
              <div className="text-xs uppercase text-orange-600 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperature</div>
              <div className="text-2xl font-bold text-orange-700">{current?.main?.temp !== undefined ? `${current.main.temp.toFixed(1)}°C` : '--'}</div>
              <div className="text-xs text-orange-500 mt-0.5">Feels like {current?.main?.feels_like?.toFixed(1) ?? '--'}°C</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-100">
              <div className="text-xs uppercase text-blue-600 flex items-center gap-1"><Droplets className="h-3 w-3" /> Humidity</div>
              <div className="text-2xl font-bold text-blue-700">{current?.main?.humidity ?? '--'}%</div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/40 border border-purple-100">
              <div className="text-xs uppercase text-purple-600 flex items-center gap-1"><Gauge className="h-3 w-3" /> Pressure</div>
              <div className="text-2xl font-bold text-purple-700">{current?.main?.pressure ?? '--'} <span className="text-sm font-normal">hPa</span></div>
              {current?.main?.grnd_level && <div className="text-xs text-purple-500 mt-0.5">Ground: {current.main.grnd_level} hPa</div>}
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100/40 border border-cyan-100">
              <div className="text-xs uppercase text-cyan-600 flex items-center gap-1"><Wind className="h-3 w-3" /> Wind</div>
              <div className="text-2xl font-bold text-cyan-700">{current?.wind?.speed ?? '--'} <span className="text-sm font-normal">m/s</span></div>
              <div className="text-xs text-cyan-500 mt-0.5">
                {windDir(current?.wind?.deg)} {current?.wind?.gust ? `• Gust ${current.wind.gust} m/s` : ''}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/40 border border-indigo-100">
              <div className="text-xs uppercase text-indigo-600 flex items-center gap-1"><CloudRain className="h-3 w-3" /> Rainfall</div>
              <div className="text-2xl font-bold text-indigo-700">{current?.rain?.["1h"] ?? 0} <span className="text-sm font-normal">mm/h</span></div>
              {(current?.rain?.["3h"] !== undefined && current.rain["3h"]! > 0) && <div className="text-xs text-indigo-500 mt-0.5">3h: {current.rain["3h"]} mm</div>}
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/40 border border-slate-100">
              <div className="text-xs uppercase text-slate-600 flex items-center gap-1"><Snowflake className="h-3 w-3" /> Snow</div>
              <div className="text-2xl font-bold text-slate-700">{current?.snow?.["1h"] ?? 0} <span className="text-sm font-normal">mm/h</span></div>
            </div>
          </div>
          {/* Row 2: Secondary metrics */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5 mt-3 text-sm">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-xs uppercase text-gray-500"><Eye className="h-3 w-3 inline mr-1" />Visibility</div>
              <div className="text-lg font-semibold">{current?.visibility !== undefined ? `${(current.visibility / 1000).toFixed(1)} km` : '--'}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-xs uppercase text-gray-500"><Cloud className="h-3 w-3 inline mr-1" />Cloudiness</div>
              <div className="text-lg font-semibold">{current?.clouds?.all ?? '--'}%</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-xs uppercase text-gray-500"><Thermometer className="h-3 w-3 inline mr-1" />Min / Max</div>
              <div className="text-lg font-semibold">{current?.main?.temp_min?.toFixed(1) ?? '--'}° / {current?.main?.temp_max?.toFixed(1) ?? '--'}°</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="text-xs uppercase text-amber-600"><Sunrise className="h-3 w-3 inline mr-1" />Sunrise</div>
              <div className="text-lg font-semibold text-amber-700">{formatTime(current?.sys?.sunrise)}</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <div className="text-xs uppercase text-indigo-600"><Sunset className="h-3 w-3 inline mr-1" />Sunset</div>
              <div className="text-lg font-semibold text-indigo-700">{formatTime(current?.sys?.sunset)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════ AQI + POLLUTANTS ═══════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CloudLightning className="h-5 w-5 text-green-600" /> Air Quality Index</CardTitle>
          <CardDescription>Real-time air pollution data from OpenWeather</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-4xl font-bold ${aqiColor(aqi)}`}>{aqi ?? '--'}</div>
            <div>
              <div className={`text-lg font-semibold ${aqiColor(aqi)}`}>{aqiLabel(aqi)}</div>
              <div className="text-xs text-gray-500">1 = Good … 5 = Very Poor</div>
            </div>
          </div>
          {aqiComponents && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
              {[
                { label: 'PM2.5', value: aqiComponents.pm2_5, unit: 'μg/m³', color: 'text-red-600' },
                { label: 'PM10', value: aqiComponents.pm10, unit: 'μg/m³', color: 'text-orange-600' },
                { label: 'O₃ (Ozone)', value: aqiComponents.o3, unit: 'μg/m³', color: 'text-blue-600' },
                { label: 'NO₂', value: aqiComponents.no2, unit: 'μg/m³', color: 'text-purple-600' },
                { label: 'SO₂', value: aqiComponents.so2, unit: 'μg/m³', color: 'text-amber-600' },
                { label: 'CO', value: aqiComponents.co, unit: 'μg/m³', color: 'text-gray-600' },
                { label: 'NO', value: aqiComponents.no, unit: 'μg/m³', color: 'text-teal-600' },
                { label: 'NH₃', value: aqiComponents.nh3, unit: 'μg/m³', color: 'text-lime-600' },
              ].map((p) => (
                <div key={p.label} className="p-2 rounded-lg border bg-white">
                  <div className="text-xs text-gray-500">{p.label}</div>
                  <div className={`text-lg font-bold ${p.color}`}>{p.value?.toFixed(1) ?? '--'} <span className="text-xs font-normal text-gray-400">{p.unit}</span></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════ FORECAST CHART ═══════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 5-Day Forecast (3-hourly)</CardTitle>
          <CardDescription>Temperature, rainfall, humidity & wind over time</CardDescription>
        </CardHeader>
        <CardContent>
          {forecastSeries.length > 0 ? (
            <div className="space-y-6">
              {/* Temp + Feels Like */}
              <div>
                <h4 className="text-sm font-medium mb-2">Temperature & Feels Like</h4>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="ts" interval={Math.max(1, Math.floor(forecastSeries.length / 8))} tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="Temp (°C)" />
                      <Line type="monotone" dataKey="feels" stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Feels Like (°C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Rainfall + Snow */}
              <div>
                <h4 className="text-sm font-medium mb-2">Precipitation (Rain & Snow)</h4>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="ts" interval={Math.max(1, Math.floor(forecastSeries.length / 8))} tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="rain" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.4} name="Rain (mm/3h)" />
                      <Area type="monotone" dataKey="snow" stroke="#6366f1" fill="#a5b4fc" fillOpacity={0.3} name="Snow (mm/3h)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Humidity + Wind */}
              <div>
                <h4 className="text-sm font-medium mb-2">Humidity & Wind Speed</h4>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="ts" interval={Math.max(1, Math.floor(forecastSeries.length / 8))} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="humidity" stroke="#059669" strokeWidth={2} dot={false} name="Humidity (%)" />
                      <Line yAxisId="right" type="monotone" dataKey="wind" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Wind (m/s)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Search for a city or use your location to see forecast data.</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════ LIVE SILO MICROCLIMATE ═══════════════════ */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-2 border-transparent hover:border-emerald-200 transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-emerald-600" /> Indoor Silo Microclimate
            {liveSilo && <Badge variant="outline" className="text-green-600 border-green-300 ml-auto">● Live</Badge>}
          </CardTitle>
          <CardDescription>
            {liveSilo ? `Real-time Firebase data • Updated ${new Date(liveSilo.timestamp).toLocaleString()}` : 'Waiting for silo data...'}
          </CardDescription>
        </CardHeader>
        {liveSilo ? (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 text-sm">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                <div className="text-xs uppercase text-red-500">Temp</div>
                <div className="text-xl font-bold text-red-700">{liveSilo.temperature.toFixed(1)}°C</div>
              </div>
              <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100 text-center">
                <div className="text-xs uppercase text-cyan-500">Humidity</div>
                <div className="text-xl font-bold text-cyan-700">{liveSilo.humidity.toFixed(1)}%</div>
              </div>
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-100 text-center">
                <div className="text-xs uppercase text-violet-500">TVOC</div>
                <div className="text-xl font-bold text-violet-700">{liveSilo.tvoc} ppb</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
                <div className="text-xs uppercase text-amber-500">Fan</div>
                <div className="text-xl font-bold text-amber-700">{liveSilo.fanState.toUpperCase()}</div>
              </div>
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-100 text-center">
                <div className="text-xs uppercase text-sky-500">ML Decision</div>
                <div className="text-xl font-bold text-sky-700 capitalize">{liveSilo.mlDecision}</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-center">
                <div className="text-xs uppercase text-rose-500">Risk</div>
                <div className={`text-xl font-bold ${(liveSilo.riskIndex ?? 0) > 70 ? 'text-red-600' : (liveSilo.riskIndex ?? 0) > 40 ? 'text-yellow-600' : 'text-green-600'}`}>{liveSilo.riskIndex ?? '--'}/100</div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
              {liveSilo.dewPoint !== null && (
                <div className="flex justify-between p-2 border rounded bg-white/60">
                  <span className="text-muted-foreground">Dew Point</span>
                  <span className="font-semibold">{liveSilo.dewPoint}°C</span>
                </div>
              )}
              {liveSilo.pressure !== null && (
                <div className="flex justify-between p-2 border rounded bg-white/60">
                  <span className="text-muted-foreground">Silo Pressure</span>
                  <span className="font-semibold">{liveSilo.pressure} hPa</span>
                </div>
              )}
              <div className="flex justify-between p-2 border rounded bg-white/60">
                <span className="text-muted-foreground">Lid State</span>
                <span className="font-semibold">{liveSilo.lidState.toUpperCase()}</span>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading silo telemetry...</p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
