"use client"

//import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Globe, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Activity,
  DollarSign,
  Building2,
  Smartphone,
  Database,
  Zap,
  Eye,
  Download,
  //Filter,
  Calendar,
  LucideIcon
} from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { DataTable } from "@/components/dashboard/DataTable"

interface AnalyticsMetric {
  name: string
  value: number
  change: number
  trend: "up" | "down" | "stable"
  unit: string
  icon: LucideIcon | undefined
}

interface GeographicData {
  country: string
  users: number
  revenue: number
  growth: number
  percentage: number
}

interface CustomerAnalytics extends Record<string, unknown> {
  id: string
  name: string
  users: number
  revenue: number
  growth: number
  plan: string
  status: string
  lastActivity: string
}

export default function GlobalAnalyticsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  //const [timeRange, setTimeRange] = useState("30d")
  //const [selectedMetric, setSelectedMetric] = useState("all")

  // Mock data - in real app, this would come from API
  // const globalStats = {
  //   totalUsers: 12470,
  //   totalCustomers: 245,
  //   totalRevenue: 1250000,
  //   averageSessionTime: 24.5,
  //   bounceRate: 12.3,
  //   conversionRate: 8.7
  // }

  const analyticsMetrics: AnalyticsMetric[] = [
    {
      name: "Total Users",
      value: 12470,
      change: 12.5,
      trend: "up",
      unit: "users",
      icon: Users
    },
    {
      name: "Active Customers",
      value: 245,
      change: 8.2,
      trend: "up",
      unit: "customers",
      icon: Building2
    },
    {
      name: "Monthly Revenue",
      value: 1250000,
      change: 15.8,
      trend: "up",
      unit: "PKR",
      icon: DollarSign
    },
    {
      name: "API Requests",
      value: 12500000,
      change: 23.1,
      trend: "up",
      unit: "requests",
      icon: Activity
    },
    {
      name: "Data Processed",
      value: 2.4,
      change: 18.7,
      trend: "up",
      unit: "TB",
      icon: Database
    },
    {
      name: "Mobile Users",
      value: 68.5,
      change: 5.2,
      trend: "up",
      unit: "%",
      icon: Smartphone
    }
  ]

  const geographicData: GeographicData[] = [
    { country: "United States", users: 4520, revenue: 450000, growth: 12.5, percentage: 36.2 },
    { country: "Canada", users: 1890, revenue: 189000, growth: 8.7, percentage: 15.2 },
    { country: "United Kingdom", users: 1560, revenue: 156000, growth: 15.3, percentage: 12.5 },
    { country: "Australia", users: 1230, revenue: 123000, growth: 9.8, percentage: 9.9 },
    { country: "Germany", users: 980, revenue: 98000, growth: 11.2, percentage: 7.9 },
    { country: "France", users: 760, revenue: 76000, growth: 7.4, percentage: 6.1 },
    { country: "Others", users: 1530, revenue: 153000, growth: 14.6, percentage: 12.2 }
  ]

  const topCustomers: CustomerAnalytics[] = [
    { id: "T001", name: "Green Valley Farms", users: 1250, revenue: 12500, growth: 18.5, plan: "Pro", status: "active", lastActivity: "2 hours ago" },
    { id: "T002", name: "Golden Harvest Co.", users: 980, revenue: 9800, growth: 12.3, plan: "Enterprise", status: "active", lastActivity: "1 hour ago" },
    { id: "T003", name: "Sunrise Agriculture", users: 750, revenue: 7500, growth: 8.7, plan: "Pro", status: "active", lastActivity: "30 min ago" },
    { id: "T004", name: "Mountain View Storage", users: 650, revenue: 6500, growth: 15.2, plan: "Pro", status: "active", lastActivity: "45 min ago" },
    { id: "T005", name: "Prairie Grain Co.", users: 520, revenue: 5200, growth: 6.8, plan: "Intermediate", status: "active", lastActivity: "1 hour ago" }
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />
      case "stable": return <Activity className="h-4 w-4 text-blue-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600"
      case "down": return "text-red-600"
      case "stable": return "text-blue-600"
      default: return "text-gray-600"
    }
  }

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (value: unknown, row: CustomerAnalytics) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-muted-foreground">{row.id}</div>
          </div>
        </div>
      )
    },
    {
      key: "users",
      label: "Users",
      render: (value: unknown, row: CustomerAnalytics) => (
        <div className="text-center">
          <div className="font-medium">{row.users.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">active users</div>
        </div>
      )
    },
    {
      key: "revenue",
      label: "Revenue",
      render: (value: unknown, row: CustomerAnalytics) => (
        <div className="text-center">
          <div className="font-medium">${row.revenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
      )
    },
    {
      key: "growth",
      label: "Growth",
      render: (value: unknown, row: CustomerAnalytics) => (
        <div className="flex items-center space-x-2">
          {getTrendIcon("up")}
          <span className={`font-medium ${getTrendColor("up")}`}>
            +{row.growth}%
          </span>
        </div>
      )
    },
    {
      key: "plan",
      label: "Plan",
      render: (value: unknown, row: CustomerAnalytics) => (
        <Badge variant={row.plan === "Enterprise" ? "default" : "secondary"}>
          {row.plan}
        </Badge>
      )
    },
    {
      key: "lastActivity",
      label: "Last Activity",
      render: (value: unknown, row: CustomerAnalytics) => (
        <div className="text-sm text-muted-foreground">
          {row.lastActivity}
        </div>
      )
    }
  ]

  const actions: {
    label: string;
    icon?: LucideIcon;
    onClick: (row: CustomerAnalytics) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    show?: (row: CustomerAnalytics) => boolean;
  }[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row: CustomerAnalytics) => console.log("View customer:", row.id),
      variant: "outline" as const
    }
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Global Analytics</h2>
          <p className="text-muted-foreground">
            System-wide analytics and performance insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyticsMetrics.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <StatCard
              key={index}
              title={metric.name}
              value={metric.value.toLocaleString()}
              description={`${metric.change > 0 ? '+' : ''}${metric.change}% from last month`}
              icon={IconComponent || TrendingUp}
              trend={{ 
                value: Math.abs(metric.change), 
                label: "from last month", 
                positive: metric.trend === "up" 
              }}
            />
          )
        })}
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>
            User distribution and revenue by country
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {geographicData.map((country, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{country.country}</div>
                      <div className="text-sm text-muted-foreground">
                        {country.users.toLocaleString()} users • ${country.revenue.toLocaleString()} revenue
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{country.percentage}%</div>
                    <div className={`text-sm flex items-center ${getTrendColor("up")}`}>
                      {getTrendIcon("up")}
                      <span className="ml-1">+{country.growth}%</span>
                    </div>
                  </div>
                </div>
                <Progress value={country.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Top Performing Customers
          </CardTitle>
          <CardDescription>
            Highest revenue generating customers this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            title=""
            data={topCustomers}
            columns={columns}
            actions={actions}
            emptyMessage="No customer data available"
          />
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              User Growth Trend
            </CardTitle>
            <CardDescription>
              User acquisition over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>User growth chart will be implemented</p>
                <p className="text-sm">Real-time user analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Revenue Distribution
            </CardTitle>
            <CardDescription>
              Revenue breakdown by plan type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="h-12 w-12 mx-auto mb-2" />
                <p>Revenue distribution chart will be implemented</p>
                <p className="text-sm">Plan-based revenue analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response Time</span>
                <span className="font-medium">145ms</span>
              </div>
              <Progress value={85} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
              <Progress value={99.9} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Rate</span>
                <span className="font-medium">0.02%</span>
              </div>
              <Progress value={98} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Session Time</span>
                <span className="font-medium">24.5 min</span>
              </div>
              <Progress value={75} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Bounce Rate</span>
                <span className="font-medium">12.3%</span>
              </div>
              <Progress value={88} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-medium">8.7%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Server Load</span>
                <span className="font-medium">45%</span>
              </div>
              <Progress value={45} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Usage</span>
                <span className="font-medium">68%</span>
              </div>
              <Progress value={68} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage Usage</span>
                <span className="font-medium">42%</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
