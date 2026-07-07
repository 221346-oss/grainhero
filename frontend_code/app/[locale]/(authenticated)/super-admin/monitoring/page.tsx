"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Activity,
    Server,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Clock,
    Globe
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { AlertCard } from "@/components/dashboard/AlertCard"

interface SystemMetric {
    name: string
    value: number
    unit: string
    status: "healthy" | "warning" | "critical"
    trend: "up" | "down" | "stable"
    change: number
    threshold: {
        warning: number
        critical: number
    }
}

interface ServerStatus {
    id: string
    name: string
    status: "online" | "offline" | "maintenance"
    location: string
    cpu: number
    memory: number
    disk: number
    uptime: string
    lastCheck: string
}

interface Alert {
    _id: string
    type: string
    message: string
    created_at: string
    location?: string
    details?: string
}

interface MonitoringData {
    servers: ServerStatus[]
    metrics: SystemMetric[]
}

export default function SystemMonitoringPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<MonitoringData | null>(null)
    const [alerts, setAlerts] = useState<Alert[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [monitoringRes, alertsRes] = await Promise.all([
                api.get<MonitoringData>("/api/super-admin/monitoring"),
                api.get<Alert[]>("/api/super-admin/alerts")
            ])

            if (monitoringRes.ok && monitoringRes.data) {
                setData(monitoringRes.data)
            }

            if (alertsRes.ok && alertsRes.data) {
                setAlerts(alertsRes.data)
            }
        } catch (_error) {
            toast.error("An error occurred loading monitoring data")
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy": return "default"
            case "warning": return "secondary"
            case "critical": return "destructive"
            case "online": return "default"
            case "offline": return "destructive"
            case "maintenance": return "outline"
            default: return "outline"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
            case "online": return <CheckCircle className="h-4 w-4 text-green-600" />
            case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-600" />
            case "critical":
            case "offline": return <XCircle className="h-4 w-4 text-red-600" />
            case "maintenance": return <Clock className="h-4 w-4 text-blue-600" />
            default: return <XCircle className="h-4 w-4 text-gray-600" />
        }
    }

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case "up": return <TrendingUp className="h-4 w-4 text-red-500" />
            case "down": return <TrendingDown className="h-4 w-4 text-green-500" />
            case "stable": return <Activity className="h-4 w-4 text-blue-500" />
            default: return <Activity className="h-4 w-4 text-gray-500" />
        }
    }

    // Transform backend alerts to component Alert type if needed, or use directly
    // The AlertCard expects: id, type, message, time, location, details
    const formattedAlerts = alerts.map(alert => ({
        id: alert._id,
        type: (alert.type === 'critical' || alert.type === 'spoiled' ? 'critical' : alert.type === 'warning' || alert.type === 'risky' ? 'warning' : 'info') as "critical" | "warning" | "info" | "success",
        message: alert.message,
        time: new Date(alert.created_at).toLocaleString(),
        location: alert.location || "System",
        details: alert.details
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        System Monitoring
                    </h2>
                    <p className="text-muted-foreground">
                        Real-time infrastructure health and alerts
                    </p>
                </div>
                <Button onClick={loadData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data?.metrics?.map((metric, index) => (
                    <Card key={index} className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center justify-between">
                                <span>{metric.name}</span>
                                {getTrendIcon(metric.trend)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-bold">
                                        {metric.value}{metric.unit}
                                    </div>
                                    <Badge variant={getStatusColor(metric.status)} className={
                                        metric.status === 'healthy' ? 'bg-green-100 text-green-700' : ''
                                    }>
                                        {metric.status}
                                    </Badge>
                                </div>
                                <Progress value={Math.min(100, (metric.value / metric.threshold.warning) * 50)} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Threshold: {metric.threshold.warning}{metric.unit}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertCard
                title="System Alerts"
                description="Recent critical issues across platform"
                alerts={formattedAlerts.slice(0, 5)}
                maxItems={5}
            />

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Server className="h-5 w-5 mr-2" />
                        Infrastructure Status
                    </CardTitle>
                    <CardDescription>
                        Live status of platform servers and databases
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {data?.servers?.map((server) => (
                            <div key={server.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(server.status)}
                                        <h4 className="font-medium">{server.name}</h4>
                                    </div>
                                    <Badge variant={getStatusColor(server.status)} className={
                                        server.status === 'online' ? 'bg-green-100 text-green-700' : ''
                                    }>
                                        {server.status}
                                    </Badge>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center space-x-1 text-gray-500">
                                            <Globe className="h-3 w-3" />
                                            <span>{server.location}</span>
                                        </span>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{server.uptime} uptime</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-gray-100 p-2 rounded">
                                            <div className="text-gray-500 mb-1">CPU</div>
                                            <div className="font-bold">{server.cpu}%</div>
                                            <Progress value={server.cpu} className="h-1 mt-1" />
                                        </div>
                                        <div className="bg-gray-100 p-2 rounded">
                                            <div className="text-gray-500 mb-1">RAM</div>
                                            <div className="font-bold">{server.memory}%</div>
                                            <Progress value={server.memory} className="h-1 mt-1" />
                                        </div>
                                        <div className="bg-gray-100 p-2 rounded">
                                            <div className="text-gray-500 mb-1">DISK</div>
                                            <div className="font-bold">{server.disk}%</div>
                                            <Progress value={server.disk} className="h-1 mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
