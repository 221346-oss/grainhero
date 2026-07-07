"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Search, Smartphone, Wifi, Battery, AlertTriangle, CheckCircle, XCircle,
  Thermometer, Activity, Sun, Droplets, Wind, Eye, Gauge, Fan
} from 'lucide-react'
import { useEnvironmentalHistory } from '@/lib/useEnvironmentalData'

import { useLanguage } from '@/app/[locale]/providers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Socket } from 'socket.io-client'
let ioClient: typeof import('socket.io-client').io | null = null

interface SensorDevice {
  _id: string
  device_id: string
  device_name: string
  status: string
  sensor_types: string[]
  battery_level: number
  signal_strength: number
  silo_id: {
    name: string
    silo_id: string
  }
  last_reading: string
  health_metrics: {
    uptime_percentage: number
    error_count: number
    last_heartbeat: string
  }
}

interface TelemetryData {
  temperature: number
  humidity: number
  tvoc: number
  fanState: string
  lidState: string
  alarmState: string
  mlDecision: string
  humanOverride: boolean
  guardrails: string[]
  pressure: number | null
  light: number | null
  dewPoint: number | null
  soilMoisture: number | null
  pestRiskScore: number | null
  riskIndex: number | null
  timestamp: number
}

export default function SensorsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [sensors, setSensors] = useState<SensorDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { latest } = useEnvironmentalHistory({ limit: 50 })
  const { t } = useLanguage()
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{
    timestamp: number
    mlDecision: string
    fanState: string
    lidState: string
  }>>([])
  const [siloId, setSiloId] = useState<string>('')
  const backendUrl = (typeof window !== 'undefined' ? (window as typeof window & Record<string, unknown>).__BACKEND_URL : undefined) || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const socketRef = useRef<Socket | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, _setDiagnostics] = useState<Array<{ error: string; solution: string }>>([])

  // Initialize with fixed device id if provided
  useEffect(() => {
    const fixedId = process.env.NEXT_PUBLIC_DEVICE_ID
    if (fixedId) {
      setSiloId(prev => prev || fixedId)
    }
  }, [])

  // Load sensors from backend
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          const res = await fetch(`${backendUrl}/api/sensors?limit=100`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
          if (!mounted) return
          if (res.ok) {
            const data = await res.json()
            interface RawSensorData {
              _id?: string;
              device_id?: string;
              device_name?: string;
              status?: string;
              health_status?: string;
              sensor_types?: string[];
              battery_level?: number;
              signal_strength?: number;
              device_metrics?: { battery_level?: number; signal_strength?: number; };
              silo_id?: { name?: string; _id?: string; };
              health_metrics?: { uptime_percentage?: number; error_count?: number; last_heartbeat?: string; };
            }
            const mapped: SensorDevice[] = (data.sensors || []).map((s: RawSensorData) => ({
              _id: s._id || '',
              device_id: s.device_id || s._id || '',
              device_name: s.device_name || 'Unnamed Device',
              status: s.health_status === 'healthy' ? 'active' : (s.health_status || s.status || 'active'),
              sensor_types: s.sensor_types || [],
              battery_level: s.battery_level || s.device_metrics?.battery_level || 100,
              signal_strength: s.signal_strength || s.device_metrics?.signal_strength || -50,
              silo_id: s.silo_id ? { name: s.silo_id.name || 'Silo', silo_id: s.silo_id._id || '' } : { name: '-', silo_id: '' },
              last_reading: s.health_metrics?.last_heartbeat || new Date().toISOString(),
              health_metrics: s.health_metrics || { uptime_percentage: 99, error_count: 0, last_heartbeat: new Date().toISOString() }
            }))
            setSensors(mapped)
            if (!siloId && mapped.length > 0) {
              setSiloId(mapped[0].device_id)
            }
          } else {
            setSensors([])
          }
        } catch {
          if (!mounted) return
          setSensors([])
        } finally {
          if (!mounted) return
          setLoading(false)
        }
      })()
    return () => { mounted = false }
  }, [backendUrl, siloId])

  // Realtime: Socket.IO subscription
  useEffect(() => {
    let active = true
      ; (async () => {
        try {
          if (!siloId) return
          if (!ioClient) {
            const mod = await import('socket.io-client')
            ioClient = mod.io
          }
          const socket = ioClient!(backendUrl as string, { transports: ['websocket', 'polling'], path: '/socket.io' })
          socketRef.current = socket
          socket.on('connect', () => {
            if (!active) return
            setRealtimeConnected(true)
          })
          socket.on('connect_error', () => {
            if (!active) return
            setRealtimeConnected(false)
          })
          socket.on('sensor_reading', (msg: { type: string, data: Record<string, unknown>, timestamp: string | number }) => {
            if (!active) return
            try {
              const d = msg?.data as Record<string, unknown>
              const deviceId = (typeof d?.device_id === 'string' ? d.device_id : '') || ''
              if (!deviceId) return
              const temperature = ((d?.['temperature'] as { value?: number } | undefined)?.value) ?? 0
              const humidity = ((d?.['humidity'] as { value?: number } | undefined)?.value) ?? 0
              const tvocRaw = ((d?.['voc'] as { value?: number } | undefined)?.value) ?? 0
              const fanState = ((d?.['pwm_speed'] as number | undefined) && Number(d?.['pwm_speed']) > 0) ? 'on' : 'off'
              const lidState = d?.['servo_state'] ? 'open' : 'closed'
              const alarmState = d?.['alarm_state'] === 'on' ? 'on' : 'off'
              const mlDecision = (humidity > 75 || tvocRaw > 600) ? 'fan_on' : 'idle'
              const ts = Number(d?.['timestamp'] as number | string | undefined) || Date.now()
              setTelemetry(prev => ({
                ...(prev || {} as TelemetryData),
                temperature: Number(temperature),
                humidity: Number(humidity),
                tvoc: Number(tvocRaw),
                fanState, lidState, alarmState, mlDecision,
                humanOverride: false,
                guardrails: [],
                timestamp: ts
              }))
            } catch { /* ignore parse errors */ }
          })
        } catch {
          setRealtimeConnected(false)
        }
      })()
    return () => {
      active = false
      try { socketRef.current?.disconnect() } catch { }
      socketRef.current = null
    }
  }, [siloId, backendUrl])

  // Poll telemetry from PUBLIC endpoint (no auth required)
  useEffect(() => {
    let mounted = true
    const fetchTelemetry = async () => {
      if (!siloId) return
      try {
        // Use the public endpoint — no auth token needed
        const res = await fetch(`${backendUrl}/api/iot/silos/${siloId}/telemetry-public`)
        if (!mounted) return
        if (res.ok) {
          const data = await res.json()
          setTelemetry(data)
          setTelemetryHistory(prev => {
            const next = [...prev, { timestamp: data.timestamp, mlDecision: data.mlDecision, fanState: data.fanState, lidState: data.lidState }]
            return next.slice(-20)
          })
        }
      } catch { /* network error, will retry */ }
    }
    fetchTelemetry()
    const i = setInterval(fetchTelemetry, 3000)
    return () => { mounted = false; clearInterval(i) }
  }, [siloId, backendUrl])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      offline: { color: 'bg-red-100 text-red-800', icon: XCircle },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      error: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.offline
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600'
    if (level > 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSignalColor = (strength: number) => {
    if (strength > -50) return 'text-green-600'
    if (strength > -70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthStatus = (sensor: SensorDevice) => {
    if (sensor.status === 'offline') return 'Offline'
    if (sensor.battery_level < 20) return 'Low Battery'
    if (sensor.health_metrics.error_count > 10) return 'Errors Detected'
    if (sensor.health_metrics.uptime_percentage < 90) return 'Poor Connectivity'
    return 'Healthy'
  }

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.device_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sensor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getRiskColor = (risk: number | null) => {
    if (!risk) return 'text-gray-500'
    if (risk > 70) return 'text-red-600'
    if (risk > 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading sensors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{t('sensors')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live IoT sensor monitoring &bull; Environmental tracking &bull; Device {siloId || '004B12387760'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sensors.length > 0 ? (
            <Select value={siloId} onValueChange={setSiloId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {sensors.map(s => (
                  <SelectItem key={s.device_id} value={s.device_id}>
                    {s.device_name} ({s.device_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={siloId}
              onChange={e => setSiloId(e.target.value)}
              placeholder="Enter device ID"
              className="w-[220px]"
            />
          )}
          {!!siloId && (
            <Badge variant={realtimeConnected ? 'default' : 'outline'}>
              {realtimeConnected ? '● Live' : siloId}
            </Badge>
          )}
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Sensor
          </Button>
          <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
            <DialogTrigger asChild>
              <Button variant="outline">Diagnostics</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Errors & Solutions</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {diagnostics.length === 0 ? (
                  <p className="text-sm text-gray-600">No errors captured yet.</p>
                ) : diagnostics.map((d, idx) => (
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

      {/* === LIVE TELEMETRY PANEL === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Temperature */}
        <Card className="border-2 border-transparent hover:border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/40 transition-all duration-300 shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Temperature</CardTitle>
            <div className="p-1.5 rounded-lg bg-orange-100"><Thermometer className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">{telemetry?.temperature?.toFixed(1) ?? '--'}°C</div>
            <p className="text-xs text-orange-600/70 mt-1">
              {telemetry?.dewPoint !== null && telemetry?.dewPoint !== undefined
                ? `Dew Point: ${telemetry.dewPoint}°C`
                : 'Optimal range: 20-25°C'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-transparent hover:border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/40 transition-all duration-300 shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Humidity</CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-100"><Droplets className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{telemetry?.humidity?.toFixed(1) ?? '--'}%</div>
            <p className="text-xs text-blue-600/70 mt-1">
              {telemetry?.pressure ? `Pressure: ${telemetry.pressure} hPa` : 'Optimal range: 40-60%'}
            </p>
          </CardContent>
        </Card>

        {/* TVOC */}
        <Card className="border-2 border-transparent hover:border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/40 transition-all duration-300 shadow-sm hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-700">TVOC / Air Quality</CardTitle>
            <div className="p-1.5 rounded-lg bg-violet-100"><Wind className="h-4 w-4 text-violet-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-800">{telemetry?.tvoc ?? '--'} <span className="text-sm font-normal">ppb</span></div>
            <p className="text-xs text-violet-600/70 mt-1">
              {telemetry?.light !== null && telemetry?.light !== undefined
                ? `Light: ${telemetry.light} Lux`
                : '< 500 ppb is safe'}
            </p>
          </CardContent>
        </Card>

        {/* Risk Index */}
        <Card className={`border-2 border-transparent transition-all duration-300 shadow-sm hover:shadow-md ${(telemetry?.riskIndex ?? 0) > 70 ? 'bg-gradient-to-br from-red-50 to-red-100/40 hover:border-red-200' : (telemetry?.riskIndex ?? 0) > 40 ? 'bg-gradient-to-br from-amber-50 to-amber-100/40 hover:border-amber-200' : 'bg-gradient-to-br from-emerald-50 to-emerald-100/40 hover:border-emerald-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Risk Index</CardTitle>
            <div className="p-1.5 rounded-lg bg-gray-100"><Gauge className="h-4 w-4 text-gray-600" /></div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRiskColor(telemetry?.riskIndex ?? null)}`}>
              {telemetry?.riskIndex ?? '--'}
              <span className="text-sm font-normal"> / 100</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {telemetry?.pestRiskScore !== null && telemetry?.pestRiskScore !== undefined
                ? `Pest Risk: ${telemetry.pestRiskScore}%`
                : 'Composite score'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === ACTUATOR STATUS + ML DECISION === */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fan className="h-4 w-4" /> Actuator States
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <Badge variant={telemetry?.fanState === 'on' ? 'default' : 'outline'} className={telemetry?.fanState === 'on' ? 'bg-green-600' : ''}>
                  Fan {telemetry?.fanState?.toUpperCase() || 'OFF'}
                </Badge>
              </div>
              <div>
                <Badge variant={telemetry?.lidState === 'open' ? 'default' : 'outline'} className={telemetry?.lidState === 'open' ? 'bg-blue-600' : ''}>
                  Lid {telemetry?.lidState?.toUpperCase() || 'CLOSED'}
                </Badge>
              </div>
              <div>
                <Badge variant={telemetry?.alarmState === 'on' ? 'destructive' : 'outline'}>
                  Alarm {telemetry?.alarmState?.toUpperCase() || 'OFF'}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">
              {telemetry ? `Updated: ${new Date(telemetry.timestamp).toLocaleString()}` : 'Waiting for data...'}
            </div>
          </CardContent>
        </Card>

        <Card className={telemetry?.mlDecision === 'fan_on' ? 'ring-2 ring-green-400' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> ML Decision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {telemetry?.mlDecision || '--'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={telemetry?.humanOverride ? 'bg-yellow-100 text-yellow-800' : ''}>
                {telemetry?.humanOverride ? '⚠ Human Override Active' : 'Auto Mode'}
              </Badge>
            </div>
            {telemetry?.guardrails && telemetry.guardrails.length > 0 && (
              <div className="mt-2 text-xs text-red-600">
                ⚠ Guardrails: {telemetry.guardrails.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" /> Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1 max-h-[160px] overflow-y-auto">
              {telemetryHistory.length === 0 ? (
                <div className="text-muted-foreground">No recent actions</div>
              ) : (
                telemetryHistory.slice().reverse().slice(0, 8).map((h, i) => (
                  <div key={`${h.timestamp}-${i}`} className="flex justify-between text-xs">
                    <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                    <span className="font-medium">{h.mlDecision}</span>
                    <span className="text-muted-foreground">{h.fanState}/{h.lidState}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === ENVIRONMENTAL SNAPSHOT === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Live Environmental Snapshot
          </CardTitle>
          <CardDescription>
            {latest ? `Last reading ${new Date(latest.timestamp).toLocaleString()}` : 'Waiting for weather data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 lg:grid-cols-6 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Core Temp</div>
            <div className="text-lg font-semibold">
              {(latest?.temperature?.value ??
                latest?.environmental_context?.weather?.temperature ??
                '--') + '°C'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Core RH</div>
            <div className="text-lg font-semibold">
              {(latest?.humidity?.value ??
                latest?.environmental_context?.weather?.humidity ??
                '--') + '%'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Fan Duty</div>
            <div className="text-lg font-semibold">
              {latest?.actuation_state?.fan_duty_cycle?.toFixed(0) ?? 0}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">VOC Relative</div>
            <div className="text-lg font-semibold">
              {latest?.derived_metrics?.voc_relative?.toFixed(1) ?? '0'}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Sunrise</div>
            <div className="text-lg font-semibold">
              {latest?.environmental_context?.sys?.sunrise ? new Date(latest.environmental_context.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Sunset</div>
            <div className="text-lg font-semibold">
              {latest?.environmental_context?.sys?.sunset ? new Date(latest.environmental_context.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === STATS CARDS === */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sensors</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sensors.length}</div>
            <p className="text-xs text-muted-foreground">IoT devices deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sensors</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sensors.filter(s => s.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Sensors</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{sensors.filter(s => s.status === 'offline').length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensors.length > 0 ? Math.round(sensors.reduce((sum, s) => sum + s.health_metrics.uptime_percentage, 0) / sensors.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">System reliability</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sensors</CardTitle>
          <CardDescription>Search and filter IoT sensor devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter sensor name or device ID to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sensors Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSensors.map((sensor) => {
          const statusConfig = getStatusBadge(sensor.status)
          const StatusIcon = statusConfig.icon

          return (
            <Card key={sensor._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sensor.device_name}</CardTitle>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription>{sensor.device_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Location</div>
                  <div className="text-sm text-blue-700">{sensor.silo_id.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Sensor Types</div>
                  <div className="flex flex-wrap gap-1">
                    {sensor.sensor_types.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Device Health</div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4" />
                      <span>Battery</span>
                    </div>
                    <span className={getBatteryColor(sensor.battery_level)}>
                      {sensor.battery_level}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span>Signal</span>
                    </div>
                    <span className={getSignalColor(sensor.signal_strength)}>
                      {sensor.signal_strength} dBm
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Uptime</span>
                    <span className="font-medium">{sensor.health_metrics.uptime_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Errors</span>
                    <span className={sensor.health_metrics.error_count > 0 ? 'text-red-600' : 'text-green-600'}>
                      {sensor.health_metrics.error_count}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last reading: {new Date(sensor.last_reading).toLocaleString()}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm">Status:</div>
                  <Badge variant={sensor.status === 'active' ? 'default' : 'destructive'}>
                    {getHealthStatus(sensor)}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Data
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSensors.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No sensors found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
