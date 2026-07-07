"use client"

import { useAuth, usePlan } from "@/app/[locale]/providers"
import { useState, useEffect } from 'react'
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard"
import { AdminDashboard } from "@/components/dashboards/AdminDashboard"
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard"
import { TechnicianDashboard } from "@/components/dashboards/TechnicianDashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WelcomeNotification } from "@/components/WelcomeNotification"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  Thermometer,
  Droplets,
  Wind,
  Smartphone,
  Warehouse,
  Crown
} from "lucide-react"
import {
  AnimatedBarChart,
  AnimatedLineChart,
  AnimatedPieChart,
  AnimatedAreaChart,
  AnimatedMetricCard
} from "@/components/animations/AnimatedCharts"
import {
  AnimatedBackground,
  AnimatedCounter
} from "@/components/animations/MotionGraphics"

// Helper function for status colors
const getStatusColor = (status: string) => {
  if (!status) return 'default'
  switch (status.toLowerCase()) {
    case 'active':
    case 'optimal':
    case 'normal':
    case 'stored':
    case 'excellent':
      return 'default'
    case 'warning':
    case 'medium':
    case 'processing':
      return 'secondary'
    case 'critical':
    case 'high':
    case 'dispatched':
      return 'destructive'
    case 'low':
    case 'quality check':
      return 'outline'
    default:
      return 'default'
  }
}


interface DashboardStat {
  title: string
  value: string | number
}

interface DashboardBatch {
  id: string
  grain: string
  quantity: number
  status: string
  silo: string
  date: string
  risk: string
}

interface DashboardAlert {
  id: string
  type: string
  message: string
  severity: string
  time: string
}

interface DashboardAnalytics {
  monthlyIntake: Array<{ month: string; total: number }>
  grainDistribution: Array<{ grain: string; percentage: number; quantity: number }>
  qualityMetrics: Array<{ quality: string; value: number }>
}

interface DashboardSensor {
  id: string
  type: string
  value: number
  unit: string
  status: string
  location: string
  lastReading: string
  battery: number
  signal: number
}

interface DashboardBusiness {
  activeBuyers: number
  avgPricePerKg: number
  dispatchRate: number
  qualityScore: number
  monthlyRevenue?: number
  monthlyRevenueGrowth?: number
  lastMonthRevenue?: number
  monthlyProfit?: number
  averageSellingPrice?: number
}

interface DashboardSuggestion {
  siloId: string
  name: string
  reason: string
}

interface DashboardApi {
  stats: DashboardStat[]
  storageDistribution: Array<{ status: string; count: number }>
  grainTypeDistribution: Array<{ grainType: string; count: number }>
  capacityStats: {
    totalCapacity: number
    totalCurrentQuantity: number
    utilizationPercentage: number
    todaysIntake?: number
  }
  suggestions: {
    criticalStorage: DashboardSuggestion[]
    optimization: DashboardSuggestion[]
  }
  recentBatches: DashboardBatch[]
  alerts: DashboardAlert[]
  analytics: DashboardAnalytics
  sensors: DashboardSensor[]
  business: DashboardBusiness
}

type IconType = typeof Package

import { api } from "@/lib/api"

