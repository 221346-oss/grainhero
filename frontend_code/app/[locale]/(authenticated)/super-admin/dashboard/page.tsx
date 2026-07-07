"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Building2,
    Users,
    CreditCard,
    Activity,
    TrendingUp,
    Package,
    Archive,
    AlertTriangle,
} from "lucide-react"
import { api } from "@/lib/api"
import { StatCard } from "@/components/dashboard/StatCard"
import { toast } from "sonner"

interface DashboardMetrics {
    total_customers: number
    active_users: number
    active_subscriptions: number
    mrr: number
    total_batches: number
    total_silos: number
    critical_alerts: number
}

interface DashboardData {
    metrics: DashboardMetrics
    distributions: {
        subscriptions: Record<string, number>
    }
}

export default function SuperAdminDashboardPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<DashboardData | null>(null)

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            setLoading(true)
            const res = await api.get<DashboardData>("/api/super-admin/dashboard")
            if (res.ok && res.data) {
                setData(res.data)
            } else {
                toast.error("Failed to load dashboard data")
            }
        } catch (_error) {
            console.error('Error loading dashboard data:', _error)
        } finally {
            setLoading(false)
        }
    }

    const metrics = data?.metrics

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Platform Overview
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor global system performance and business metrics
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse h-32" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Revenue (MRR)"
                        value={`PKR ${(metrics?.mrr || 0).toLocaleString()}`}
                        description="Monthly Recurring Revenue"
                        icon={CreditCard}
                        className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100"
                        iconClassName="text-emerald-600"
                        trend={{ value: 12, label: "vs last month", positive: true }}
                    />
                    <StatCard
                        title="Active Customers"
                        value={(metrics?.total_customers || 0).toLocaleString()}
                        description="Total organizations on platform"
                        icon={Building2}
                        className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100"
                        iconClassName="text-blue-600"
                        trend={{ value: 5, label: "new this month", positive: true }}
                    />
                    <StatCard
                        title="Total Users"
                        value={(metrics?.active_users || 0).toLocaleString()}
                        description="Active users across all customers"
                        icon={Users}
                        className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-100"
                        iconClassName="text-purple-600"
                        trend={{ value: 8, label: "growth", positive: true }}
                    />
                    <StatCard
                        title="System Health"
                        value={metrics?.critical_alerts === 0 ? "Healthy" : "Attention"}
                        description={`${metrics?.critical_alerts || 0} critical alerts`}
                        icon={Activity}
                        className={`bg-gradient-to-br ${(metrics?.critical_alerts || 0) > 0
                                ? "from-amber-50 to-amber-100/50 border-amber-100"
                                : "from-green-50 to-green-100/50 border-green-100"
                            }`}
                        iconClassName={(metrics?.critical_alerts || 0) > 0 ? "text-amber-600" : "text-green-600"}
                    />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader>
                        <CardTitle>Platform Activity</CardTitle>
                        <CardDescription>
                            Recent activity across all customers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50/50">
                            <div className="text-center">
                                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Activity Chart (Coming Soon)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader>
                        <CardTitle>Subscription Distribution</CardTitle>
                        <CardDescription>
                            Active plans across customers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.distributions?.subscriptions && Object.entries(data.distributions.subscriptions).map(([plan, count], i) => (
                                <div key={plan} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500'][i % 4]
                                        }`} />
                                    <div className="flex-1 font-medium text-sm">{plan}</div>
                                    <div className="font-bold">{count}</div>
                                </div>
                            ))}
                            {(!data?.distributions?.subscriptions || Object.keys(data.distributions.subscriptions).length === 0) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No active subscriptions found
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(metrics?.total_batches || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Processed across platform
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Silos</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(metrics?.total_silos || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently online monitored
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{metrics?.critical_alerts || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Requiring attention
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
