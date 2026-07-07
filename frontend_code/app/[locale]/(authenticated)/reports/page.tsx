"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  Download,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Shield,
  FileText,
  Database,
  Activity,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { config } from '@/config'
import { AnimatedBackground } from "@/components/animations/MotionGraphics"
import { toast } from 'sonner'

type ReportsOverview = {
  payments: {
    total_subscriptions: number
    total_revenue: number
    active: number
    cancelled: number
    past_due: number
  }
  ops: {
    total_batches: number
    total_silos: number
    active_silos: number
  }
}

type DashboardData = {
  stats?: Array<{ title: string; value: string | number }>
  business?: {
    monthlyRevenue?: number
    monthlyProfit?: number
    avgPricePerKg?: number
    dispatchRate?: number
    qualityScore?: number
    activeBuyers?: number
  }
  capacityStats?: {
    totalCapacity?: number
    totalCurrentQuantity?: number
    utilizationPercentage?: number
  }
  analytics?: {
    qualityMetrics?: Array<{ quality: string; value: number }>
  }
}

export default function ReportsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [overview, setOverview] = useState<ReportsOverview | null>(null)
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams({ period: selectedPeriod })
      const [reportsRes, dashRes] = await Promise.all([
        api.get<ReportsOverview>(`/api/reports/overview?${query.toString()}`),
        api.get<DashboardData>('/dashboard')
      ])
      if (reportsRes.ok && reportsRes.data) {
        setOverview(reportsRes.data)
      }
      if (dashRes.ok && dashRes.data) {
        setDashData(dashRes.data)
      }
      if (!reportsRes.ok && !dashRes.ok) {
        setError('Unable to load reports data')
      }
    } catch {
      setError('Unable to load reports')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedPeriod])
  useEffect(() => {
    loadData()
  }, [selectedPeriod, loadData])

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
      }),
    [],
  )

  const handleDownloadReport = async (type: string, format: 'pdf' | 'csv' = 'pdf') => {
    try {
      toast.info(`Generating ${type} report...`)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const reportType = type.toLowerCase().replace(/\s+/g, '-')
      const res = await fetch(
        `${config.backendUrl}/dashboard/export-report?type=${encodeURIComponent(reportType)}&format=${format}`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        }
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type} report downloaded`)
    } catch {
      toast.error('Failed to download report')
    }
  }

  const handleExportAll = async () => {
    await handleDownloadReport('summary', 'pdf')
  }

  // Calculate derived metrics from real data
  const totalBatches = overview?.ops.total_batches ?? 0
  const totalRevenue = dashData?.business?.monthlyRevenue ?? 0
  const activeSilos = overview?.ops.active_silos ?? 0
  const totalSilos = overview?.ops.total_silos ?? 0

  // Average risk from quality metrics
  const avgRiskScore = useMemo(() => {
    const qm = dashData?.analytics?.qualityMetrics
    if (!qm || qm.length === 0) return 0
    const total = qm.reduce((s, m) => s + m.value, 0)
    if (total === 0) return 0
    const risky = (qm.find(m => m.quality.includes('Risky'))?.value || 0)
    const spoiled = (qm.find(m => m.quality.includes('Spoiled'))?.value || 0)
    return total > 0 ? Math.round(((risky + spoiled) / total) * 100) : 0
  }, [dashData])

  const siloUtilization = totalSilos
    ? Math.round((activeSilos / totalSilos) * 100)
    : 0

  if (loading) {
    return (
      <AnimatedBackground className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading reports...</p>
          </div>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">
              Generate comprehensive reports and download live data for your grain operations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600" onClick={handleExportAll}>
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Tabs value={selectedReport} onValueChange={setSelectedReport} className="space-y-6">
          <TabsList className="bg-gray-100/80 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="grain" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Grain Operations
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Financial
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Batches</CardTitle>
                  <Package className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{totalBatches}</div>
                  <p className="text-xs text-blue-600 mt-1">Your grain batches</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-900">Monthly Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-900">
                    {formatter.format(totalRevenue)}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">From grain sales this month</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Active Silos</CardTitle>
                  <Database className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{activeSilos}/{totalSilos}</div>
                  <p className="text-xs text-purple-600 mt-1">Silos operational</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -mr-10 -mt-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Risk Score</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">{avgRiskScore}%</div>
                  <p className="text-xs text-amber-600 mt-1">Batches at risk</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Performance Overview
                    </CardTitle>
                    <CardDescription>
                      Key metrics and trends for the selected period
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadReport('Performance Overview')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-xl border-0 bg-gradient-to-br from-green-50 to-green-100/30 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Silos Online</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      {activeSilos}/{totalSilos}
                    </p>
                    <div className="mt-3">
                      <Progress value={siloUtilization} className="h-2 bg-green-200" />
                      <p className="mt-1 text-xs text-green-600">{siloUtilization}% operational</p>
                    </div>
                  </div>

                  <div className="rounded-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100/30 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-800">Active Batches</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {totalBatches}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-purple-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Total active grain batches
                    </div>
                  </div>

                  <div className="rounded-xl border-0 bg-gradient-to-br from-amber-50 to-amber-100/30 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Dispatch Rate</p>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">
                      {dashData?.business?.dispatchRate ?? 0}%
                    </p>
                    <div className="mt-3">
                      <Progress value={dashData?.business?.dispatchRate ?? 0} className="h-2 bg-amber-200" />
                      <p className="mt-1 text-xs text-amber-600">Batches dispatched to buyers</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Silos</p>
                      <p className="text-2xl font-bold">{totalSilos}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Buyers</p>
                      <p className="text-2xl font-bold">{dashData?.business?.activeBuyers ?? 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Price/kg</p>
                      <p className="text-2xl font-bold">{formatter.format(dashData?.business?.avgPricePerKg ?? 0)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Quality Score</p>
                      <p className="text-2xl font-bold">{dashData?.business?.qualityScore ?? 0}/5</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Grain Operations Tab */}
          <TabsContent value="grain" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <Package className="h-5 w-5" />
                    Grain Batch Report
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    Detailed analysis of grain batches and quality metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Batch quality analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Risk assessment trends
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Storage utilization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Spoilage rates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Traceability data
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" onClick={() => handleDownloadReport('batches', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('batches', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Database className="h-5 w-5" />
                    Silo Performance Report
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Environmental conditions and storage efficiency analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Environmental monitoring
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Storage capacity utilization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Maintenance schedules
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Energy consumption
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Equipment performance
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" onClick={() => handleDownloadReport('silos', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('silos', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <DollarSign className="h-5 w-5" />
                    Revenue Report
                  </CardTitle>
                  <CardDescription className="text-emerald-700">
                    Financial performance and revenue analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Revenue by grain type
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Profit margins
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Cost analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Market trends
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Buyer performance
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700" onClick={() => handleDownloadReport('summary', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('summary', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <BarChart3 className="h-5 w-5" />
                    Performance Report
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Operational performance and efficiency metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Silo utilization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Storage efficiency
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Capacity optimization
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Throughput analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Process improvement metrics
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700" onClick={() => handleDownloadReport('summary', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('summary', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <Shield className="h-5 w-5" />
                    Compliance Report
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    Regulatory compliance and audit trail analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Regulatory compliance status
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Audit trail analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Quality certifications
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Safety compliance
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Documentation status
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700" onClick={() => handleDownloadReport('summary', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('summary', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-teal-900">
                    <Activity className="h-5 w-5" />
                    Traceability Report
                  </CardTitle>
                  <CardDescription className="text-teal-700">
                    Complete traceability chain and quality assurance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Report Includes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Complete supply chain trace
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Quality checkpoints
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Handling procedures
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Transportation logs
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Final destination tracking
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" onClick={() => handleDownloadReport('batches', 'pdf')}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleDownloadReport('batches', 'csv')}>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AnimatedBackground>
  )
}
