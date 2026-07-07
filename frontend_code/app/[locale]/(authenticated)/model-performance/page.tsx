"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Brain,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { formatAccuracy, formatF1Score, formatPrecision, formatTrend } from '@/lib/percentageUtils';

interface ModelPerformance {
  performance_summary: {
    total_training_sessions: number
    latest_metrics: {
      accuracy: number
      precision: number
      recall: number
      f1_score: number
      cv_mean: number
      cv_std: number
    }
    overall_improvement: {
      accuracy_improvement?: number
      f1_score_improvement?: number
      accuracy_improvement_pct?: number
      f1_score_improvement_pct?: number
    }
    accuracy_trend: number[]
    f1_trend: number[]
    best_performance: {
      best_accuracy?: { value: number, timestamp: string }
      best_f1?: { value: number, timestamp: string }
      accuracy?: number
      f1_score?: number
      achieved_at?: string
    }
  }
  training_insights: {
    insights: string[]
  }
  recommendations: string[]
  model_info: {
    name: string
    version: string
    algorithm: string
    features: string[]
    target_classes: string[]
  }
}

interface TrainingSession {
  timestamp: string
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1_score: number
    cv_mean?: number
    cv_std?: number
  }
  training_data_size?: number
  hyperparameters?: Record<string, unknown>
  improvement?: Record<string, number>
}

interface TrainingHistory {
  training_sessions: TrainingSession[]
  total_sessions: number
  performance_trends?: Record<string, number[]>
}

