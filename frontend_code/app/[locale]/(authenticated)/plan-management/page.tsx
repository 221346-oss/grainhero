"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Crown,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Users,
  HardDrive,
  Smartphone,
  CheckCircle,
  XCircle,
  TrendingUp,
  Settings
} from "lucide-react"
import { DataTable } from "@/components/dashboard/DataTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { AlertCard } from "@/components/dashboard/AlertCard"

interface PlanFeature {
  key: string
  name: string
  description: string
  price: number
  currency: string
  billingCycle: string
  limits: {
    users: {
      managers: number
      technicians: number
      total: number
    }
    grain_batches: number
    sensors: number
    silos: number
    storage_gb: number
    api_calls_per_month: number
    reports_per_month: number
  }
  features: Record<string, boolean>
}

interface Alert {
  id: string | number
  type: "critical" | "warning" | "info" | "success"
  message: string
  time: string
  location?: string
  details?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
}

interface SubscriptionSummary {
  total_subscriptions: number
  total_revenue: number
  plans_distribution: Record<string, number>
  total_warnings: number
}

interface SubscriptionAnalyticsRow {
  subscription_id: string
  plan_name: string
  customer: string
  status: string
  price_per_month: number
  usage: {
    users: number
    devices: number
    storage_gb: number
    batches: number
  }
  limits: {
    users: number
    devices: number
    storage_gb: number
    batches: number
  }
  warnings: number
  created_at: string
  [key: string]: unknown
}

const formatCurrency = (value: number, currency = "PKR") => {
  if (Number.isNaN(value)) return "PKR 0"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(value)
  } catch {
    return `$${value.toLocaleString()}`
  }
}

const formatLimit = (value: number, suffix = "", fallback = "Unlimited") => {
  if (value === -1) return fallback
  return `${value.toLocaleString()}${suffix}`
}

const premiumFeatureLabels: Record<string, string> = {
  ai_predictions: "AI Predictions",
  advanced_analytics: "Advanced Analytics",
  priority_support: "Priority Support",
  custom_integrations: "Custom Integrations",
  api_access: "API Access",
  white_label: "White Label",
  mobile_app: "Mobile App"
}

