"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    Globe,
    Users,
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign,
    Building2,
    Smartphone,
    Database,
    Calendar,
    Download,
    LucideIcon
} from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface AnalyticsData {
    revenue_trend: { month: string, revenue: number }[]
    geo_distribution: { _id: string, count: number }[]
}

interface AnalyticsMetric {
    name: string
    value: number
    change: number
    trend: "up" | "down" | "stable"
    unit: string
    icon: LucideIcon | undefined
}

export default function PlatformAnalyticsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [, setLoading] = useState(true)
    const [data, setData] = useState<AnalyticsData | null>(null)

    // Simulated metrics for now (would come from specific analytics endpoints in fully implemented system)
    // In a real system, these would also be fetched from the API
    const [metrics, _setMetrics] = useState<AnalyticsMetric[]>([
        { name: "Total Users", value: 12470, change: 12.5, trend: "up", unit: "users", icon: Users },
        { name: "Active Customers", value: 245, change: 8.2, trend: "up", unit: "customers", icon: Building2 },
        { name: "Monthly Revenue", value: 1250000, change: 15.8, trend: "up", unit: "PKR", icon: DollarSign },
        { name: "API Requests", value: 12500000, change: 23.1, trend: "up", unit: "reqs", icon: Activity },
        { name: "Data Stored", value: 2.4, change: 18.7, trend: "up", unit: "TB", icon: Database },
        { name: "Mobile Users", value: 68.5, change: 5.2, trend: "up", unit: "%", icon: Smartphone }
    ])

    useEffect(() => {
        loadAnalytics()
    }, [])

    const loadAnalytics = async () => {
        try {
            setLoading(true)
            const res = await api.get<AnalyticsData>("/api/super-admin/analytics")
            if (res.ok && res.data) {
                setData(res.data)
            } else {
                toast.error("Failed to load analytics data")
            }
        } catch (_error) {
            toast.error("An error occurred loading analytics")
        } finally {
            setLoading(false)
        }
    }

    const _getTrendIcon = (trend: string) => {
        switch (trend) {
            case "up": return <TrendingUp className="h-4 w-4 text-green-500" />
            case "down": return <TrendingDown className="h-4 w-4 text-red-500" />
            case "stable": return <Activity className="h-4 w-4 text-blue-500" />
            default: return <Activity className="h-4 w-4 text-gray-500" />
        }
    }

    const _getTrendColor = (trend: string) => {
        switch (trend) {
            case "up": return "text-green-600"
            case "down": return "text-red-600"
            case "stable": return "text-blue-600"
            default: return "text-gray-600"
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Platform Analytics
                    </h2>
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric, index) => {
                    const IconComponent = metric.icon
                    return (
                        <StatCard
                            key={index}
                            title={metric.name}
                            value={metric.unit === "PKR" ? `PKR ${metric.value.toLocaleString()}` : metric.value.toLocaleString()}
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

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 shadow-sm hover:shadow-md transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                            Revenue Trend (6 Months)
                        </CardTitle>
                        <CardDescription>
                            Monthly revenue growth simulation
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-4">
                            {data?.revenue_trend.map((item, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-gray-700">{item.month}</span>
                                        <span className="font-bold text-gray-900">PKR {item.revenue.toLocaleString()}</span>
                                    </div>
                                    {/* Max revenue for bar calculation is simulated as 2x current for visual range */}
                                    <Progress value={(item.revenue / (Math.max(...data.revenue_trend.map(r => r.revenue)) * 1.2)) * 100} className="h-2 bg-gray-100" />
                                </div>
                            ))}
                            {!data?.revenue_trend.length && <div className="text-center text-muted-foreground">No revenue data available</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 shadow-sm hover:shadow-md transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Globe className="h-5 w-5 mr-2 text-blue-600" />
                            Geographic Distribution
                        </CardTitle>
                        <CardDescription>
                            User distribution by country
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-4">
                            {data?.geo_distribution.map((item, i) => {
                                const total = data.geo_distribution.reduce((acc, curr) => acc + curr.count, 0)
                                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <span className="text-xs font-bold text-blue-600">{item._id.substring(0, 2).toUpperCase()}</span>
                                                </div>
                                                <div className="font-medium">{item._id || "Unknown"}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold">{item.count}</span> <span className="text-gray-500 text-sm">({percentage}%)</span>
                                            </div>
                                        </div>
                                        <Progress value={percentage} className="h-2" />
                                    </div>
                                )
                            })}
                            {!data?.geo_distribution.length && <div className="text-center text-muted-foreground">No geographic data available</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