export default function ModelPerformancePage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [performance, setPerformance] = useState<ModelPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory | null>(null)
  const [error, setError] = useState<string>('')
  const [selectedGrain, setSelectedGrain] = useState('rice')
  const [trainedGrains, setTrainedGrains] = useState<string[]>([])

  // Retraining progress state
  const [trainProgress, setTrainProgress] = useState(0)
  const [trainStep, setTrainStep] = useState('')
  const [trainResult, setTrainResult] = useState<{
    success: boolean
    metrics?: Record<string, { accuracy: number; f1_score: number; precision?: number; recall?: number }>
    previousAccuracy?: number
  } | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const allGrains = ['rice', 'wheat', 'maize', 'sorghum', 'barley']

  const loadPerformanceData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      // Try authenticated endpoint first, fall back to public
      let performanceData = null
      try {
        const performanceRes = await fetch(`${backendUrl}/api/ai-spoilage/model-performance`, { headers })
        if (performanceRes.ok) {
          performanceData = await performanceRes.json()
        }
      } catch { /* fall through to public */ }

      // Fallback: use model-info-public to build performance data
      if (!performanceData) {
        const publicRes = await fetch(`${backendUrl}/api/ai-spoilage/model-info-public?grain=${selectedGrain}`)
        if (publicRes.ok) {
          const info = await publicRes.json()
          const ensMetrics = info.metrics?.Ensemble || info.metrics?.ensemble || {}
          performanceData = {
            performance_summary: {
              total_training_sessions: 1,
              latest_metrics: {
                accuracy: ensMetrics.accuracy || 0,
                precision: ensMetrics.precision || 0,
                recall: ensMetrics.recall || 0,
                f1_score: ensMetrics.f1_score || 0,
                cv_mean: ensMetrics.cv_mean || 0,
                cv_std: ensMetrics.cv_std || 0,
              },
              overall_improvement: {},
              accuracy_trend: [ensMetrics.accuracy || 0],
              f1_trend: [ensMetrics.f1_score || 0],
              best_performance: { accuracy: ensMetrics.accuracy || 0, f1_score: ensMetrics.f1_score || 0, achieved_at: info.training_date || '' },
            },
            training_insights: {
              total_data_points: info.dataset_rows || 0,
              feature_count: 9,
              class_distribution: {},
              avg_training_time: '~3 min',
            },
            recommendations: [
              info.model_type === 'not_trained'
                ? 'Click "Retrain Ensemble" to train the XGBoost + RandomForest + LightGBM ensemble.'
                : `Ensemble trained on ${info.dataset_rows || 0} rows. Add more live readings and retrain to improve accuracy.`
            ],
            model_info: {
              name: 'GrainHero Spoilage Predictor',
              version: info.version || '3.0',
              algorithm: info.model_type || 'Ensemble (XGBoost + RF + LightGBM)',
              features: ['Temperature', 'Humidity', 'Storage_Days', 'Airflow', 'Dew_Point', 'Ambient_Light', 'Pest_Presence', 'Grain_Moisture', 'Rainfall'],
              target_classes: info.label_classes || ['Safe', 'Risky', 'Spoiled'],
            },
            // Extra: full per-model metrics for ensemble display
            ensemble_metrics: info.metrics || {},
            feature_importance: info.feature_importance || [],
            weka_comparison: info.weka_comparison || {},
          }
          if (info.trained_grains) setTrainedGrains(info.trained_grains)
        }
      }

      if (performanceData) {
        setPerformance(performanceData)
      } else {
        throw new Error('No model data available. Train the model first.')
      }

      // Try loading history
      try {
        const historyRes = await fetch(`${backendUrl}/api/ai-spoilage/training-history`, { headers })
        if (historyRes.ok) {
          setTrainingHistory(await historyRes.json())
        }
      } catch { setTrainingHistory(null) }
    } catch (err) {
      console.error('Error loading performance data:', err)
      setPerformance(null)
      setTrainingHistory(null)
      setError((err as Error).message || 'Failed to load model performance data')
    } finally {
      setLoading(false)
    }
  }, [backendUrl, selectedGrain])

  useEffect(() => {
    void loadPerformanceData()
  }, [loadPerformanceData])

  const retrainModel = async () => {
    const previousAccuracy = performance?.performance_summary?.latest_metrics?.accuracy ?? 0
    setRetraining(true)
    setTrainResult(null)
    setTrainProgress(0)
    setTrainStep('Initializing ensemble training...')

    // Simulate progress steps while backend trains (actual training takes ~3-5 min)
    const steps = [
      { pct: 5, label: 'Loading dataset...', delay: 2000 },
      { pct: 15, label: 'Tuning XGBoost (15 Optuna trials)...', delay: 25000 },
      { pct: 35, label: 'Tuning Random Forest (15 Optuna trials)...', delay: 25000 },
      { pct: 55, label: 'Tuning LightGBM (15 Optuna trials)...', delay: 25000 },
      { pct: 70, label: 'Training individual models...', delay: 15000 },
      { pct: 80, label: 'Building soft voting ensemble...', delay: 15000 },
      { pct: 88, label: 'Cross-validating ensemble (5-fold)...', delay: 30000 },
      { pct: 95, label: 'Saving model & metadata...', delay: 5000 },
    ]

    // Start progress simulation (non-blocking)
    let cancelled = false
    const runProgress = async () => {
      for (const step of steps) {
        if (cancelled) return
        setTrainProgress(step.pct)
        setTrainStep(step.label)
        await new Promise(r => setTimeout(r, step.delay))
      }
    }
    const progressPromise = runProgress()

    try {
      const response = await fetch(`${backendUrl}/api/ai-spoilage/retrain-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grain_type: selectedGrain }),
      })

      cancelled = true // stop simulation
      await progressPromise.catch(() => { })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || body?.details || 'Ensemble retraining failed')
      }

      setTrainProgress(100)
      setTrainStep('Complete!')

      const result = await response.json()
      const m = result.performance_metrics || {}
      const pm = m.per_model || {}

      setTrainResult({
        success: true,
        metrics: {
          Ensemble: { accuracy: m.accuracy ?? 0, f1_score: m.f1_score ?? 0, precision: m.precision ?? 0, recall: m.recall ?? 0 },
          XGBoost: pm.XGBoost || {},
          RandomForest: pm.RandomForest || {},
          LightGBM: pm.LightGBM || {},
        },
        previousAccuracy,
      })

      await loadPerformanceData()
    } catch (err) {
      cancelled = true
      console.error('Error retraining model:', err)
      setTrainResult({ success: false })
      setTrainStep(`Error: ${(err as Error).message}`)
    } finally {
      setRetraining(false)
    }
  }

  const getImprovementIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getImprovementColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const trendHeightClasses = ['h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9', 'h-10', 'h-12', 'h-14', 'h-16', 'h-20', 'h-24', 'h-28']
  const _getTrendHeightClass = (value: number) => {
    if (!value && value !== 0) return 'h-2'
    const normalized = Math.max(0, Math.min(100, value))
    const index = Math.min(trendHeightClasses.length - 1, Math.round((normalized / 100) * (trendHeightClasses.length - 1)))
    return trendHeightClasses[index]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading model performance data...</p>
        </div>
      </div>
    )
  }

  if (error && !performance) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Unable to load model performance</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
        <Button onClick={loadPerformanceData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!performance || !performance.performance_summary?.latest_metrics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-600 mb-4">Model performance data is not available yet.</p>
        <Button onClick={retrainModel} disabled={retraining}>
          <Zap className="h-4 w-4 mr-2" />
          {retraining ? 'Training...' : 'Start First Training'}
        </Button>
      </div>
    )
  }

  const { performance_summary, training_insights: _training_insights, recommendations: rawRecommendations, model_info } = performance
  const _training_insights_obj = { ..._training_insights, insights: _training_insights?.insights || [] }
  const recommendations = rawRecommendations || []
  const { latest_metrics, overall_improvement, accuracy_trend, f1_trend, best_performance } = performance_summary
  const _accuracyTrendValues = accuracy_trend || []
  const _f1TrendValues = f1_trend || []

  // Helper: ensure a metric is in 0-100 scale for Progress bars
  const to100 = (v: number) => (v > 0 && v <= 1) ? v * 100 : v
  // Helper: get best accuracy handling both old/new format
  const bestAccVal = best_performance?.best_accuracy?.value ?? best_performance?.accuracy ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Brain className="h-6 w-6 text-gray-700" />
            </div>
            Model Performance
          </h1>
          <p className="text-gray-600 text-sm">
            {model_info.name} v{model_info.version} • {model_info.algorithm}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Grain Selector */}
          <select
            value={selectedGrain}
            onChange={(e) => setSelectedGrain(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {allGrains.map(g => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)} {trainedGrains.includes(g) ? '✓' : '○'}
              </option>
            ))}
          </select>
          <Button
            onClick={loadPerformanceData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={retrainModel}
            disabled={retraining}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Zap className="h-4 w-4 mr-2" />
            {retraining ? 'Training...' : `Retrain ${selectedGrain.charAt(0).toUpperCase() + selectedGrain.slice(1)}`}
          </Button>
        </div>
      </div>

      {/* Retraining Progress Overlay */}
      {(retraining || trainResult) && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            {retraining ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <div className="font-semibold text-gray-900">Ensemble Training in Progress</div>
                    <div className="text-sm text-gray-600">XGBoost + Random Forest + LightGBM with Optuna Tuning</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-blue-700">{trainStep}</span>
                    <span className="text-gray-600">{trainProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out"
                      style={{ width: `${trainProgress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">This typically takes 3-5 minutes. Do not close this page.</p>
              </div>
            ) : trainResult?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="font-semibold text-gray-900">Training Complete!</div>
                  <Button size="sm" variant="ghost" onClick={() => setTrainResult(null)} className="ml-auto text-xs">Dismiss</Button>
                </div>

                {/* Per-model results table */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  {Object.entries(trainResult.metrics || {}).map(([name, m]) => (
                    <div key={name} className={`p-3 rounded-lg ${name === 'Ensemble' ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'}`}>
                      <div className="text-xs text-gray-500 mb-1">{name}</div>
                      <div className={`text-lg font-bold ${name === 'Ensemble' ? 'text-green-700' : 'text-gray-800'}`}>
                        {formatAccuracy(m.accuracy || 0)}
                      </div>
                      <div className="text-xs text-gray-500">F1: {formatF1Score(m.f1_score || 0)}</div>
                    </div>
                  ))}
                </div>

                {/* Before/After comparison */}
                {(trainResult.previousAccuracy ?? 0) > 0 && trainResult.metrics?.Ensemble && (
                  <div className="flex items-center gap-2 text-sm bg-white rounded-lg p-3 border">
                    <span className="text-gray-500">Previous:</span>
                    <span className="font-medium">{formatAccuracy(trainResult.previousAccuracy ?? 0)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-500">New:</span>
                    <span className="font-bold text-green-700">{formatAccuracy(trainResult.metrics.Ensemble.accuracy)}</span>
                    {trainResult.metrics.Ensemble.accuracy > (trainResult.previousAccuracy ?? 0) && (
                      <Badge className="bg-green-100 text-green-700 ml-2">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Improved
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ) : trainResult && !trainResult.success ? (
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="font-semibold text-red-700">Training Failed</div>
                  <div className="text-sm text-gray-600">{trainStep}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setTrainResult(null)} className="ml-auto text-xs">Dismiss</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAccuracy(latest_metrics.accuracy)}
                </div>
                <div className="text-xs text-gray-500">Accuracy</div>
                {overall_improvement.accuracy_improvement_pct && (
                  <div className={`text-xs flex items-center mt-1 ${getImprovementColor(overall_improvement.accuracy_improvement_pct)}`}>
                    {getImprovementIcon(overall_improvement.accuracy_improvement_pct)}
                    <span className="ml-1">{formatTrend(overall_improvement.accuracy_improvement_pct)}</span>
                  </div>
                )}
              </div>
              <Target className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatF1Score(latest_metrics.f1_score)}
                </div>
                <div className="text-xs text-gray-500">F1 Score</div>
                {overall_improvement.f1_score_improvement_pct && (
                  <div className={`text-xs flex items-center mt-1 ${getImprovementColor(overall_improvement.f1_score_improvement_pct)}`}>
                    {getImprovementIcon(overall_improvement.f1_score_improvement_pct)}
                    <span className="ml-1">{formatTrend(overall_improvement.f1_score_improvement_pct)}</span>
                  </div>
                )}
              </div>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {performance_summary.total_training_sessions}
                </div>
                <div className="text-xs text-gray-500">Training Sessions</div>
              </div>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAccuracy(bestAccVal)}
                </div>
                <div className="text-xs text-gray-500">Best Accuracy</div>
              </div>
              <Award className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Performance</CardTitle>
                <CardDescription>Latest model metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Precision</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.precision)}</span>
                  </div>
                  <Progress value={to100(latest_metrics.precision)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Recall</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.recall)}</span>
                  </div>
                  <Progress value={to100(latest_metrics.recall)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Cross-Validation</span>
                    <span className="font-medium">{formatPrecision(latest_metrics.cv_mean)}</span>
                  </div>
                  <Progress value={to100(latest_metrics.cv_mean)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Model Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Information</CardTitle>
                <CardDescription>Technical details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Algorithm</div>
                  <div className="font-medium">{model_info.algorithm}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Features</div>
                  <div className="text-sm">{model_info.features.length} features</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Target Classes</div>
                  <div className="flex gap-1 mt-1">
                    {model_info.target_classes.map((cls, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cls}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training Recommendations</CardTitle>
              <CardDescription>Actionable steps to improve model accuracy and reliability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Dynamic recommendations based on model state */}
                {[
                  ...(recommendations || []).map((rec: string) => ({ text: rec, type: 'dynamic' as const })),
                  // Add contextual recommendations based on metrics
                  ...(to100(latest_metrics.accuracy) < 95 ? [{ text: `Current accuracy is ${formatAccuracy(latest_metrics.accuracy)}. Collect more diverse sensor readings across different environmental conditions (hot/cold, dry/humid) to improve generalization.`, type: 'improvement' as const }] : []),
                  ...(performance_summary.total_training_sessions < 3 ? [{ text: `Only ${performance_summary.total_training_sessions} training session(s) recorded. Retrain the model periodically as new sensor data accumulates to capture seasonal variations.`, type: 'improvement' as const }] : []),
                  { text: 'Ensure your silo is connected and collecting data continuously. More real-world readings improve model robustness.', type: 'data' as const },
                  { text: 'After accumulating 500+ new sensor readings, click "Retrain" to update the ensemble with fresh data patterns.', type: 'data' as const },
                  ...(to100(latest_metrics.cv_mean) > 0 && to100(latest_metrics.cv_mean) < to100(latest_metrics.accuracy) - 5 ? [{ text: `Cross-validation score (${formatPrecision(latest_metrics.cv_mean)}) is lower than test accuracy — possible overfitting. More diverse training data will help.`, type: 'warning' as const }] : []),
                ].map((item, index) => (
                  <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${item.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                      item.type === 'improvement' ? 'bg-blue-50 border border-blue-100' :
                        item.type === 'data' ? 'bg-green-50 border border-green-100' :
                          'bg-gray-50'
                    }`}>
                    {item.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    ) : item.type === 'improvement' ? (
                      <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training History</CardTitle>
              <CardDescription>Recent training sessions and their metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingHistory?.training_sessions?.length ? (
                trainingHistory.training_sessions
                  .slice()
                  .reverse()
                  .map((session, index) => (
                    <div key={`${session.timestamp}-${index}`} className="rounded-lg border border-gray-100 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Session {trainingHistory.total_sessions - index}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {session.training_data_size && (
                          <Badge variant="outline" className="w-fit">
                            Dataset: {session.training_data_size.toLocaleString()} rows
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs text-gray-500">Accuracy</p>
                          <p className="font-semibold">{formatAccuracy(session.metrics.accuracy)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">F1 Score</p>
                          <p className="font-semibold">{formatF1Score(session.metrics.f1_score)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Precision</p>
                          <p className="font-semibold">{formatPrecision(session.metrics.precision)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Recall</p>
                          <p className="font-semibold">{formatPrecision(session.metrics.recall)}</p>
                        </div>
                      </div>
                      {session.improvement && session.improvement.accuracy_improvement_pct !== undefined && (
                        <div className="mt-3 rounded-md bg-gray-50 p-2 text-xs text-gray-600 flex items-center justify-between">
                          <span>Accuracy change</span>
                          <span className={getImprovementColor(session.improvement.accuracy_improvement_pct)}>
                            {formatTrend(session.improvement.accuracy_improvement_pct)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-sm text-gray-500">
                  {trainingHistory ? 'No training sessions recorded yet.' : 'Training history is unavailable.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
