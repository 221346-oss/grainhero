"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  DollarSign,
  AlertTriangle,
  Package,
  Smartphone,
  BarChart3,
  Settings,
  Zap,
  UserPlus,
} from "lucide-react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type DashboardResponse = {
  stats: Array<{ title: string; value: number | string }>
  storageDistribution: Array<{ status: string; count: number }>
  grainTypeDistribution: Array<{ grainType: string; count: number }>
  capacityStats: { totalCapacity: number; totalCurrentQuantity: number; utilizationPercentage: number }
  suggestions: { criticalStorage: Array<{ siloId: string; name: string; reason: string }>; optimization: Array<{ siloId: string; name: string; reason: string }> }
}

interface User {
  _id: string
  name: string
  email: string
  role: string
  lastLogin?: string
}

interface RecentBatch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  intake_date: string
  purchase_price_per_kg?: number
  actual_dispatch_date?: string
}

export function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([])
  const [planInfo, setPlanInfo] = useState<{
    name: string;
    price: number;
    billingCycle: string;
    features: Record<string, boolean>;
    limits: {
      users: { total: number | string };
      grain_batches: { total: number | string };
      storage_gb: { total: number | string };
    };
  } | null>(null)
  const [usageStats, setUsageStats] = useState<{
    users: {
      managers: number;
      technicians: number;
      total: number;
    };
    grain_batches: number;
    storage_gb: number;
    api_calls_this_month: number;
  } | null>(null)
  const [totalBatches, setTotalBatches] = useState(0)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const [dashboardRes, usersRes, batchesRes, planRes] = await Promise.all([
            api.get<DashboardResponse>("/dashboard"),
            api.get<{ users: User[] }>("/api/user-management/users?limit=5"),
            api.get<{ batches: RecentBatch[]; pagination?: { total_items: number } }>("/api/grain-batches?limit=100"),
            api.get<{
              plan: {
                name: string;
                price: number;
                billingCycle: string;
                features: Record<string, boolean>;
                limits: {
                  users: { total: number | string };
                  grain_batches: { total: number | string };
                  storage_gb: { total: number | string };
                };
              };
              usage: {
                users: {
                  managers: number;
                  technicians: number;
                  total: number;
                };
                grain_batches: number;
                storage_gb: number;
                api_calls_this_month: number;
              };
            }>("/api/plan-management/plan-info")
          ])

          if (!mounted) return

          if (dashboardRes.ok && dashboardRes.data) {
            setData(dashboardRes.data)
          } else {
            setError(dashboardRes.error || "Failed to load dashboard")
          }

          if (usersRes.ok && usersRes.data) {
            // Filter out admin users from the list (they have their own profile)
            const filteredUsers = (usersRes.data.users as unknown as User[]).filter(user => user.role !== 'admin')
            setUsers(filteredUsers)
          }

          if (batchesRes.ok && batchesRes.data) {
            const batches = batchesRes.data.batches as unknown as RecentBatch[]
            setRecentBatches(batches.slice(0, 5)) // Show only 5 most recent
            // Update total batches count from pagination if available
            if (batchesRes.data.pagination?.total_items !== undefined && batchesRes.data.pagination.total_items > 0) {
              setTotalBatches(batchesRes.data.pagination.total_items)
            } else if (batches.length > 0) {
              // If no pagination info but we got batches, use the count
              setTotalBatches(batches.length)
            } else {
              // Only set to 0 if we truly have no batches
              setTotalBatches(0)
            }
          } else {
            // Only set to 0 if API call failed
            setTotalBatches(0)
            setRecentBatches([])
          }

          if (planRes.ok && planRes.data) {
            setPlanInfo(planRes.data.plan)
            setUsageStats(planRes.data.usage)
          }
        } catch (error) {
          console.error('Failed to load dashboard data:', error)
          setError('Failed to load dashboard data')
        } finally {
          setIsLoading(false)
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  // Calculate real revenue from dispatched batches
  const totalRevenue = recentBatches
    .filter(b => b.status === 'dispatched' && b.actual_dispatch_date)
    .reduce((sum, b) => {
      const pricePerKg = b.purchase_price_per_kg || 50 // Default to 50 if not available
      return sum + (b.quantity_kg * pricePerKg)
    }, 0)

  const adminStats = {
    totalUsers: usageStats?.users?.total || users.length,
    totalBatches: totalBatches > 0 ? totalBatches : (usageStats?.grain_batches || (recentBatches.length > 0 ? recentBatches.length : 0)),
    totalRevenue: totalRevenue,
    systemHealth: data?.capacityStats?.utilizationPercentage ?? 0,
    activeAlerts: 0,
    criticalIssues: (data?.suggestions?.criticalStorage?.length ?? 0) > 0 ? 1 : 0,
    planUsage: 0
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) return { color: 'bg-green-100 text-green-800', label: 'Low' }
    if (riskScore < 70) return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' }
    return { color: 'bg-red-100 text-red-800', label: 'High' }
  }

  // Use real plan data if available, otherwise fallback to mock data
  const planDetails = planInfo ? {
    name: planInfo.name,
    price: `$${planInfo.price}/${planInfo.billingCycle}`,
    features: Object.entries(planInfo.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature.replace('_', ' ')),
    usage: {
      users: {
        used: usageStats?.users?.total || 0,
        limit: planInfo.limits.users.total === -1 ? "unlimited" : planInfo.limits.users.total
      },
      batches: {
        used: usageStats?.grain_batches || 0,
        limit: planInfo.limits.grain_batches.total === -1 ? "unlimited" : planInfo.limits.grain_batches.total
      },
      storage: {
        used: usageStats?.storage_gb || 0,
        limit: planInfo.limits.storage_gb.total === -1 ? "unlimited" : planInfo.limits.storage_gb.total
      }
    }
  } : {
    name: "Professional Plan",
    price: "$399/month",
    features: ["Up to 60 users", "1000 batches", "Advanced AI", "Priority support"],
    usage: {
      users: { used: 15, limit: 60 },
      batches: { used: 156, limit: 1000 },
      storage: { used: 5.2, limit: 20 }
    }
  }

  const systemAlerts = [
    ...(adminStats.criticalIssues > 0
      ? [{ id: 1, type: "critical", message: "Storage near capacity detected", time: "just now", location: "Multiple Silos" }]
      : []),
    // Add plan-based alerts
    ...(planDetails && planDetails.usage.users.limit !== "unlimited" && typeof planDetails.usage.users.limit === 'number' &&
      (planDetails.usage.users.used / planDetails.usage.users.limit) >= 0.9
      ? [{ id: 2, type: "warning", message: "Approaching user limit", time: "just now", location: "Plan Limits" }]
      : []),
    ...(planDetails && planDetails.usage.storage.limit !== "unlimited" && typeof planDetails.usage.storage.limit === 'number' &&
      (planDetails.usage.storage.used / planDetails.usage.storage.limit) >= 0.9
      ? [{ id: 3, type: "warning", message: "Storage limit nearly reached", time: "just now", location: "Plan Limits" }]
      : []),
  ] as Array<{ id: number; type: "critical" | "warning" | "info"; message: string; time: string; location?: string }>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">


      {/* Admin Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {planDetails.usage.users.used}/{planDetails.usage.users.limit} limit
            </p>
            <Progress value={
              planDetails.usage.users.limit === "unlimited" ? 0 :
                typeof planDetails.usage.users.limit === 'number' ? (adminStats.totalUsers / planDetails.usage.users.limit) * 100 : 0
            } className="mt-2" />
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grain Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              {recentBatches.length > 0 ? `${recentBatches.length} recent` : 'No batches yet'}
            </p>
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {adminStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card> */}

      </div>

      {/* Critical Alerts - Only show if there are actual critical issues */}
      {adminStats.criticalIssues > 0 && systemAlerts.filter(alert => alert.type === "critical").length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemAlerts.filter(alert => alert.type === "critical").map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-900">{alert.message}</p>
                    <p className="text-sm text-red-600">{alert.location} • {alert.time}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => toast.info('Alert resolution feature coming soon')}>Resolve</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Management
            </CardTitle>
            <CardDescription>
              Manage your team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{user.name}</h4>
                      <Badge variant="default">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => router.push('/team-management')}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/team-management?user=${user._id}`)}>View</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button className="w-full" onClick={() => router.push('/team-management')}>
                <UserPlus className="h-4 w-4 mr-2" />
                Team Management
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grain Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Recent Grain Batches
            </CardTitle>
            <CardDescription>
              Latest grain batch status and risk levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBatches.length > 0 ? recentBatches.map((batch) => {
                const riskBadge = getRiskBadge(batch.risk_score)
                return (
                  <div key={batch._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{batch.grain_type}</h4>
                        <Badge className={riskBadge.color}>
                          {riskBadge.label} risk
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span>{batch.quantity_kg.toLocaleString()} kg</span>
                        <span className="capitalize">{batch.status}</span>
                        <span>{batch.batch_id}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/grain-batches?id=${batch._id}`)}>View</Button>
                  </div>
                )
              }) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent batches yet</p>
              )}
            </div>
            {recentBatches.length > 0 && (
              <div className="mt-4">
                <Button className="w-full" variant="outline" onClick={() => router.push('/grain-batches')}>
                  View All Batches
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common administrative tasks for your farm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push('/team-management')}
            >
              <UserPlus className="h-6 w-6" />
              <span>Invite Team Member</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push('/grain-batches')}
            >
              <Package className="h-6 w-6" />
              <span>New Batch</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push('/sensors')}
            >
              <Smartphone className="h-6 w-6" />
              <span>Manage Sensors</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push('/analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push('/settings')}
            >
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push('/billing')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Billing</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
