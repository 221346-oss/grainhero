"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  //Wifi, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Globe,
  Zap
} from "lucide-react"
//import { StatCard } from "@/components/dashboard/StatCard"
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

interface SystemStats {
  overallHealth: number;
  uptime: string;
  activeUsers: number;
  responseTime: number;
  errorRate: number;
}

export default function SystemHealthPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Fetch system stats from backend instead of using mock data
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [servers, setServers] = useState<ServerStatus[]>([]);

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const resp = await fetch(`${backendUrl}/system/health`, {
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) return;
        const data = await resp.json();
        setSystemStats(data.stats || null);
        setSystemMetrics(data.metrics || []);
        setServers(data.servers || []);
      } catch {
        setSystemStats(null);
        setSystemMetrics([]);
        setServers([]);
      }
    };
    fetchSystemHealth();
    // Optional: poll every X seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const criticalAlerts: Alert[] = [
    {
      id: 1,
      type: "warning",
      message: "High memory usage detected on Web Server 02",
      time: "5 minutes ago",
      location: "US-West-2",
      details: "Memory usage at 71% - approaching warning threshold"
    },
    {
      id: 2,
      type: "info",
      message: "Redis Cache server in maintenance mode",
      time: "15 minutes ago",
      location: "US-West-2",
      details: "Scheduled maintenance for cache optimization"
    }
  ]

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLastUpdate(new Date())
    setIsRefreshing(false)
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Monitor system performance and infrastructure health
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Overall Health Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <Activity className="h-5 w-5 mr-2" />
            Overall System Health: {systemStats?.overallHealth || 'N/A'}%
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={systemStats?.overallHealth || 0} className="h-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{systemStats?.uptime || 'N/A'}</div>
              <div className="text-sm text-green-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{systemStats?.activeUsers || 'N/A'}</div>
              <div className="text-sm text-green-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{systemStats?.responseTime || 'N/A'}ms</div>
              <div className="text-sm text-green-600">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{systemStats?.errorRate || 'N/A'}%</div>
              <div className="text-sm text-green-600">Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {systemMetrics.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2" />
            <p>No system metrics data available.</p>
          </div>
        ) : (
          systemMetrics.map((metric, index) => (
            <Card key={index}>
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
                    <Badge variant={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  <Progress 
                    value={metric.value} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Change: {metric.change > 0 ? '+' : ''}{metric.change}{metric.unit}</span>
                    <span>Threshold: {metric.threshold.warning}{metric.unit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Critical Alerts */}
      <AlertCard
        title="System Alerts"
        description="Issues requiring attention"
        alerts={criticalAlerts}
        maxItems={3}
      />

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2" />
            Server Status
          </CardTitle>
          <CardDescription>
            Real-time status of all infrastructure servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {servers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-2" />
                <p>No server status data available.</p>
              </div>
            ) : (
              servers.map((server) => (
                <div key={server.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(server.status)}
                      <h4 className="font-medium">{server.name}</h4>
                    </div>
                    <Badge variant={getStatusColor(server.status)}>
                      {server.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>{server.location}</span>
                      </span>
                      <span className="text-muted-foreground">{server.lastCheck}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <Cpu className="h-3 w-3" />
                          <span>CPU</span>
                        </span>
                        <span>{server.cpu}%</span>
                      </div>
                      <Progress value={server.cpu} className="h-1" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <Database className="h-3 w-3" />
                          <span>Memory</span>
                        </span>
                        <span>{server.memory}%</span>
                      </div>
                      <Progress value={server.memory} className="h-1" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <HardDrive className="h-3 w-3" />
                          <span>Disk</span>
                        </span>
                        <span>{server.disk}%</span>
                      </div>
                      <Progress value={server.disk} className="h-1" />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uptime: {server.uptime}</span>
                      <Button size="sm" variant="outline">
                        <Zap className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Trends
            </CardTitle>
            <CardDescription>
              System performance over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2" />
                <p>Performance charts will be implemented</p>
                <p className="text-sm">Real-time monitoring graphs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Activity
            </CardTitle>
            <CardDescription>
              Active users and system load correlation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2" />
                <p>User activity charts will be implemented</p>
                <p className="text-sm">Real-time user monitoring</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
