"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import {
  Fan,
  Lightbulb,
  Power,
  PowerOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  ThermometerSun,
  Wind,
  Shield,
  Timer,
  Radio,
  Gauge
} from 'lucide-react'

const backendUrl = typeof window !== 'undefined'
  ? ((window as unknown as Record<string, unknown>).__BACKEND_URL as string) || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760'

interface LiveTelemetry {
  temperature: number
  humidity: number
  tvoc: number
  fanState: string
  lidState: string
  alarmState: string
  mlDecision: string
  humanOverride: boolean
  controlAuthority?: string
  dataSource?: string
  riskIndex: number | null
  dewPoint: number | null
  pressure: number | null
  timestamp: number
  pwm_speed?: number
  led2State?: boolean
  led3State?: boolean
  led4State?: boolean
}

export default function ActuatorsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [live, setLive] = useState<LiveTelemetry | null>(null)
  const [pwmValue, setPwmValue] = useState(80)
  const [sending, setSending] = useState<string | null>(null)

  // Poll live telemetry from Firebase
  useEffect(() => {
    let mounted = true
    const poll = async () => {
      try {
        const r = await fetch(`${backendUrl}/api/iot/silos/${DEVICE_ID}/telemetry-public`)
        if (!r.ok || !mounted) return
        const d = await r.json()
        if (mounted) setLive(d)
      } catch { }
    }
    poll()
    const i = setInterval(poll, 2000)
    return () => { mounted = false; clearInterval(i) }
  }, [])

  const sendControl = useCallback(async (action: string, value?: number, extras?: Record<string, unknown>) => {
    setSending(action)
    try {
      const body: Record<string, unknown> = { action }
      if (value !== undefined) body.value = value
      if (extras) Object.assign(body, extras)

      const r = await fetch(`${backendUrl}/api/iot/devices/${DEVICE_ID}/control-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (r.ok) {
        const result = await r.json()
        toast.success(`✅ ${result.message || action}`)
      } else {
        const err = await r.text().catch(() => '')
        toast.error(`❌ Control failed: ${err || r.status}`)
      }
    } catch (e) {
      toast.error(`❌ Network error: ${(e as Error).message}`)
    } finally {
      setSending(null)
    }
  }, [])

  const fanIsOn = live?.fanState === 'on' || live?.fanState === 'ON'
  const lidIsOpen = live?.lidState === 'open' || live?.lidState === 'OPEN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Actuator Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direct hardware control • Fan, LEDs, Alarm • Device {DEVICE_ID}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {live ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live • {new Date(live.timestamp).toLocaleTimeString()}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1.5">
              <Radio className="h-3 w-3" /> Connecting...
            </Badge>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              sendControl('turn_off')
              sendControl('alarm_off')
              sendControl('turn_off', 0, { led: 'led2', ledState: false })
              sendControl('turn_off', 0, { led: 'led3', ledState: false })
              sendControl('turn_off', 0, { led: 'led4', ledState: false })
              toast.warning('🚨 Emergency shutdown sent')
            }}
          >
            <AlertTriangle className="h-4 w-4" /> Emergency Stop
          </Button>
        </div>
      </div>

      {/* Control Authority Banner */}
      {(() => {
        const authority = live?.controlAuthority || (live?.humanOverride ? 'HUMAN' : 'ML_AUTO')
        const configs: Record<string, { border: string; bg: string; icon: string; title: string; desc: string; textColor: string; iconBg: string; iconColor: string }> = {
          'ML_AUTO': { border: 'border-blue-300', bg: 'from-blue-50 to-indigo-50', icon: '🤖', title: 'ML Auto — Controlling Hardware', desc: 'Dual-layer control: ESP32 applies real-time rules locally while cloud ensemble (XGBoost + RF + LightGBM) runs spoilage risk scoring every 60s.', textColor: 'text-blue-800', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          'HUMAN': { border: 'border-amber-300', bg: 'from-amber-50 to-orange-50', icon: '🧑', title: 'Human Expert — Manual Override Active', desc: 'You are controlling actuators directly. ML is paused. Click "Return to Auto" to restore ML control.', textColor: 'text-amber-800', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
          'FAILSAFE': { border: 'border-red-300', bg: 'from-red-50 to-rose-50', icon: '🛡️', title: 'Failsafe Mode — No Backend Connection', desc: 'ESP32 is operating autonomously. Fan activates if TVOC > 600. Reconnect MQTT to restore normal control.', textColor: 'text-red-800', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
        }
        const c = configs[authority] || configs['ML_AUTO']
        return (
          <div className={`rounded-xl border-2 ${c.border} bg-gradient-to-r ${c.bg} p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg ${c.iconBg} ${c.iconColor}`}><Activity className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className={`font-semibold ${c.textColor}`}>{c.icon} {c.title}</div>
              <div className={`text-xs ${c.textColor} opacity-75`}>{c.desc}</div>
            </div>
            {live?.dataSource && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                via {live.dataSource.toUpperCase()}
              </Badge>
            )}
          </div>
        )
      })()}

      {/* Live Status Strip */}
      {live && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl border p-3 bg-gradient-to-br from-orange-50 to-orange-100/50">
            <div className="text-[10px] uppercase tracking-wider text-orange-500 font-medium">Temp</div>
            <div className="text-lg font-bold text-orange-700">{live.temperature.toFixed(1)}°C</div>
          </div>
          <div className="rounded-xl border p-3 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="text-[10px] uppercase tracking-wider text-blue-500 font-medium">Humidity</div>
            <div className="text-lg font-bold text-blue-700">{live.humidity.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border p-3 bg-gradient-to-br from-violet-50 to-violet-100/50">
            <div className="text-[10px] uppercase tracking-wider text-violet-500 font-medium">TVOC</div>
            <div className="text-lg font-bold text-violet-700">{live.tvoc} ppb</div>
          </div>
          <div className="rounded-xl border p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium">ML</div>
            <div className="text-lg font-bold text-emerald-700 capitalize">{live.mlDecision}</div>
          </div>
          <div className={`rounded-xl border p-3 bg-gradient-to-br ${live.controlAuthority === 'HUMAN' ? 'from-amber-50 to-amber-100/50' :
              live.controlAuthority === 'FAILSAFE' ? 'from-red-50 to-red-100/50' :
                'from-blue-50 to-blue-100/50'
            }`}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Control</div>
            <div className={`text-lg font-bold ${live.controlAuthority === 'HUMAN' ? 'text-amber-600' :
                live.controlAuthority === 'FAILSAFE' ? 'text-red-600' :
                  'text-blue-600'
              }`}>{live.controlAuthority === 'HUMAN' ? '🧑 HUMAN' : live.controlAuthority === 'FAILSAFE' ? '🛡️ SAFE' : '🤖 ML'}</div>
          </div>
          <div className={`rounded-xl border p-3 bg-gradient-to-br ${(live.riskIndex ?? 0) > 70 ? 'from-red-50 to-red-100/50' : (live.riskIndex ?? 0) > 40 ? 'from-amber-50 to-amber-100/50' : 'from-green-50 to-green-100/50'}`}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Risk</div>
            <div className={`text-lg font-bold ${(live.riskIndex ?? 0) > 70 ? 'text-red-600' : (live.riskIndex ?? 0) > 40 ? 'text-amber-600' : 'text-green-600'}`}>{live.riskIndex ?? '--'}/100</div>
          </div>
        </div>
      )}

      {/* Main Control Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

        {/* Fan Control */}
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${fanIsOn ? 'border-emerald-400 shadow-lg shadow-emerald-100' : 'border-transparent hover:border-gray-200'}`}>
          <div className={`absolute inset-0 transition-opacity duration-500 ${fanIsOn ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(6,182,212,0.05) 100%)' }} />
          <CardHeader className="relative">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${fanIsOn ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Fan className={`h-5 w-5 ${fanIsOn ? 'animate-spin' : ''}`} style={fanIsOn ? { animationDuration: '1s' } : {}} />
                </div>
                Ventilation Fan
              </span>
              <Badge variant={fanIsOn ? 'default' : 'secondary'} className={fanIsOn ? 'bg-emerald-500' : ''}>
                {fanIsOn ? 'Running' : 'Stopped'}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Lid: {lidIsOpen ? 'OPEN' : 'CLOSED'}</span>
              <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> PWM: {live?.pwm_speed ?? 0}%</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                disabled={sending === 'turn_on'}
                onClick={() => sendControl('turn_on', pwmValue)}
              >
                <Power className="h-4 w-4" /> Start ({pwmValue}%)
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                disabled={sending === 'turn_off'}
                onClick={() => sendControl('turn_off')}
              >
                <PowerOff className="h-4 w-4" /> Stop
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Fan Speed</span>
                <span className="font-bold text-foreground">{pwmValue}%</span>
              </label>
              <Slider
                value={[pwmValue]}
                onValueChange={([v]) => setPwmValue(v)}
                min={0} max={100} step={5}
                className="py-2"
              />
              <div className="flex gap-1.5">
                {[20, 40, 60, 80, 100].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs h-7"
                    onClick={() => { setPwmValue(v); sendControl('set_value', v) }}
                  >{v}%</Button>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
              onClick={() => sendControl('auto')}
            >
              <Activity className="h-3 w-3" /> Return to Auto Mode
            </Button>
          </CardContent>
        </Card>

        {/* LED Control */}
        <Card className="relative overflow-hidden border-2 border-transparent hover:border-gray-200 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Lightbulb className="h-5 w-5" />
              </div>
              Silo Lighting
            </CardTitle>
            <CardDescription>LED 2 (GPIO 14) · LED 3 (GPIO 12) · LED 4 (GPIO 25)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'led2', label: 'LED 2 — Inspection', color: 'blue', pin: 14 },
              { key: 'led3', label: 'LED 3 — Warning', color: 'amber', pin: 12 },
              { key: 'led4', label: 'LED 4 — Status', color: 'green', pin: 25 }
            ].map(({ key, label, color, pin }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-white/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${live?.[`${key}State` as keyof LiveTelemetry] ? `bg-${color}-400 shadow-lg shadow-${color}-200` : 'bg-gray-300'}`} />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-[10px] text-muted-foreground">GPIO {pin}</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => sendControl('set_value', 0, { led: key, ledState: true })}
                  ><Zap className="h-3 w-3" /> On</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-gray-200 hover:bg-gray-100"
                    onClick={() => sendControl('set_value', 0, { led: key, ledState: false })}
                  >Off</Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  sendControl('set_value', 0, { led: 'led2', ledState: true })
                  sendControl('set_value', 0, { led: 'led3', ledState: true })
                  sendControl('set_value', 0, { led: 'led4', ledState: true })
                }}
              ><Lightbulb className="h-3 w-3" /> All On</Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"
                onClick={() => {
                  sendControl('set_value', 0, { led: 'led2', ledState: false })
                  sendControl('set_value', 0, { led: 'led3', ledState: false })
                  sendControl('set_value', 0, { led: 'led4', ledState: false })
                }}
              >All Off</Button>
            </div>
          </CardContent>
        </Card>

        {/* Alarm Control — removed from UI, backend logic preserved for future implementation */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fan Status</CardTitle>
            <Fan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${fanIsOn ? 'text-emerald-600' : 'text-gray-500'}`}>{fanIsOn ? 'Running' : 'Stopped'}</div>
            <p className="text-xs text-muted-foreground">
              PWM: {live?.pwm_speed ?? 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LED Outputs</CardTitle>
            <Lightbulb className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {[live?.led2State, live?.led3State, live?.led4State].filter(Boolean).length} / 3
            </div>
            <p className="text-xs text-muted-foreground">
              LEDs active
            </p>
          </CardContent>
        </Card>



        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${live ? 'text-green-600' : 'text-gray-500'}`}>{live ? 'Good' : 'Offline'}</div>
            <p className="text-xs text-muted-foreground">
              {live ? 'All systems operational' : 'Waiting for telemetry'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Mode & Safety Info */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-indigo-600" /> Control Mode & Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-2.5 rounded-lg border">
              <span className="text-muted-foreground">Current Mode</span>
              <Badge variant={live?.humanOverride ? 'default' : 'outline'} className={live?.humanOverride ? 'bg-amber-500' : ''}>
                {live?.humanOverride ? '🧑 Manual Override' : '🤖 Auto (ML)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border">
              <span className="text-muted-foreground">ML Decision</span>
              <span className="font-semibold capitalize">{live?.mlDecision || '--'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border">
              <span className="text-muted-foreground">Dew Point</span>
              <span className="font-semibold">{live?.dewPoint ?? '--'}°C</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button variant="outline" size="sm" className="text-xs gap-1"
                onClick={() => sendControl('turn_on', 40)}>
                <Timer className="h-3 w-3" /> Gentle (40%)
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1"
                onClick={() => sendControl('turn_on', 60)}>
                <Wind className="h-3 w-3" /> Normal (60%)
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1"
                onClick={() => sendControl('turn_on', 100)}>
                <Zap className="h-3 w-3" /> Max (100%)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-emerald-600" /> System Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2 p-2 rounded bg-blue-50 border border-blue-100">
              <CheckCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-blue-700">Lid opens before fan starts</strong> — The ESP32 state machine always opens the lid first, waits 3s, then starts the fan.</span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-amber-700">Manual override expires</strong> — After 10 minutes of inactivity, control returns to ML/Auto mode automatically.</span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-100">
              <Shield className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-red-700">Guardrails enforced</strong> — Ventilation is blocked if ambient RH &gt; 80%, dew point gap &lt; 1°C, or rainfall detected. The fan command will be ignored by the ESP32.</span>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-emerald-50 border border-emerald-100">
              <ThermometerSun className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-emerald-700">Min run time</strong> — Fan runs for at least 15 seconds before it can be stopped to prevent short-cycling and protect the motor.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