export default function PlanManagementPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [plans, setPlans] = useState<PlanFeature[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionAnalyticsRow[]>([])
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const planStats = {
    totalPlans: plans.length,
    activeSubscriptions: summary?.total_subscriptions ?? 0,
    monthlyRevenue: summary?.total_revenue ?? 0,
    averageRevenue:
      summary && summary.total_subscriptions
        ? summary.total_revenue / summary.total_subscriptions
        : 0,
    totalWarnings: summary?.total_warnings ?? 0
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const headers: HeadersInit = {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }

        const fetchWithAuth = async <T,>(path: string): Promise<T> => {
          const res = await fetch(`${backendUrl}${path}`, { headers })
          if (!res.ok) {
            let message = "Request failed"
            try {
              const body = await res.json()
              message = body?.error || body?.message || message
            } catch {
              // ignore json parse error
            }
            throw new Error(message)
          }
          return res.json()
        }

        const [planResponse, analyticsResponse, warningsResponse] = await Promise.allSettled([
          fetchWithAuth<{ plans: Record<string, Omit<PlanFeature, "key">> }>("/api/plan-management/plans"),
          fetchWithAuth<{ summary: SubscriptionSummary; subscriptions: SubscriptionAnalyticsRow[] }>("/api/subscription-analytics/all-analytics"),
          fetchWithAuth<{ warnings: Array<{ type: string; message: string; current: number; limit: number; percentage: number }> }>("/api/subscription-analytics/warnings")
        ])

        if (planResponse.status === "fulfilled") {
          const planEntries = Object.entries(planResponse.value.plans || {}).map(([key, value]) => ({
            key,
            ...value
          }))
          setPlans(planEntries)
        } else {
          setError(prev => prev || planResponse.reason?.message || "Unable to load plans")
        }

        if (analyticsResponse.status === "fulfilled") {
          setSummary(analyticsResponse.value.summary)
          setSubscriptions(analyticsResponse.value.subscriptions)
        } else {
          setError(prev => prev || analyticsResponse.reason?.message || "Unable to load subscription analytics")
        }

        if (warningsResponse.status === "fulfilled" && warningsResponse.value?.warnings?.length) {
          const formattedWarnings: Alert[] = warningsResponse.value.warnings.map((warning, index) => ({
            id: `${warning.type}-${index}`,
            type: warning.percentage >= 95 ? "critical" : "warning",
            message: warning.message,
            time: new Date().toLocaleString(),
            details: `${warning.current}/${warning.limit} ${warning.type}`
          }))
          setAlerts(formattedWarnings)
        } else {
          setAlerts([])
        }
      } catch (err) {
        console.error("Error loading plan management data:", err)
        setError((err as Error).message || "Failed to load plan management data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default"
      case "inactive": return "secondary"
      case "draft": return "outline"
      default: return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "inactive": return <XCircle className="h-4 w-4 text-red-600" />
      case "draft": return <Edit className="h-4 w-4 text-yellow-600" />
      default: return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const term = searchTerm.toLowerCase()
    return (
      sub.plan_name.toLowerCase().includes(term) ||
      (sub.customer || "").toLowerCase().includes(term) ||
      sub.status.toLowerCase().includes(term)
    )
  })

  const columns = [
    {
      key: "plan",
      label: "Plan",
      render: (_: unknown, row: SubscriptionAnalyticsRow) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Crown className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <div className="font-medium">{row.plan_name}</div>
            <div className="text-sm text-muted-foreground">{row.customer || "Unassigned customer"}</div>
          </div>
        </div>
      )
    },
    {
      key: "pricing",
      label: "Pricing",
      render: (_: unknown, row: SubscriptionAnalyticsRow) => (
        <div>
          <div className="font-medium">{formatCurrency(row.price_per_month || 0)}</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (_: unknown, row: SubscriptionAnalyticsRow) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(row.status)}
          <Badge variant={getStatusColor(row.status)}>
            {row.status}
          </Badge>
        </div>
      )
    },
    {
      key: "usage",
      label: "Usage",
      render: (_: unknown, row: SubscriptionAnalyticsRow) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Users</span>
            <span>{row.usage.users}/{formatLimit(row.limits.users, "", "∞")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Devices</span>
            <span>{row.usage.devices}/{formatLimit(row.limits.devices, "", "∞")}</span>
          </div>
        </div>
      )
    },
    {
      key: "warnings",
      label: "Warnings",
      render: (_: unknown, row: SubscriptionAnalyticsRow) => (
        <Badge variant={row.warnings > 0 ? "destructive" : "secondary"}>
          {row.warnings} warning{row.warnings === 1 ? "" : "s"}
        </Badge>
      )
    }
  ]

  const actions = [
    {
      label: "View",
      icon: Eye,
      onClick: (row: SubscriptionAnalyticsRow) => console.log("View subscription:", row.subscription_id),
      variant: "outline" as const
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: SubscriptionAnalyticsRow) => console.log("Edit subscription:", row.subscription_id),
      variant: "outline" as const
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: SubscriptionAnalyticsRow) => console.log("Delete subscription:", row.subscription_id),
      variant: "destructive" as const,
      show: (row: SubscriptionAnalyticsRow) => row.warnings === 0
    }
  ]

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plan management data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plan Management</h2>
          <p className="text-muted-foreground">
            Manage subscription plans, usage, and billing for every customer
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Plans Offered"
          value={planStats.totalPlans}
          description="Published pricing tiers"
          icon={Crown}
        />
        <StatCard
          title="Active Subscriptions"
          value={planStats.activeSubscriptions}
          description="Across all customers"
          icon={Users}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(planStats.monthlyRevenue)}
          description={`Avg: ${formatCurrency(planStats.averageRevenue)} per subscription`}
          icon={DollarSign}
        />
        <StatCard
          title="Usage Warnings"
          value={planStats.totalWarnings}
          description="Subscriptions nearing limits"
          icon={TrendingUp}
          trend={
            planStats.totalWarnings > 0
              ? { value: planStats.totalWarnings, label: "need attention", positive: false }
              : undefined
          }
        />
      </div>

      {/* Critical Alerts */}
      <AlertCard
        title="Plan Alerts"
        description="Limits approaching capacity"
        alerts={alerts}
        maxItems={2}
      />

      {/* Plans Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.key} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <span>{plan.name}</span>
                </CardTitle>
                <Badge variant="outline" className="capitalize">
                  {plan.billingCycle}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pricing */}
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.price, plan.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">per {plan.billingCycle}</div>
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>Users</span>
                    </span>
                    <span>{formatLimit(plan.limits.users.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <Smartphone className="h-3 w-3" />
                      <span>Sensors</span>
                    </span>
                    <span>{formatLimit(plan.limits.sensors)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center space-x-1">
                      <HardDrive className="h-3 w-3" />
                      <span>Storage</span>
                    </span>
                    <span>{formatLimit(plan.limits.storage_gb, " GB")}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(premiumFeatureLabels).map(([key, label]) =>
                    plan.features?.[key] ? (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ) : null
                  )}
                </div>
              </div>
            </CardContent>
            <div className="absolute top-4 right-4">
              <Button size="sm" variant="outline" onClick={() => console.log("Edit plan:", plan.key)}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Active subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>
            Monitor customer subscriptions, usage, and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Enter plan name, customer, or status to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          <DataTable<SubscriptionAnalyticsRow>
            title=""
            data={filteredSubscriptions}
            columns={columns}
            actions={actions}
            emptyMessage="No subscriptions found matching your criteria"
          />
        </CardContent>
      </Card>

      {/* Create/Edit Plan Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Plan</CardTitle>
              <CardDescription>
                Create a new subscription plan for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Plan Name</label>
                  <Input placeholder="e.g., Enterprise" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Plan description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Price (PKR)</label>
                    <Input type="number" placeholder="99" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stripe Price ID</label>
                    <Input placeholder="price_xxx" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Limits</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Users</label>
                      <Input type="number" placeholder="100" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Devices</label>
                      <Input type="number" placeholder="200" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Storage (GB)</label>
                      <Input type="number" placeholder="100" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Batches</label>
                      <Input type="number" placeholder="-1 for unlimited" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Features</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">AI Features</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Priority Support</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Custom Integrations</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <label className="text-sm">Advanced Analytics</label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-2 p-6">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateForm(false)}>
                Create Plan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
