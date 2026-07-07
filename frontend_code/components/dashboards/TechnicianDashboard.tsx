"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Package, 
  AlertTriangle, 
  Activity,
  BarChart3,
  Smartphone,
  Wrench,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Thermometer,
  Droplets,
  Zap,
  QrCode,
  FileText,
  Settings,
  Loader2
} from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/app/[locale]/providers"
import { useRouter } from "next/navigation"

interface TechnicianStats {
  assignedBatches: number
  activeTasks: number
  completedToday: number
  qualityChecks: number
  sensorReadings: number
  alertsResolved: number
}

interface Batch {
  _id: string
  batch_id: string
  grain_type: string
  quantity_kg: number
  status: string
  risk_score: number
  intake_date: string
  created_at?: string
  quality_score?: number
  silo_id?: {
    _id: string
    name: string
  }
}

interface SensorReading {
  _id: string
  device_id: string
  sensor_type: string
  value: number
  unit: string
  status: string
  location: string
  timestamp: string
  battery?: number
  signal_strength?: number
}

type AlertSeverity = "high" | "medium" | "low"

interface Alert {
  _id: string
  type: AlertSeverity
  message: string
  severity: string
  status: string
  created_at: string
  location?: string
  batch_id?: string
}

export function TechnicianDashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TechnicianStats>({
    assignedBatches: 0,
    activeTasks: 0,
    completedToday: 0,
    qualityChecks: 0,
    sensorReadings: 0,
    alertsResolved: 0
  })
  const [assignedBatches, setAssignedBatches] = useState<Batch[]>([])
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([])
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch batches assigned to this technician's admin
        const batchesRes = await api.get<{ batches: Batch[] }>("/api/grain-batches?limit=50")

        if (batchesRes.ok && batchesRes.data) {
          const batches = batchesRes.data.batches || []
          setAssignedBatches(batches)

          // Calculate stats from batches
          const activeBatches = batches.filter(b =>
            b.status !== "dispatched" && b.status !== "completed"
          ).length

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const completedToday = batches.filter(b => {
            if (b.status !== "dispatched" && b.status !== "completed") return false
            const dateStr = b.intake_date || b.created_at
            if (!dateStr) return false
            const batchDate = new Date(dateStr)
            return batchDate >= today
          }).length

          setStats(prev => ({
            ...prev,
            assignedBatches: batches.length,
            activeTasks: activeBatches,
            completedToday,
            qualityChecks: batches.filter(b => b.quality_score !== undefined).length
          }))
        } else {
          setError(batchesRes.error || "Failed to load batches")
        }

        // Fetch sensor readings
        try {
          const sensorsRes = await api.get<{
            sensors: Array<{
              _id: string
              device_id?: string
              sensor_types?: string[]
              battery_level?: number
              signal_strength?: number
              status?: string
              last_reading?: string
              silo_id?: { name?: string }
            }>
          }>("/api/sensors?limit=20")
          if (sensorsRes.ok && sensorsRes.data) {
            const sensors = sensorsRes.data.sensors || []
            // Transform sensor data to reading format
            const readings: SensorReading[] = sensors.slice(0, 4).map((s) => ({
              _id: s._id,
              device_id: s.device_id || s._id,
              sensor_type: (s.sensor_types && s.sensor_types[0]) || "temperature",
              value: s.battery_level || 0,
              unit: s.sensor_types?.includes("temperature") ? "°C" :
                s.sensor_types?.includes("humidity") ? "%" :
                  s.sensor_types?.includes("co2") ? "ppm" : "",
              status: s.status === "active" ? "normal" : "warning",
              location: s.silo_id?.name || "Unknown",
              timestamp: s.last_reading || new Date().toISOString(),
              battery: s.battery_level,
              signal_strength: s.signal_strength
            }))
            setSensorReadings(readings)
            setStats(prev => ({
              ...prev,
              sensorReadings: sensors.length
            }))
          }
        } catch (err) {
          console.error("Error fetching sensors:", err)
        }

        // Fetch alerts
        try {
          const alertsRes = await api.get<{
            alerts: Array<{
              _id?: string
              id?: string
              message?: string
              description?: string
              severity?: string
              status?: string
              created_at?: string
              timestamp?: string
              location?: string
              silo_id?: { name?: string }
              batch_id?: string
              batch?: string
            }>
          }>("/api/alerts?limit=10&status=active")
          if (alertsRes.ok && alertsRes.data) {
            const alerts = alertsRes.data.alerts || []
            const mapped: Alert[] = alerts.slice(0, 5).map(a => {
              const sev = (a.severity || 'low').toLowerCase()
              const alertSeverity: AlertSeverity =
                sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low'

              return {
                _id: a._id || a.id || '',
                type: alertSeverity,
                message: a.message || a.description || 'Alert',
                severity: a.severity || 'low',
                status: a.status || 'pending',
                created_at: a.created_at || a.timestamp || new Date().toISOString(),
                location: a.location || a.silo_id?.name,
                batch_id: a.batch_id || a.batch
              }
            })
            setRecentAlerts(mapped)
            setStats(prev => ({
              ...prev,
              alertsResolved: alerts.filter(a => a.status === "resolved").length
            }))
          }
        } catch (err) {
          console.error("Error fetching alerts:", err)
        }
      } catch (err) {
        console.error('Error fetching technician data:', err)
        setError('Failed to load technician dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchTechnicianData()
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "dispatched":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
      case "stored":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "dispatched":
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
      case "stored":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (riskScore: number) => {
    if (riskScore >= 70) return "bg-red-100 text-red-800"
    if (riskScore >= 40) return "bg-orange-100 text-orange-800"
        return "bg-green-100 text-green-800"
    }

  const getPriorityLabel = (riskScore: number) => {
    if (riskScore >= 70) return "high"
    if (riskScore >= 40) return "medium"
    return "low"
  }

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case "normal":
      case "good":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSensorIcon = (sensor: string) => {
    switch (sensor.toLowerCase()) {
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "humidity":
        return <Droplets className="h-4 w-4" />
      case "co2":
        return <Activity className="h-4 w-4" />
      case "moisture":
        return <Droplets className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "N/A"
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Technician Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedBatches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTasks} active tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Batches processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Checks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualityChecks}</div>
            <p className="text-xs text-muted-foreground">
              Total batches checked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Resolved</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alertsResolved}</div>
            <p className="text-xs text-muted-foreground">
              Resolved today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {recentAlerts.filter(alert => alert.status !== "resolved").length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({recentAlerts.filter(alert => alert.status !== "resolved").length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAlerts.filter(alert => alert.status !== "resolved").map((alert) => (
                <div key={alert._id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${alert.severity === "high" ? "border-red-200" :
                  alert.severity === "medium" ? "border-orange-200" :
                  "border-yellow-200"
                }`}>
                  <div>
                    <p className={`font-medium ${alert.severity === "high" ? "text-red-900" :
                      alert.severity === "medium" ? "text-orange-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.location || "System"} • {formatDate(alert.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getSensorStatusColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Button size="sm" variant="outline">Acknowledge</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assigned Batches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              My Batches
            </CardTitle>
            <CardDescription>
              Batches assigned to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedBatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No batches assigned</p>
            ) : (
            <div className="space-y-4">
                {assignedBatches.slice(0, 5).map((batch) => (
                  <div key={batch._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {getStatusIcon(batch.status)}
                        <h4 className="font-medium">{batch.grain_type}</h4>
                        <Badge className={getPriorityColor(batch.risk_score)}>
                          {getPriorityLabel(batch.risk_score)}
                      </Badge>
                        <Badge className={getStatusColor(batch.status)}>
                          {batch.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {batch.batch_id} • {batch.quantity_kg.toLocaleString()} kg
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{batch.silo_id?.name || "Unassigned"}</span>
                        <span>Quality: {batch.quality_score || "N/A"}%</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/grain-batches/${batch._id}`)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Sensor Readings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Sensor Readings
            </CardTitle>
            <CardDescription>
              Real-time sensor data from assigned silos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sensorReadings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sensor readings available</p>
            ) : (
            <div className="space-y-4">
              {sensorReadings.map((reading) => (
                  <div key={reading._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        {getSensorIcon(reading.sensor_type)}
                        <h4 className="font-medium capitalize">{reading.sensor_type}</h4>
                      <Badge className={getSensorStatusColor(reading.status)}>
                        {reading.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <span className="text-lg font-bold">{reading.value}{reading.unit}</span>
                      <span>{reading.location}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Last update: {formatDate(reading.timestamp)}
                        {reading.battery && ` • Battery: ${reading.battery}%`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts History */}
      {recentAlerts.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Recent Alerts
          </CardTitle>
          <CardDescription>
            Alert history and resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
                <div key={alert._id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.status === "resolved" ? "bg-green-50 border-green-200" :
                alert.status === "acknowledged" ? "bg-blue-50 border-blue-200" :
                "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center space-x-3">
                  {alert.status === "resolved" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : alert.status === "acknowledged" ? (
                    <Clock className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <div>
                      <p className={`font-medium ${alert.status === "resolved" ? "text-green-900" :
                      alert.status === "acknowledged" ? "text-blue-900" :
                      "text-yellow-900"
                    }`}>
                      {alert.message}
                    </p>
                      <p className={`text-sm ${alert.status === "resolved" ? "text-green-600" :
                      alert.status === "acknowledged" ? "text-blue-600" :
                      "text-yellow-600"
                    }`}>
                        {alert.location || "System"} • {formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    alert.severity === "high" ? "destructive" :
                    alert.severity === "medium" ? "secondary" :
                    "default"
                  }>
                    {alert.severity}
                  </Badge>
                  <Badge className={
                    alert.status === "resolved" ? "bg-green-100 text-green-800" :
                    alert.status === "acknowledged" ? "bg-blue-100 text-blue-800" :
                    "bg-yellow-100 text-yellow-800"
                  }>
                    {alert.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common technician tasks and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => router.push("/grain-batches")}
            >
              <Package className="h-6 w-6" />
              <span>View Batches</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/sensors")}
            >
              <Smartphone className="h-6 w-6" />
              <span>Sensor Reading</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/maintenance")}
            >
              <Wrench className="h-6 w-6" />
              <span>Maintenance</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/grain-batches")}
            >
              <QrCode className="h-6 w-6" />
              <span>Scan Batch</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/alerts")}
            >
              <FileText className="h-6 w-6" />
              <span>View Alerts</span>
            </Button>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              variant="outline"
              onClick={() => router.push("/reports")}
            >
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
