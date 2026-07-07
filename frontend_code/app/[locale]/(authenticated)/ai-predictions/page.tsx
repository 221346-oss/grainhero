"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  AlertTriangle,
  Target,
  Zap,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CheckCircle,
  RefreshCw,
  CloudRain,
  ShieldCheck,
  Loader2,
  Sun,
  Database,
  Settings,
  Eye,
  TrendingUp,
  Timer,
  Bug,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/* ─── Types ─── */
interface LivePrediction {
  prediction_id: string
  device_id: string
  classification: string
  risk_score: number
  confidence: number
  risk_level: string
  class_probabilities?: Record<string, number>
  severity_factor?: number
  key_risk_factors: string[]
  model_used: string
  input_features: Record<string, number>
  data_sources?: Record<string, string>
  live_sensor_data: Record<string, number | string | null | undefined>
  recommendations: string[]
  grain_type: string
  storage_days: number
  timestamp: string
  is_live?: boolean
}


interface PredictionHistory {
  timestamp: string
  risk_score: number
  confidence: number
  classification: string
}

/* ─── Feature display config ─── */
const _FEATURE_CONFIG: Record<string, {
  label: string
  unit: string
  icon: string
  max: number
  safe: [number, number]
  gradient: string
  border: string
  barColor: string
  iconBg: string
  iconColor: string
}> = {
  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer', max: 50, safe: [15, 25], gradient: 'from-orange-50 to-orange-100', border: 'border-orange-200', barColor: 'from-orange-400 to-orange-600', iconBg: 'bg-orange-500', iconColor: 'text-orange-600' },
  humidity: { label: 'Humidity', unit: '%', icon: 'droplets', max: 100, safe: [40, 70], gradient: 'from-blue-50 to-blue-100', border: 'border-blue-200', barColor: 'from-blue-400 to-blue-600', iconBg: 'bg-blue-500', iconColor: 'text-blue-600' },
  grain_moisture: { label: 'Grain Moisture', unit: '%', icon: 'gauge', max: 30, safe: [10, 16], gradient: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', barColor: 'from-emerald-400 to-emerald-600', iconBg: 'bg-emerald-500', iconColor: 'text-emerald-600' },
  dew_point: { label: 'Dew Point', unit: '°C', icon: 'cloud', max: 40, safe: [5, 20], gradient: 'from-cyan-50 to-cyan-100', border: 'border-cyan-200', barColor: 'from-cyan-400 to-cyan-600', iconBg: 'bg-cyan-500', iconColor: 'text-cyan-600' },
  storage_days: { label: 'Storage Days', unit: 'days', icon: 'timer', max: 180, safe: [0, 60], gradient: 'from-amber-50 to-amber-100', border: 'border-amber-200', barColor: 'from-amber-400 to-amber-600', iconBg: 'bg-amber-500', iconColor: 'text-amber-600' },
  airflow: { label: 'Airflow', unit: '', icon: 'wind', max: 1, safe: [0.3, 1], gradient: 'from-teal-50 to-teal-100', border: 'border-teal-200', barColor: 'from-teal-400 to-teal-600', iconBg: 'bg-teal-500', iconColor: 'text-teal-600' },
  ambient_light: { label: 'Ambient Light', unit: '%', icon: 'sun', max: 100, safe: [0, 100], gradient: 'from-yellow-50 to-yellow-100', border: 'border-yellow-200', barColor: 'from-yellow-400 to-yellow-600', iconBg: 'bg-yellow-500', iconColor: 'text-yellow-600' },
  pest_presence: { label: 'Pest Presence', unit: '', icon: 'bug', max: 1, safe: [0, 0], gradient: 'from-rose-50 to-rose-100', border: 'border-rose-200', barColor: 'from-rose-400 to-rose-600', iconBg: 'bg-rose-500', iconColor: 'text-rose-600' },
  rainfall: { label: 'Rainfall', unit: 'mm', icon: 'rain', max: 50, safe: [0, 5], gradient: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', barColor: 'from-indigo-400 to-indigo-600', iconBg: 'bg-indigo-500', iconColor: 'text-indigo-600' },
}

const DATA_SOURCE_LABELS: Record<string, { label: string, color: string }> = {
  firebase_bme680: { label: 'BME680 Sensor', color: 'bg-green-100 text-green-700' },
  capacitive_probe: { label: 'Moisture Probe', color: 'bg-green-100 text-green-700' },
  fan_pwm_telemetry: { label: 'Fan PWM', color: 'bg-green-100 text-green-700' },
  ldr_sensor: { label: 'LDR Sensor', color: 'bg-green-100 text-green-700' },
  tvoc_inference: { label: 'TVOC Inferred', color: 'bg-blue-100 text-blue-700' },
  multi_factor_inference: { label: 'Multi-Factor (TVOC+RH+T+MC)', color: 'bg-green-100 text-green-700' },
  openweather_api: { label: 'OpenWeather API', color: 'bg-blue-100 text-blue-700' },
  openweather_api_zero: { label: 'OpenWeather API', color: 'bg-blue-100 text-blue-700' },
  grain_batch_db: { label: 'Grain Batch DB', color: 'bg-purple-100 text-purple-700' },
  grain_batch_or_silo_db: { label: 'Grain Batch DB', color: 'bg-purple-100 text-purple-700' },
  firebase_sensor: { label: 'Firebase Sensor', color: 'bg-green-100 text-green-700' },
  magnus_formula: { label: 'Calculated', color: 'bg-gray-100 text-gray-600' },
  humidity_estimate: { label: 'Estimated', color: 'bg-yellow-100 text-yellow-700' },
  manual_override: { label: 'Manual', color: 'bg-orange-100 text-orange-700' },
  fan_state_binary: { label: 'Fan State', color: 'bg-gray-100 text-gray-600' },
  default: { label: 'Default', color: 'bg-red-100 text-red-600' },
  default_0d_fresh: { label: 'No Batch Assigned', color: 'bg-yellow-100 text-yellow-700' },
  default_off: { label: 'No Data', color: 'bg-red-100 text-red-600' },
  default_none: { label: 'No Data', color: 'bg-red-100 text-red-600' },
}

/* ─── Component ─── */
export default function AIPredictionsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [livePrediction, setLivePrediction] = useState<LivePrediction | null>(null)
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [activeTab, setActiveTab] = useState('live')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [telemetry, setTelemetry] = useState<Record<string, number | string | null | undefined> | null>(null)

  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const deviceId = process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760'

  /* ── Fetch live telemetry ── */
  const fetchTelemetry = useCallback(async () => {
    try {
      const r = await fetch(`${backendUrl}/api/iot/silos/${deviceId}/telemetry-public`)
      if (r.ok) {
        const d = await r.json()
        setTelemetry(d)
      }
    } catch { /* ignore */ }
  }, [backendUrl, deviceId])

  /* ── Run live ML prediction ── */
  const runLivePrediction = useCallback(async () => {
    try {
      setPredicting(true)
      const body = { device_id: deviceId, grain_type: 'Rice' }
      const r = await fetch(`${backendUrl}/api/ai-spoilage/predict-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        const data = await r.json()
        setLivePrediction(data)
        // Append to history
        setPredictionHistory(prev => {
          const entry: PredictionHistory = {
            timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            risk_score: data.risk_score,
            confidence: Math.round(data.confidence * 100),
            classification: data.classification,
          }
          const updated = [...prev, entry].slice(-30) // Keep last 30
          return updated
        })
      }
    } catch (e) {
      console.error('Live prediction failed:', e)
    } finally {
      setPredicting(false)
    }
  }, [backendUrl, deviceId])


  /* ── Initial load ── */
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchTelemetry(), runLivePrediction()])
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-refresh ── */
  useEffect(() => {
    if (!autoRefresh) return
    const i = setInterval(() => {
      fetchTelemetry()
      runLivePrediction()
    }, 15000) // every 15s
    return () => clearInterval(i)
  }, [autoRefresh, fetchTelemetry, runLivePrediction])

  /* ── Helpers ── */
  const riskColor = (level: string) => {
    const map: Record<string, string> = {
      critical: 'text-red-700 bg-red-50 border-red-200',
      high: 'text-orange-700 bg-orange-50 border-orange-200',
      medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      low: 'text-green-700 bg-green-50 border-green-200',
    }
    return map[level] || map.low
  }
  const riskBadgeColor = (level: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-green-500 text-white',
    }
    return map[level] || map.low
  }
  const classIcon = (cls: string) => {
    if (cls === 'Spoiled') return <AlertTriangle className="h-6 w-6 text-red-600" />
    if (cls === 'Risky') return <Gauge className="h-6 w-6 text-orange-600" />
    return <ShieldCheck className="h-6 w-6 text-green-600" />
  }

  const _getFeatureIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      thermometer: <Thermometer className="h-5 w-5 text-white" />,
      droplets: <Droplets className="h-5 w-5 text-white" />,
      gauge: <Gauge className="h-5 w-5 text-white" />,
      cloud: <CloudRain className="h-5 w-5 text-white" />,
      timer: <Timer className="h-5 w-5 text-white" />,
      wind: <Wind className="h-5 w-5 text-white" />,
      sun: <Sun className="h-5 w-5 text-white" />,
      bug: <Bug className="h-5 w-5 text-white" />,
      rain: <CloudRain className="h-5 w-5 text-white" />,
    }
    return iconMap[key] || <Activity className="h-5 w-5 text-white" />
  }

  /* ── Check if a data source is "real" vs "default/no data" ── */
  const isRealDataSource = (source: string | undefined) => {
    if (!source) return false
    return !source.startsWith('default') && source !== 'humidity_estimate'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Brain className="h-12 w-12 mx-auto text-purple-400 animate-pulse" />
          <p className="text-gray-500">Running AI prediction on live sensor data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl">
              <Brain className="h-7 w-7 text-purple-700" />
            </div>
            AI Predictions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time ML-powered grain spoilage prediction • SmartBin XGBoost Model • Device {deviceId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto (15s)' : 'Auto Off'}
          </Button>
          <Button
            size="sm"
            onClick={runLivePrediction}
            disabled={predicting}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
          >
            {predicting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Run Prediction
          </Button>
        </div>
      </div>

      {/* ═══ Live Prediction Hero Card ═══ */}
      {livePrediction && (
        <Card className={`border-2 ${riskColor(livePrediction.risk_level)} overflow-hidden`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {classIcon(livePrediction.classification)}
                <div>
                  <CardTitle className="text-xl">Live ML Prediction</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {livePrediction.model_used} • {new Date(livePrediction.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${riskBadgeColor(livePrediction.risk_level)} text-sm px-3 py-1`}>
                {livePrediction.classification.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{livePrediction.risk_score}%</div>
                <div className="text-xs text-gray-500 mt-1">Risk Score</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{(livePrediction.confidence * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">Confidence</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold capitalize">{livePrediction.risk_level}</div>
                <div className="text-xs text-gray-500 mt-1">Risk Level</div>
              </div>
              <div className="text-center p-3 bg-white/60 rounded-xl border">
                <div className="text-3xl font-bold">{livePrediction.grain_type}</div>
                <div className="text-xs text-gray-500 mt-1">Grain Type</div>
              </div>
            </div>

            {livePrediction.class_probabilities && Object.keys(livePrediction.class_probabilities).length > 0 && (() => {
              const sorted = Object.entries(livePrediction.class_probabilities).sort((a, b) => b[1] - a[1])
              const [topClass, topProb] = sorted[0]
              const barColor = topClass === 'Safe' ? 'bg-green-500' : topClass === 'Risky' ? 'bg-orange-500' : 'bg-red-500'
              const textColor = topClass === 'Safe' ? 'text-green-700' : topClass === 'Risky' ? 'text-orange-700' : 'text-red-700'
              return (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Predicted Class</h4>
                  <div className="p-3 bg-white/70 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold capitalize ${textColor}`}>{topClass}</span>
                      <span className={`text-2xl font-bold ${textColor}`}>{(topProb * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${topProb * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Input Features (from live sensors)
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                {Object.entries(livePrediction.input_features).map(([k, v]) => {
                  const source = livePrediction.data_sources?.[k]
                  const isReal = isRealDataSource(source)
                  const sourceInfo = source ? DATA_SOURCE_LABELS[source] || DATA_SOURCE_LABELS['default'] : DATA_SOURCE_LABELS['default']

                  return (
                    <div key={k} className={`p-2 rounded-lg border ${isReal ? 'bg-white/70' : 'bg-gray-50/70 border-dashed'}`}>
                      <div className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</div>
                      <div className={`font-semibold ${!isReal ? 'text-gray-400' : ''}`}>
                        {typeof v === 'number' ? v.toFixed(1) : v}
                      </div>
                      <div className={`text-[9px] px-1 py-0.5 rounded mt-0.5 inline-block ${sourceInfo.color}`}>
                        {sourceInfo.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {livePrediction.key_risk_factors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Risk Factors Detected</h4>
                <div className="flex flex-wrap gap-2">
                  {livePrediction.key_risk_factors.map((f, i) => (
                    <Badge key={i} variant="destructive" className="capitalize">{f.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Advisories</h4>
              <div className="space-y-2">
                {livePrediction.recommendations.map((r, i) => {
                  const isFanAction = /ventilat|fan|airflow|drying|temperature/i.test(r)
                  const _isInspection = /inspect|check|schedule|quality/i.test(r)
                  const isUrgent = /URGENT|CRITICAL/i.test(r)

                  const executeAction = async () => {
                    setActionLoading(`rec-${i}`)
                    try {
                      if (isFanAction) {
                        const speed = isUrgent ? 100 : 60
                        const resp = await fetch(`${backendUrl}/api/iot/devices/${deviceId}/control-public`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'turn_on', value: speed }),
                        })
                        if (resp.ok) {
                          alert(`✅ Fan activated at ${speed}%`)
                        } else {
                          alert('❌ Failed to execute. Check device connectivity.')
                        }
                      } else {
                        alert('✅ Advisory acknowledged. Action logged.')
                      }
                    } catch {
                      alert('❌ Network error. Check backend.')
                    } finally {
                      setActionLoading(null)
                    }
                  }

                  return (
                    <div key={i} className={`flex items-center gap-3 text-sm p-3 rounded-xl border ${isUrgent ? 'bg-red-50/80 border-red-200' : 'bg-white/60 border-gray-200'}`}>
                      <CheckCircle className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-600' : 'text-green-600'}`} />
                      <span className="flex-1 text-gray-700">{r}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={executeAction}
                          disabled={actionLoading === `rec-${i}`}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isFanAction ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}
                        >
                          {actionLoading === `rec-${i}` ? '...' : isFanAction ? '⚡ Execute' : '✅ Acknowledge'}
                        </button>
                        <button
                          onClick={() => router.push(`/${(window.location.pathname.split('/')[1]) || 'en'}/actuators`)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          🔧 Review
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Activity className="h-5 w-5 text-blue-600" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700">{predictionHistory.length}</div>
                <div className="text-xs text-blue-600/70">Predictions Run</div>
              </div>
            </div>
            <div className="w-full bg-blue-200/50 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(predictionHistory.length * 3, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${livePrediction && livePrediction.risk_score >= 60 ? 'from-red-50 to-red-100/40 border-red-200/50' : 'from-green-50 to-green-100/40 border-green-200/50'} hover:shadow-md transition-shadow`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${livePrediction && livePrediction.risk_score >= 60 ? 'bg-red-100' : 'bg-green-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${livePrediction && livePrediction.risk_score >= 60 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${livePrediction && livePrediction.risk_score >= 60 ? 'text-red-700' : 'text-green-700'}`}>
                  {livePrediction?.risk_score ?? '--'}%
                </div>
                <div className="text-xs text-gray-600">Current Risk</div>
              </div>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${livePrediction && livePrediction.risk_score >= 60 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${livePrediction?.risk_score || 0}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/40 border-purple-200/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Target className="h-5 w-5 text-purple-600" /></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">
                  {livePrediction ? `${(livePrediction.confidence * 100).toFixed(0)}%` : '--'}
                </div>
                <div className="text-xs text-purple-600/70">ML Confidence</div>
              </div>
            </div>
            <div className="w-full bg-purple-200/50 rounded-full h-1.5">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${livePrediction ? livePrediction.confidence * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="live">Live Sensors</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-600" /> Live Sensor Data (Firebase)
              </CardTitle>
              <CardDescription>
                Real-time readings from device {deviceId} • {telemetry ? `Updated ${new Date(telemetry.timestamp as number).toLocaleString()}` : 'Loading...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {telemetry ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Temp', value: telemetry.temperature !== undefined ? `${Number(telemetry.temperature).toFixed(1)}°C` : null, icon: <Thermometer className="h-4 w-4" />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Humidity', value: telemetry.humidity !== undefined ? `${Number(telemetry.humidity).toFixed(1)}%` : null, icon: <Droplets className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'TVOC', value: telemetry.tvoc !== undefined ? `${telemetry.tvoc} ppb` : null, icon: <Wind className="h-4 w-4" />, color: 'text-violet-600 bg-violet-50' },
                    { label: 'Dew Point', value: telemetry.dewPoint !== undefined && telemetry.dewPoint !== null ? `${telemetry.dewPoint}°C` : null, icon: <CloudRain className="h-4 w-4" />, color: 'text-cyan-600 bg-cyan-50' },
                    { label: 'Pressure', value: telemetry.pressure !== undefined && telemetry.pressure !== null ? `${telemetry.pressure} hPa` : null, icon: <Gauge className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Light', value: telemetry.light !== undefined && telemetry.light !== null ? `${telemetry.light}%` : null, icon: <Sun className="h-4 w-4" />, color: 'text-yellow-600 bg-yellow-50' },
                    { label: 'Soil Moisture', value: telemetry.soilMoisture !== undefined && telemetry.soilMoisture !== null ? `${telemetry.soilMoisture}%` : null, icon: <Gauge className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Risk Index', value: telemetry.riskIndex !== undefined ? `${telemetry.riskIndex}/100` : null, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600 bg-red-50' },
                    { label: 'Fan', value: String(telemetry.fanState ?? 'off').toUpperCase(), icon: <Settings className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'PWM', value: telemetry.pwm_speed !== undefined ? `${telemetry.pwm_speed}%` : null, icon: <Wind className="h-4 w-4" />, color: 'text-teal-600 bg-teal-50' },
                    { label: 'Lid', value: String(telemetry.lidState ?? 'closed').toUpperCase(), icon: <Eye className="h-4 w-4" />, color: 'text-sky-600 bg-sky-50' },
                    { label: 'ML', value: String(telemetry.mlDecision ?? 'idle'), icon: <Brain className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-50' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className={`p-3 rounded-xl border text-center ${color}`}>
                      <div className="flex justify-center mb-1">{icon}</div>
                      <div className="text-xs uppercase opacity-70">{label}</div>
                      <div className={`text-lg font-bold ${value === null ? 'text-gray-300' : ''}`}>
                        {value ?? 'No Data'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Loading telemetry…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" /> Prediction History
              </CardTitle>
              <CardDescription>Risk score and confidence over time (last {predictionHistory.length} predictions)</CardDescription>
            </CardHeader>
            <CardContent>
              {predictionHistory.length > 1 ? (
                <div className="space-y-6">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictionHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="risk_score" stroke="#ef4444" fill="#fca5a5" fillOpacity={0.3} strokeWidth={2} name="Risk Score (%)" />
                        <Area type="monotone" dataKey="confidence" stroke="#8b5cf6" fill="#c4b5fd" fillOpacity={0.2} strokeWidth={2} name="Confidence (%)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Run more predictions to see trend data. Click &quot;Run Prediction&quot; a few times or wait for auto-refresh.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
