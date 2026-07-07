'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  Filter,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Activity,
  Cpu,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CloudRain,
  Fan,
  Eye,
  Bug,
  Sun,
  Brain,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/* ────────── Types ────────── */
interface LiveTelemetry {
  temperature: number;
  humidity: number;
  tvoc: number;
  fanState: string;
  lidState: string;
  alarmState: string;
  mlDecision: string;
  humanOverride: boolean;
  guardrails: string[];
  pressure: number | null;
  light: number | null;
  dewPoint: number | null;
  soilMoisture: number | null;
  pestRiskScore: number | null;
  riskIndex: number;
  pwm_speed: number;
  led2State: boolean;
  led3State: boolean;
  led4State: boolean;
  timestamp: number;
}

interface HistoryPoint {
  time: string;
  fullTime: string;
  temperature: number;
  humidity: number;
  tvoc: number;
  riskIndex: number;
  dewPoint: number | null;
  fanOn: number;
  pwm: number;
}

interface MlMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

/* ────────── Helper: status badge ────────── */
function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">{label}:</span>
      <span
        className={`px-2 py-0.5 rounded-full font-semibold ${color}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────── Main Page ────────── */
export default function DataVisualizationPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const deviceId =
    process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760';
  const [selectedRange, setSelectedRange] = useState<
    '1h' | '6h' | '24h' | '7d'
  >('6h');
  const [liveTelemetry, setLiveTelemetry] =
    useState<LiveTelemetry | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historySource, setHistorySource] = useState<'loading' | 'db' | 'live'>('loading');
  const [mlMetrics, setMlMetrics] = useState<MlMetrics | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState<
    'idle' | 'running' | 'done' | 'error'
  >('idle');
  const [retrainMsg, setRetrainMsg] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const historyRef = useRef<HistoryPoint[]>([]);

  /* Max live-polling points per range */
  const maxPoints = 500;

  /* Hours for DB history per range */
  const rangeToHours: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

  /* ── Poll live telemetry ── */
  const pollTelemetry = useCallback(async () => {
    try {
      const res = await fetch(
        `${backendUrl}/api/iot/silos/${deviceId}/telemetry-public`
      );
      if (!res.ok) throw new Error(`Telemetry ${res.status}`);
      const data: LiveTelemetry = await res.json();
      setLiveTelemetry(data);

      // Append to history
      const point: HistoryPoint = {
        time: new Date(data.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        fullTime: new Date(data.timestamp).toLocaleString(),
        temperature: data.temperature,
        humidity: data.humidity,
        tvoc: data.tvoc,
        riskIndex: data.riskIndex,
        dewPoint: data.dewPoint,
        fanOn: data.fanState === 'on' ? 1 : 0,
        pwm: data.pwm_speed,
      };

      historyRef.current = [
        ...historyRef.current.slice(-(maxPoints - 1)),
        point,
      ];
      setHistory([...historyRef.current]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Telemetry error';
      setErrors((prev) => [...prev.slice(-4), msg]);
    }
  }, [deviceId, maxPoints]);

  /* ── Load historical data from MongoDB when range changes ── */
  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      setHistorySource('loading');
      try {
        const hours = rangeToHours[selectedRange] || 6;
        const res = await fetch(
          `${backendUrl}/api/iot/silos/${deviceId}/history-public?hours=${hours}&limit=500`
        );
        if (!res.ok) throw new Error(`History ${res.status}`);
        const json = await res.json();
        if (mounted && json.readings && json.readings.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pts: HistoryPoint[] = json.readings.map((r: any) => ({
            time: r.time || new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            fullTime: new Date(r.timestamp).toLocaleString(),
            temperature: r.temperature ?? 0,
            humidity: r.humidity ?? 0,
            tvoc: r.tvoc ?? 0,
            riskIndex: r.riskIndex ?? 0,
            dewPoint: r.dewPoint ?? null,
            fanOn: r.fanOn ?? 0,
            pwm: r.pwm ?? 0,
          }));
          historyRef.current = pts;
          setHistory(pts);
          setHistorySource('db');
        } else if (mounted) {
          setHistorySource('live'); // fall back to live-only accumulation
        }
      } catch {
        if (mounted) setHistorySource('live');
      }
    };
    loadHistory();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, deviceId]);

  useEffect(() => {
    pollTelemetry();
    const i = setInterval(pollTelemetry, 3000);
    return () => clearInterval(i);
  }, [pollTelemetry]);

  /* ── Fetch ML metrics ── */
  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      try {
        setMlLoading(true);
        // Try public first, then authenticated
        let res = await fetch(
          `${backendUrl}/api/ai-spoilage/predictions-public?include_live=false`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.model_performance && mounted) {
            setMlMetrics({
              accuracy: Number(json.model_performance.accuracy ?? 0),
              precision: Number(
                json.model_performance.precision ?? 0
              ),
              recall: Number(json.model_performance.recall ?? 0),
              f1_score: Number(json.model_performance.f1_score ?? 0),
            });
            return;
          }
        }
        // Fallback: try model-performance endpoint
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('token')
            : null;
        res = await fetch(
          `${backendUrl}/api/ai-spoilage/model-performance`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );
        if (!res.ok) return;
        const json = await res.json();
        const latest = json?.performance_summary?.latest_metrics;
        if (mounted && latest && typeof latest === 'object') {
          setMlMetrics({
            accuracy: Number(latest.accuracy ?? 0),
            precision: Number(latest.precision ?? 0),
            recall: Number(latest.recall ?? 0),
            f1_score: Number(latest.f1_score ?? 0),
          });
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setMlLoading(false);
      }
    };
    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  /* ── Retrain model ── */
  const handleRetrain = async () => {
    try {
      setRetrainStatus('running');
      setRetrainMsg('Training in progress... This may take 1-3 minutes.');
      const res = await fetch(
        `${backendUrl}/api/ai-spoilage/retrain-public`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      const json = await res.json();
      if (res.ok) {
        setRetrainStatus('done');
        setRetrainMsg(
          `✅ ${json.message || 'Model retrained successfully'}` +
          (json.performance_metrics?.accuracy
            ? ` — Accuracy: ${(json.performance_metrics.accuracy * 100).toFixed(1)}%`
            : '')
        );
        if (json.performance_metrics) {
          setMlMetrics({
            accuracy: Number(json.performance_metrics.accuracy ?? 0),
            precision: Number(json.performance_metrics.precision ?? 0),
            recall: Number(json.performance_metrics.recall ?? 0),
            f1_score: Number(json.performance_metrics.f1_score ?? 0),
          });
        }
      } else {
        setRetrainStatus('error');
        setRetrainMsg(`❌ ${json.error || 'Retrain failed'}: ${json.details || ''}`);
      }
    } catch (e: unknown) {
      setRetrainStatus('error');
      setRetrainMsg(
        `❌ Network error: ${e instanceof Error ? e.message : 'Unknown'}`
      );
    }
  };

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const avg = (arr: number[]) =>
      arr.reduce((s, v) => s + v, 0) / arr.length;
    const temps = history.map((h) => h.temperature);
    const hums = history.map((h) => h.humidity);
    const tvocs = history.map((h) => h.tvoc);
    const risks = history.map((h) => h.riskIndex);
    return {
      avgTemp: avg(temps),
      avgHum: avg(hums),
      avgTvoc: avg(tvocs),
      avgRisk: avg(risks),
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      minHum: Math.min(...hums),
      maxHum: Math.max(...hums),
      fanOnPct:
        history.filter((h) => h.fanOn).length / history.length * 100,
      count: history.length,
    };
  }, [history]);

  /* ── Radar chart data ── */
  const radarData = useMemo(() => {
    if (!liveTelemetry) return [];
    return [
      {
        metric: 'Temperature',
        value: Math.min(100, (liveTelemetry.temperature / 50) * 100),
        safe: 60,
      },
      {
        metric: 'Humidity',
        value: liveTelemetry.humidity,
        safe: 65,
      },
      {
        metric: 'VOC',
        value: Math.min(100, (liveTelemetry.tvoc / 1000) * 100),
        safe: 30,
      },
      {
        metric: 'Risk',
        value: liveTelemetry.riskIndex,
        safe: 40,
      },
      {
        metric: 'Dew Gap',
        value: liveTelemetry.dewPoint
          ? Math.min(
            100,
            Math.max(
              0,
              ((liveTelemetry.temperature - liveTelemetry.dewPoint) /
                20) *
              100
            )
          )
          : 50,
        safe: 60,
      },
    ];
  }, [liveTelemetry]);

  /* ── Risk colour helper ── */
  const riskColor = (r: number) =>
    r > 70
      ? 'text-red-600'
      : r > 40
        ? 'text-amber-500'
        : 'text-emerald-600';
  const riskBg = (r: number) =>
    r > 70
      ? 'bg-red-50 border-red-200'
      : r > 40
        ? 'bg-amber-50 border-amber-200'
        : 'bg-emerald-50 border-emerald-200';

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            IoT Data Visualization
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time plots from live Firebase sensor feed — Device{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
              {deviceId}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select
            value={selectedRange}
            onValueChange={(v: '1h' | '6h' | '24h' | '7d') =>
              setSelectedRange(v)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={pollTelemetry}
            className="gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Live Telemetry Bar ── */}
      {liveTelemetry && (
        <Card
          className={`border-l-4 ${liveTelemetry.riskIndex > 70
            ? 'border-l-red-500 bg-red-50/30'
            : liveTelemetry.riskIndex > 40
              ? 'border-l-amber-500 bg-amber-50/30'
              : 'border-l-green-500 bg-green-50/30'
            }`}
        >
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live Firebase Feed
              </div>
              <div className="flex items-center gap-5 text-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-red-500" />
                  <strong>{liveTelemetry.temperature.toFixed(1)}°C</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <strong>{liveTelemetry.humidity.toFixed(1)}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-purple-500" />
                  <strong>{liveTelemetry.tvoc} ppb</strong>
                </span>
                {liveTelemetry.dewPoint !== null && (
                  <span className="flex items-center gap-1">
                    <CloudRain className="h-3.5 w-3.5 text-cyan-500" />
                    Dew: <strong>{liveTelemetry.dewPoint.toFixed(1)}°C</strong>
                  </span>
                )}
                <StatusBadge
                  label="Fan"
                  value={liveTelemetry.fanState.toUpperCase()}
                  color={
                    liveTelemetry.fanState === 'on'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }
                />
                <StatusBadge
                  label="Lid"
                  value={liveTelemetry.lidState.toUpperCase()}
                  color={
                    liveTelemetry.lidState === 'open'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }
                />
                <StatusBadge
                  label="ML"
                  value={liveTelemetry.mlDecision}
                  color="bg-indigo-100 text-indigo-700"
                />
                <span
                  className={`font-bold ${riskColor(
                    liveTelemetry.riskIndex
                  )}`}
                >
                  Risk: {liveTelemetry.riskIndex}/100
                </span>
                {liveTelemetry.humanOverride && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    HUMAN OVERRIDE
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(liveTelemetry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!liveTelemetry && (
        <Card className="border-l-4 border-l-gray-300 bg-gray-50/50">
          <CardContent className="py-6 flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
            <span className="text-gray-500">
              Connecting to Firebase — waiting for sensor data...
            </span>
          </CardContent>
        </Card>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={stats ? riskBg(stats.avgTemp > 35 ? 60 : 20) : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              Avg Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.avgTemp.toFixed(1)}°C` : '—'}
            </div>
            {stats && (
              <p className="text-xs text-gray-400 mt-1">
                Range: {stats.minTemp.toFixed(1)}° – {stats.maxTemp.toFixed(1)}°
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={stats ? riskBg(stats.avgHum > 75 ? 60 : 20) : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Avg Humidity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.avgHum.toFixed(1)}%` : '—'}
            </div>
            {stats && (
              <p className="text-xs text-gray-400 mt-1">
                Range: {stats.minHum.toFixed(1)}% – {stats.maxHum.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              Avg VOC (TVOC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.avgTvoc.toFixed(0)} ppb` : '—'}
            </div>
            {stats && (
              <p className="text-xs text-gray-400 mt-1">
                {stats.count} readings sampled
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            stats ? riskBg(stats.avgRisk) : ''
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Avg Risk Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats ? riskColor(stats.avgRisk) : ''
                }`}
            >
              {stats ? `${stats.avgRisk.toFixed(0)}/100` : '—'}
            </div>
            {stats && (
              <p className="text-xs text-gray-400 mt-1">
                Fan duty: {stats.fanOnPct.toFixed(0)}% of time
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ML Evaluation Metrics ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-500" />
            ML Model Evaluation
          </CardTitle>
          <CardDescription>
            SmartBin-RiceSpoilage Ensemble (XGBoost + RF + LightGBM) classifier performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            {[
              {
                label: 'Accuracy',
                value: mlMetrics?.accuracy,
                icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
              },
              {
                label: 'Precision',
                value: mlMetrics?.precision,
                icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
              },
              {
                label: 'Recall',
                value: mlMetrics?.recall,
                icon: <Eye className="h-4 w-4 text-amber-500" />,
              },
              {
                label: 'F1 Score',
                value: mlMetrics?.f1_score,
                icon: <Activity className="h-4 w-4 text-purple-500" />,
              },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="border rounded-lg p-4 flex items-center gap-3"
              >
                {icon}
                <div>
                  <div className="text-xs uppercase text-gray-500">
                    {label}
                  </div>
                  <div className="text-2xl font-bold">
                    {value !== undefined && value !== null
                      ? `${(value * 100).toFixed(1)}%`
                      : mlLoading
                        ? '...'
                        : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRetrain}
              disabled={retrainStatus === 'running'}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {retrainStatus === 'running' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Cpu className="h-4 w-4" />
              )}
              {retrainStatus === 'running'
                ? 'Retraining...'
                : 'Retrain Model'}
            </Button>
            {retrainMsg && (
              <span
                className={`text-sm ${retrainStatus === 'error'
                  ? 'text-red-600'
                  : retrainStatus === 'done'
                    ? 'text-green-600'
                    : 'text-gray-500'
                  }`}
              >
                {retrainMsg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Charts ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-red-500" />
            Temperature & Humidity Trend
          </CardTitle>
          <CardDescription>
            {history.length} data points — source:{' '}
            <span className={historySource === 'db' ? 'text-green-600 font-semibold' : historySource === 'loading' ? 'text-gray-400' : 'text-amber-500'}>
              {historySource === 'db' ? '✅ MongoDB history' : historySource === 'loading' ? 'Loading...' : '⚡ Live only'}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" minTickGap={40} fontSize={11} />
                <YAxis yAxisId="left" fontSize={11} label={{ value: '°C', position: 'insideTopLeft', offset: -5 }} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} label={{ value: '%', position: 'insideTopRight', offset: -5 }} />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ef4444"
                  fill="url(#tempGrad)"
                  name="Temperature (°C)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  fill="url(#humGrad)"
                  name="Humidity (%)"
                  strokeWidth={2}
                  dot={false}
                />
                {history.some((h) => h.dewPoint !== null) && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="dewPoint"
                    stroke="#06b6d4"
                    strokeDasharray="5 5"
                    name="Dew Point (°C)"
                    dot={false}
                    strokeWidth={1.5}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <Activity className="h-6 w-6 mr-2 animate-pulse" />
              Accumulating sensor readings... ({history.length} so far)
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── VOC & Risk Chart ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-purple-500" />
              VOC & Risk Index
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" minTickGap={32} fontSize={10} />
                  <YAxis yAxisId="voc" fontSize={10} />
                  <YAxis yAxisId="risk" orientation="right" domain={[0, 100]} fontSize={10} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="voc"
                    type="monotone"
                    dataKey="tvoc"
                    stroke="#a855f7"
                    name="TVOC (ppb)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="risk"
                    type="monotone"
                    dataKey="riskIndex"
                    stroke="#f59e0b"
                    name="Risk Index"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Waiting for data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Fan & PWM Activity ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fan className="h-4 w-4 text-blue-500" />
              Fan Activity & PWM Speed
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" minTickGap={32} fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="pwm"
                    fill="#6366f1"
                    name="PWM Speed"
                    opacity={0.7}
                  />
                  <Bar
                    dataKey="fanOn"
                    fill="#22c55e"
                    name="Fan ON (1/0)"
                    opacity={0.5}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Waiting for data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Radar: Sensor Health ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Sensor Health Radar
            </CardTitle>
            <CardDescription>
              Current values vs safe thresholds (normalized 0-100)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    fontSize={9}
                  />
                  <Radar
                    name="Current"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Safe Threshold"
                    dataKey="safe"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Waiting for sensor data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Live Silo Conditions ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-emerald-500" />
              Live Silo Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveTelemetry ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Temperature',
                    val: `${liveTelemetry.temperature.toFixed(1)}°C`,
                    icon: <Thermometer className="h-4 w-4 text-red-500" />,
                    warn: liveTelemetry.temperature > 35,
                  },
                  {
                    label: 'Humidity',
                    val: `${liveTelemetry.humidity.toFixed(1)}%`,
                    icon: <Droplets className="h-4 w-4 text-blue-500" />,
                    warn: liveTelemetry.humidity > 75,
                  },
                  {
                    label: 'TVOC',
                    val: `${liveTelemetry.tvoc} ppb`,
                    icon: <Wind className="h-4 w-4 text-purple-500" />,
                    warn: liveTelemetry.tvoc > 500,
                  },
                  {
                    label: 'Dew Point',
                    val: liveTelemetry.dewPoint !== null ? `${liveTelemetry.dewPoint.toFixed(1)}°C` : 'N/A',
                    icon: <CloudRain className="h-4 w-4 text-cyan-500" />,
                    warn: false,
                  },
                  {
                    label: 'PWM Speed',
                    val: `${liveTelemetry.pwm_speed}`,
                    icon: <Fan className="h-4 w-4 text-indigo-500" />,
                    warn: false,
                  },
                  {
                    label: 'Pressure',
                    val: liveTelemetry.pressure !== null ? `${liveTelemetry.pressure} hPa` : 'N/A',
                    icon: <Gauge className="h-4 w-4 text-gray-500" />,
                    warn: false,
                  },
                  {
                    label: 'Light',
                    val: liveTelemetry.light !== null ? `${liveTelemetry.light} lux` : 'N/A',
                    icon: <Sun className="h-4 w-4 text-amber-500" />,
                    warn: false,
                  },
                  {
                    label: 'Pest Score',
                    val: liveTelemetry.pestRiskScore !== null ? `${liveTelemetry.pestRiskScore}` : 'N/A',
                    icon: <Bug className="h-4 w-4 text-green-600" />,
                    warn: (liveTelemetry.pestRiskScore ?? 0) > 5,
                  },
                ].map(({ label, val, icon, warn }) => (
                  <div
                    key={label}
                    className={`border rounded-lg p-3 flex items-center gap-2 ${warn ? 'border-red-200 bg-red-50/40' : ''
                      }`}
                  >
                    {icon}
                    <div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className={`font-semibold ${warn ? 'text-red-600' : ''}`}>
                        {val}
                      </div>
                    </div>
                    {warn && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                Waiting for silo readings...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs: Dataset & Actions ── */}
      <Tabs defaultValue="dataset">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dataset">Dataset Preview</TabsTrigger>
          <TabsTrigger value="actions">Export & Actions</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="dataset">
          <Card>
            <CardHeader>
              <CardTitle>Latest Readings</CardTitle>
              <CardDescription>
                Most recent {Math.min(20, history.length)} telemetry snapshots
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-500 text-left border-b">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Temp (°C)</th>
                    <th className="py-2 pr-4">Hum (%)</th>
                    <th className="py-2 pr-4">TVOC (ppb)</th>
                    <th className="py-2 pr-4">Dew Pt</th>
                    <th className="py-2 pr-4">Risk</th>
                    <th className="py-2 pr-4">Fan</th>
                    <th className="py-2 pr-4">PWM</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .slice(-20)
                    .reverse()
                    .map((row, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50/50">
                        <td className="py-2 pr-4 text-xs">{row.fullTime}</td>
                        <td className="py-2 pr-4 font-medium">
                          {row.temperature.toFixed(1)}
                        </td>
                        <td className="py-2 pr-4">{row.humidity.toFixed(1)}</td>
                        <td className="py-2 pr-4">{row.tvoc}</td>
                        <td className="py-2 pr-4">
                          {row.dewPoint !== null
                            ? row.dewPoint.toFixed(1)
                            : '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`font-semibold ${riskColor(
                              row.riskIndex
                            )}`}
                          >
                            {row.riskIndex}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {row.fanOn ? (
                            <span className="text-green-600 font-medium">
                              ON
                            </span>
                          ) : (
                            <span className="text-gray-400">OFF</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{row.pwm}</td>
                      </tr>
                    ))}
                  {history.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-gray-400"
                      >
                        <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                        Waiting for IoT readings...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Export & Integrations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(
                      `${backendUrl}/api/sensors/export/iot-csv`,
                      {
                        headers: {
                          ...(token
                            ? { Authorization: `Bearer ${token}` }
                            : {}),
                        },
                      }
                    );
                    if (!response.ok) throw new Error('Export failed');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `iot-readings-${new Date().toISOString().split('T')[0]
                      }.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch {
                    alert('CSV export failed. You may need to be logged in.');
                  }
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV (MongoDB)
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Export the in-memory history as CSV
                  if (history.length === 0) {
                    alert('No data to export yet.');
                    return;
                  }
                  const header =
                    'Timestamp,Temperature,Humidity,TVOC,DewPoint,RiskIndex,FanOn,PWM\n';
                  const rows = history
                    .map(
                      (h) =>
                        `${h.fullTime},${h.temperature},${h.humidity},${h.tvoc},${h.dewPoint ?? ''},${h.riskIndex},${h.fanOn},${h.pwm}`
                    )
                    .join('\n');
                  const blob = new Blob([header + rows], {
                    type: 'text/csv',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `live-readings-${new Date().toISOString().split('T')[0]
                    }.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Live Session CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Diagnostics
              </CardTitle>
              <CardDescription>
                Recent errors and connection status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Firebase Status:</span>
                {liveTelemetry ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Connected
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Disconnected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Data Points:</span>
                <span>{history.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Device ID:</span>
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {deviceId}
                </code>
              </div>
              {errors.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <span className="text-sm font-medium text-red-600">
                    Recent Errors:
                  </span>
                  {errors.slice(-5).map((err, i) => (
                    <div
                      key={i}
                      className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-3 py-1.5"
                    >
                      {err}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-2">
                  No errors recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