export default function DashboardPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const { user, refreshUser } = useAuth()
  const { plan } = usePlan()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardApi | null>(null)
  const [error, setError] = useState<string>("")
  const [sensors, setSensors] = useState<DashboardSensor[]>([])
  const [loadingSensors, setLoadingSensors] = useState(false)
  const [errorSensors, setErrorSensors] = useState<string>('')
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Force refresh user to get latest role from DB
        await refreshUser();

        const res = await api.get<DashboardApi>("/dashboard")
        if (res.ok && res.data) {
          setDashboard(res.data)
        } else {
          setError('Failed to load dashboard stats')
        }
      } catch {
        setError('Server Error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Check for first login welcome notification
    const isFirstLogin = localStorage.getItem('firstLogin')
    if (isFirstLogin === 'true') {
      setShowWelcome(true)
      localStorage.removeItem('firstLogin')
    }
  }, [refreshUser])

  const userRole = user?.role || "technician"
  console.log("Current User Role:", userRole);

  const metricIconMap: Record<string, { icon: IconType; color: string }> = {
    "Grain Batches": { icon: Package, color: "blue" },
    "Total Silos": { icon: Warehouse, color: "blue" },
    "Current Plan": { icon: Package, color: "green" },
    "Active Users": { icon: Users, color: "purple" },
    "Active Alerts": { icon: AlertTriangle, color: "red" },
  }

  const formatDate = (value?: string | Date) => {
    if (!value) return "N/A"
    const date = typeof value === "string" ? new Date(value) : value
    return date.toLocaleDateString()
  }

  const fetchLiveSensors = async () => {
    setLoadingSensors(true)
    setErrorSensors('')
    try {
      const res = await api.get<DashboardSensor[]>("/dashboard/live-sensors")
      if (res.ok && res.data) {
        const data = res.data
        setSensors(Array.isArray(data) ? data : (data as unknown as { sensors: DashboardSensor[] }).sensors || [])
      } else {
        setErrorSensors('Failed to load live sensor data.')
      }
    } catch {
      setErrorSensors('Could not fetch live sensor data.')
    } finally {
      setLoadingSensors(false)
    }
  }

  // Render role-specific dashboard content
  const renderRoleSpecificDashboard = () => {
    switch (userRole) {
      case "super_admin":
        // This is handled by main render, but for safety
        return <SuperAdminDashboard />
      case "admin":
        return <AdminDashboard />
      case "manager":
        return <ManagerDashboard />
      case "technician":
        return <TechnicianDashboard />
      default:
        // Basic fallback or nothing, let the generic dashboard show
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 animate-pulse">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" strokeWidth="4" />
            </svg>
          </div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500 font-bold">{error}</div>
      </div>
    )
  }

  return (
    <AnimatedBackground className="min-h-screen">
      {/* Welcome Notification with Confetti */}
      {showWelcome && user && (
        <WelcomeNotification
          userName={user.name}
          planName={plan || user.hasAccess || 'basic'}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {userRole === "super_admin" ? (
          // For super admin, show the dedicated super admin dashboard ONLY
          <SuperAdminDashboard />
        ) : (
          // For other users, show BOTH the role-specific dashboard AND the standard dashboard UI
          <>
            <div className="flex items-center justify-between space-y-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Welcome back, {user?.name || "User"}!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Here&apos;s what&apos;s happening with your {userRole.replace('_', ' ')} dashboard today.
                </p>
              </div>
              {/* Plan Badge on Dashboard */}
              {user?.hasAccess && user.hasAccess !== 'none' && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full px-4 py-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-600">Plan:</span>
                  <span className="text-sm font-bold text-green-700">
                    {user.hasAccess === 'basic' ? 'Starter' : user.hasAccess === 'intermediate' ? 'Professional' : user.hasAccess === 'pro' ? 'Enterprise' : user.hasAccess}
                  </span>
                </div>
              )}
            </div>

            {/* Animated Key Metrics Cards (using real dashboard API) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
              {dashboard?.stats?.filter(s => s.title !== 'Current Plan').map((stat, i) => {
                const config = metricIconMap[stat.title] || { icon: Activity, color: "blue" }
                const valueNode =
                  typeof stat.value === 'number'
                    ? <AnimatedCounter end={stat.value} />
                    : stat.value
                return (
                  <AnimatedMetricCard
                    key={i}
                    title={stat.title}
                    value={valueNode}
                    icon={config.icon}
                    color={config.color}
                  />
                )
              })}
            </div>

            <Tabs defaultValue="overview" className="space-y-4 mt-6">
              <TabsList className={`w-full grid ${(userRole === "admin") ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview" className="w-full">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="w-full">Analytics</TabsTrigger>
                <TabsTrigger value="monitoring" className="w-full">Monitoring</TabsTrigger>
                {(userRole === "admin") && (
                  <TabsTrigger value="business" className="w-full">Business</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
                  <Card className="col-span-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Your recent grain management activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Today&apos;s Intake</p>
                            <p className="text-2xl font-bold">{dashboard?.capacityStats?.todaysIntake ? dashboard.capacityStats.todaysIntake.toLocaleString() : 0}</p>
                            <p className="text-xs text-muted-foreground">kg</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Active Batches</p>
                            <p className="text-2xl font-bold">{dashboard?.recentBatches?.length ? dashboard.recentBatches.length : 0}</p>
                            <p className="text-xs text-muted-foreground"></p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Active Alerts</p>
                            <p className="text-2xl font-bold">{dashboard?.alerts?.length ? dashboard.alerts.length : 0}</p>
                            <p className="text-xs text-muted-foreground"></p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Operations Completed</span>
                            <span className="text-sm font-bold">{dashboard?.recentBatches?.length ? Math.min(100, Math.floor((dashboard.recentBatches.filter(b => b.status === 'stored').length / Math.max(1, dashboard.recentBatches.length)) * 100)) + '%' : '0%'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                            <div
                              className="h-4 rounded-full transition-all duration-500 bg-blue-500"
                              style={{ width: `${dashboard?.recentBatches?.length ? Math.min(100, Math.floor((dashboard.recentBatches.filter(b => b.status === 'stored').length / dashboard.recentBatches.length) * 100)) : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Avg. Daily Intake</p>
                              <p className="text-sm font-semibold">{dashboard?.analytics?.monthlyIntake?.length ? Math.floor(dashboard.analytics.monthlyIntake.reduce((sum, month) => sum + month.total, 0) / dashboard.analytics.monthlyIntake.length).toLocaleString() : 0} kg</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Efficiency</p>
                              <p className="text-sm font-semibold">
                                {dashboard?.business?.qualityScore ? Math.round(dashboard.business.qualityScore * 20) + '%' : '0%'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Monthly Revenue
                      </CardTitle>
                      <CardDescription>Current month financial performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="text-center py-4">
                          <div className="text-3xl font-bold text-green-600">PKR {dashboard?.business?.monthlyRevenue?.toLocaleString() || '0'}</div>
                          <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
                        </div>
                        <div className="pt-4 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Growth vs Last Month</span>
                            <span className={`text-sm font-semibold ${dashboard?.business?.monthlyRevenueGrowth ? (dashboard.business.monthlyRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                              {dashboard?.business?.monthlyRevenueGrowth ? (dashboard.business.monthlyRevenueGrowth >= 0 ? '+' : '') + dashboard.business.monthlyRevenueGrowth + '%' : '0%'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${dashboard?.business?.monthlyRevenueGrowth ? (dashboard.business.monthlyRevenueGrowth >= 0 ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-500'}`}
                              style={{ width: `${Math.min(100, Math.abs(dashboard?.business?.monthlyRevenueGrowth || 0))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {dashboard?.alerts?.length ? (
                        dashboard.alerts.map((alert) => (
                          <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${alert.severity.toLowerCase() === "high" ? "bg-red-500" :
                                alert.severity.toLowerCase() === "medium" ? "bg-yellow-500" : "bg-blue-500"
                                }`} />
                              <div>
                                <div className="font-medium text-sm">{alert.type}</div>
                                <div className="text-sm text-muted-foreground">{alert.message}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={getStatusColor(alert.severity)}>{alert.severity}</Badge>
                              <div className="text-xs text-muted-foreground mt-1">{formatDate(alert.time)}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No active alerts 🎉</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatedPieChart
                    data={(dashboard?.analytics?.grainDistribution?.map(grain => ({
                      name: grain.grain,
                      value: grain.percentage
                    })) || [])}
                    title="Grain Distribution"
                  />

                  <AnimatedBarChart
                    data={(dashboard?.analytics?.qualityMetrics?.map(metric => ({
                      name: metric.quality,
                      value: metric.value
                    })) || [])}
                    title="Quality Distribution"
                  />
                </div>

                <AnimatedAreaChart
                  data={(dashboard?.analytics?.monthlyIntake?.map(month => ({
                    name: month.month,
                    value: month.total
                  })) || [])}
                  title="Monthly Grain Intake Trends"
                />
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold">IoT Sensors (Live)</h3>
                  <button className="rounded px-3 py-1 border text-sm hover:bg-muted transition" onClick={fetchLiveSensors} disabled={loadingSensors}>Refresh</button>
                </div>
                {loadingSensors ? (
                  <div className="py-6 text-center text-gray-500">Loading live sensors...</div>
                ) : errorSensors ? (
                  <div className="py-6 text-center text-red-500">{errorSensors}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {sensors.length ? sensors.map(sensor => (
                      <Card key={sensor.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center">
                            {sensor.type === 'temperature' && <Thermometer className="mr-2 h-4 w-4" />}
                            {sensor.type === 'humidity' && <Droplets className="mr-2 h-4 w-4" />}
                            {sensor.type === 'co2' && <Wind className="mr-2 h-4 w-4" />}
                            {sensor.type.charAt(0).toUpperCase() + sensor.type.slice(1)}
                          </CardTitle>
                          <CardDescription>{sensor.location}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-2xl font-bold">
                              {sensor.value} {sensor.unit}
                            </div>
                            <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                            <div className="text-xs text-muted-foreground">Last reading: {formatDate(sensor.lastReading)}</div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Battery</span> <span>{sensor.battery}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Signal</span> <span>{sensor.signal} dBm</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )) : (
                      <Card className="col-span-full">
                        <CardContent className="text-center py-12">
                          <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No sensors registered yet.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              {(userRole === "admin") && (
                <TabsContent value="business" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Buyers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{dashboard?.business?.activeBuyers ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Engaged buyers this month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Price/kg</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">PKR {dashboard?.business?.avgPricePerKg?.toFixed(2) ?? "0.00"}</div>
                        <p className="text-xs text-muted-foreground">Based on recent batches</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">PKR {dashboard?.business?.monthlyProfit?.toLocaleString() ?? '0'}</div>
                        <p className="text-xs text-muted-foreground">This month&apos;s profit</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Selling Price</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">PKR {dashboard?.business?.averageSellingPrice?.toFixed(2) ?? '0.00'}</div>
                        <p className="text-xs text-muted-foreground">Per kg this month</p>
                      </CardContent>
                    </Card>
                  </div>

                  <AnimatedLineChart
                    data={(dashboard?.analytics?.monthlyIntake?.map(month => ({
                      name: month.month,
                      value: month.total
                    })) || [])}
                    title="Revenue & Throughput Trends"
                  />
                </TabsContent>
              )}
            </Tabs>

            {/* Role Specific Dashboard Section */}
            <div className="my-8">
              {renderRoleSpecificDashboard()}
            </div>
          </>
        )}
      </div>
    </AnimatedBackground>
  )
}
