"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Search, AlertTriangle, CheckCircle, Clock, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, Eye, Bell, Shield, Zap,
  Activity, TrendingUp, ArrowUpRight, History
} from 'lucide-react'
import { api } from '@/lib/api'


interface GrainAlert {
  _id: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'acknowledged' | 'resolved' | 'escalated'
  source: string
  category: string
  triggered_at: string
  acknowledged_at?: string
  resolved_at?: string
  acknowledged_by?: string
  resolved_by?: string
  resolution_type?: string
  resolution_notes?: string
  silo_id?: { name: string; silo_id: string }
  batch_id?: string | { _id: string; batch_id?: string; grain_type?: string }
  trigger_conditions?: { threshold_type: string; threshold_value: number; actual_value: number }
  tags?: string[]
  escalation_level?: number
  escalation_history?: Array<{
    level: number;
    escalated_to: string;
    escalated_by: string;
    escalated_at: string;
    reason: string;
  }>
}

interface AlertStats {
  total: number; pending: number; acknowledged: number; critical: number;
  high: number; medium: number; low: number;
  resolved_today: number; active: number;
  resolution_rate: number; avg_response_mins: number;
}

interface Pagination { current_page: number; total_pages: number; total_items: number; items_per_page: number }

const PRIORITY_CFG: Record<string, { color: string; bg: string; icon: typeof AlertTriangle, hex: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300', icon: AlertTriangle, hex: '#dc2626' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', icon: AlertCircle, hex: '#ea580c' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300', icon: Bell, hex: '#eab308' },
  low: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', icon: Activity, hex: '#3b82f6' },
}

const STATUS_CFG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  acknowledged: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  escalated: { color: 'bg-orange-100 text-orange-800', icon: ArrowUpRight },
  resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

const SOURCE_COLORS: Record<string, string> = {
  sensor: 'bg-blue-100 text-blue-800', ai: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800', manual: 'bg-emerald-100 text-emerald-800',
  insurance: 'bg-amber-100 text-amber-800', subscription: 'bg-pink-100 text-pink-800',
  payment: 'bg-emerald-100 text-emerald-800', user: 'bg-indigo-100 text-indigo-800',
  batch: 'bg-cyan-100 text-cyan-800'
}

export default function GrainAlertsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [alerts, setAlerts] = useState<GrainAlert[]>([])
  const [stats, setStats] = useState<AlertStats>({
    total: 0, pending: 0, acknowledged: 0, critical: 0,
    high: 0, medium: 0, low: 0, resolved_today: 0, active: 0,
    resolution_rate: 0, avg_response_mins: 0
  })
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, total_pages: 1, total_items: 0, items_per_page: 20 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [selectedAlert, setSelectedAlert] = useState<GrainAlert | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateData, setEscalateData] = useState({ escalated_to_id: '', reason: '' })

  const [preferences, setPreferences] = useState({
    critical_system: true,
    sensor_deviations: true,
    insurance_payments: true,
    batch_activity: false
  })

  // Available users for escalation (mocked for now, in real scenario fetch from API)
  const [escalatableUsers, setEscalatableUsers] = useState<{ _id: string, name: string, role: string }[]>([])

  const computeStats = (items: GrainAlert[]): AlertStats => {
    const total = items.length
    const pending = items.filter(a => a.status === 'pending').length
    const acknowledged = items.filter(a => a.status === 'acknowledged').length
    const resolved = items.filter(a => a.status === 'resolved').length
    const critical = items.filter(a => a.priority === 'critical' && a.status !== 'resolved').length
    const high = items.filter(a => a.priority === 'high' && a.status !== 'resolved').length
    const medium = items.filter(a => a.priority === 'medium' && a.status !== 'resolved').length
    const low = items.filter(a => a.priority === 'low' && a.status !== 'resolved').length

    const resolvedToday = items.filter(a => {
      if (!a.resolved_at) return false
      const d = new Date(a.resolved_at)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }).length

    const active = items.filter(a => a.status === 'pending' || a.status === 'acknowledged' || a.status === 'escalated').length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    // avg response mins based on acknowledged_at - triggered_at
    const responseTimes = items
      .filter(a => a.acknowledged_at)
      .map(a => (new Date(a.acknowledged_at!).getTime() - new Date(a.triggered_at).getTime()) / (1000 * 60))
      .filter(v => Number.isFinite(v) && v >= 0)
    const avgResponse = responseTimes.length ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length) : 0

    return {
      total,
      pending,
      acknowledged,
      critical,
      high,
      medium,
      low,
      resolved_today: resolvedToday,
      active,
      resolution_rate: resolutionRate,
      avg_response_mins: avgResponse
    }
  }

  const normalizeAlert = (raw: unknown): GrainAlert => {
    const r = (raw ?? {}) as Record<string, unknown>
    // Backend uses GrainAlert model; keep a tolerant mapping to avoid UI crashes
    return {
      _id: String(r._id || ""),
      title: String(r.title || ""),
      message: String(r.message || ""),
      priority: (r.priority as GrainAlert["priority"]) || "medium",
      status: (r.status as GrainAlert["status"]) || "pending",
      source: String(r.source || "system"),
      category: String(r.category || r.alert_type || "system"),
      triggered_at: String(r.triggered_at || new Date().toISOString()),
      acknowledged_at: r.acknowledged_at ? String(r.acknowledged_at) : undefined,
      resolved_at: r.resolved_at ? String(r.resolved_at) : undefined,
      acknowledged_by: r.acknowledged_by ? String(r.acknowledged_by) : undefined,
      resolved_by: r.resolved_by ? String(r.resolved_by) : undefined,
      resolution_type:
        typeof r.resolution === "object" && r.resolution && "resolution_type" in (r.resolution as Record<string, unknown>)
          ? String((r.resolution as Record<string, unknown>).resolution_type || "")
          : (r.resolution_type ? String(r.resolution_type) : undefined),
      resolution_notes:
        typeof r.resolution === "object" && r.resolution && "resolution_notes" in (r.resolution as Record<string, unknown>)
          ? String((r.resolution as Record<string, unknown>).resolution_notes || "")
          : (r.resolution_notes ? String(r.resolution_notes) : undefined),
      silo_id: r.silo_id as GrainAlert["silo_id"],
      batch_id: r.batch_id as GrainAlert["batch_id"],
      trigger_conditions: r.trigger_conditions as GrainAlert["trigger_conditions"],
      tags: r.tags as GrainAlert["tags"],
      escalation_level: r.escalation_level as GrainAlert["escalation_level"],
      escalation_history: r.escalation_history as GrainAlert["escalation_history"]
    }
  }

  const fetchAlerts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      // Backend exposes Grain alerts at `/api/alerts` (not `/alerts/grain`).
      const res = await api.get<any[]>(`/api/alerts`)
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to fetch alerts')

      const allAlerts = (res.data || []).map(normalizeAlert)

      const filtered = allAlerts.filter(a => {
        const matchesSearch =
          !searchTerm ||
          a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.message?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter
        return matchesSearch && matchesPriority && matchesStatus
      })

      const pageSize = 20
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
      const currentPage = Math.min(Math.max(1, page), totalPages)
      const start = (currentPage - 1) * pageSize
      const paged = filtered.slice(start, start + pageSize)

      setAlerts(paged)
      setStats(computeStats(filtered))
      setPagination({ current_page: currentPage, total_pages: totalPages, total_items: filtered.length, items_per_page: pageSize })

      // Load users for escalation (simplified)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersRes = await api.get<{ users: Array<{ _id: string; name: string; role: string }> }>('/api/user-management/users')
      if (usersRes.ok && usersRes.data) {
        setEscalatableUsers(usersRes.data.users.filter(u => ['admin', 'superadmin', 'manager'].includes(u.role)))
      }
    } catch {
      toast.error('Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, priorityFilter, statusFilter])

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<{ user: { preferences?: { alert_preferences?: typeof preferences } } }>('/auth/me').then(res => {
      if (res.ok && res.data?.user?.preferences?.alert_preferences) {
        setPreferences(res.data.user.preferences.alert_preferences);
      }
    });
  }, [fetchAlerts])

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await api.patch(`/api/alerts/${alertId}/acknowledge`, {})
      if (res.ok) {
        toast.success('Alert acknowledged')
        fetchAlerts(pagination.current_page)
      } else { toast.error('Failed to acknowledge') }
    } catch { toast.error('Failed to acknowledge') }
  }

  const handleResolve = async (alertId: string, notes = '') => {
    try {
      const res = await api.patch(`/api/alerts/${alertId}/resolve`, { resolution_type: 'manual', notes })
      if (res.ok) {
        toast.success('Alert resolved')
        setShowDetail(false)
        fetchAlerts(pagination.current_page)
      } else { toast.error('Failed to resolve') }
    } catch { toast.error('Failed to resolve') }
  }

  const handleEscalate = async () => {
    if (!selectedAlert || !escalateData.escalated_to_id) return toast.error('Please select a user');
    try {
      const res = await api.patch(`/api/alerts/${selectedAlert._id}/escalate`, escalateData)
      if (res.ok) {
        toast.success('Alert escalated successfully')
        setShowEscalate(false)
        setShowDetail(false)
        fetchAlerts(pagination.current_page)
      } else { toast.error('Failed to escalate') }
    } catch { toast.error('Failed to escalate') }
  }

  const savePreferences = async () => {
    try {
      const res = await api.patch('/api/user-management/me/alert-preferences', preferences)
      if (res.ok) toast.success('Alert preferences saved successfully!')
      else toast.error('Failed to save preferences')
    } catch { toast.error('Failed to save preferences') }
  }

  const getRelativeTime = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }



  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center"><AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" /><p className="text-gray-500">Loading alerts...</p></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />Alert Management Center
          </h1>
          <p className="text-gray-500 mt-1">Real-time monitoring, escalation, and resolution tracking</p>
        </div>
        <Button variant="outline" onClick={() => fetchAlerts(pagination.current_page)} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4 bg-white border shadow-sm">
          <TabsTrigger value="dashboard">Dashboard & Feed</TabsTrigger>
          <TabsTrigger value="preferences">Alert Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Top Metrics Dashboard */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="flex flex-col justify-center border-l-4 border-l-blue-500">
              <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-medium">Total Alerts</CardTitle><Activity className="h-4 w-4 text-blue-500" /></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-center border-l-4 border-l-red-500 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}>
              <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-medium">Pending</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">Need attention</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-center border-l-4 border-l-yellow-500 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'acknowledged' ? 'all' : 'acknowledged')}>
              <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-medium">Acknowledged</CardTitle><Clock className="h-4 w-4 text-yellow-500" /></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.acknowledged}</div>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-center border-l-4 border-l-orange-500 cursor-pointer" onClick={() => setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical')}>
              <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-medium">Critical Active</CardTitle><Zap className="h-4 w-4 text-orange-500" /></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.critical}</div>
                <p className="text-xs text-muted-foreground mt-1">High priority</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-center border-l-4 border-l-green-500">
              <CardHeader className="pb-2 flex flex-row justify-between items-center"><CardTitle className="text-sm font-medium">Resolved Today</CardTitle><TrendingUp className="h-4 w-4 text-green-500" /></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.resolved_today}</div>
                <p className="text-xs text-muted-foreground mt-1">Issues fixed</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search alerts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-emerald-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAlerts(1) }} />
              </div>
              <div className="flex w-full md:w-auto gap-3 items-center">
                <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); fetchAlerts(1) }}>
                  <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); fetchAlerts(1) }}>
                  <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => fetchAlerts(1)} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hidden md:flex">Apply</Button>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Real-Time Feed */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-white border-b sticky top-0 z-10">
              <CardTitle>Alert Feed</CardTitle>
              <CardDescription>Real-time feed of all system anomalies and notifications</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Time Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const pCfg = PRIORITY_CFG[alert.priority] || PRIORITY_CFG.medium
                    const sCfg = STATUS_CFG[alert.status] || STATUS_CFG.pending
                    const SIcon = sCfg.icon
                    const isBlinking = alert.priority === 'critical' && alert.status === 'pending';

                    return (
                      <TableRow key={alert._id} className={alert.status !== 'resolved' ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 opacity-80'}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 p-2 rounded-full ${pCfg.bg} ${isBlinking ? 'animate-pulse ring-2 ring-red-400' : ''}`}>
                              <pCfg.icon className={`h-4 w-4 ${pCfg.color}`} />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{alert.title}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[300px] mt-0.5">{alert.message}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge className={pCfg.bg}>{alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}</Badge></TableCell>
                        <TableCell><Badge className={sCfg.color}><SIcon className="h-3 w-3 mr-1" />{alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}</Badge></TableCell>
                        <TableCell><Badge className={SOURCE_COLORS[alert.source] || 'bg-gray-100 text-gray-800'}>{alert.source}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{getRelativeTime(alert.triggered_at)}</span>
                            <span className="text-[10px] text-gray-400">{new Date(alert.triggered_at).toLocaleTimeString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {alert.status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert._id)} className="text-yellow-700 border-yellow-300 hover:bg-yellow-50 shadow-sm">Ack</Button>
                            )}
                            {alert.status !== 'resolved' && (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedAlert(alert); setShowEscalate(true); }} className="text-orange-700 border-orange-300 hover:bg-orange-50 shadow-sm"><ArrowUpRight className="h-3 w-3 mr-1" /> Escalate</Button>
                            )}
                            {alert.status !== 'resolved' && (
                              <Button variant="outline" size="sm" onClick={() => handleResolve(alert._id)} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-sm">Resolve</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedAlert(alert); setShowDetail(true) }}><Eye className="h-4 w-4 text-gray-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {alerts.length === 0 && (
              <div className="text-center py-16"><CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" /><p className="text-gray-500 text-lg font-medium">All clear! No alerts.</p></div>
            )}
            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-gray-50/50 mt-4">
                <p className="text-sm text-gray-500">Page {pagination.current_page} of {pagination.total_pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.current_page === 1} onClick={() => fetchAlerts(pagination.current_page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={pagination.current_page === pagination.total_pages} onClick={() => fetchAlerts(pagination.current_page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Notification Preferences</CardTitle>
              <CardDescription>Configure which alerts generate emails and push notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Critical System Alerts</Label>
                    <p className="text-sm text-gray-500">Hardware failures, extremely high risks, subscription expiration.</p>
                  </div>
                  <Switch checked={preferences.critical_system} onCheckedChange={(v) => setPreferences({ ...preferences, critical_system: v })} />
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Sensor Deviations</Label>
                    <p className="text-sm text-gray-500">Receive emails when sensors detect abnormal temperatures or moisture.</p>
                  </div>
                  <Switch checked={preferences.sensor_deviations} onCheckedChange={(v) => setPreferences({ ...preferences, sensor_deviations: v })} />
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Insurance & Payments</Label>
                    <p className="text-sm text-gray-500">Claims approved, overdue payments, policy renewals.</p>
                  </div>
                  <Switch checked={preferences.insurance_payments} onCheckedChange={(v) => setPreferences({ ...preferences, insurance_payments: v })} />
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Batch Activity</Label>
                    <p className="text-sm text-gray-500">Large dispatches, spoilage logged, batches deleted.</p>
                  </div>
                  <Switch checked={preferences.batch_activity} onCheckedChange={(v) => setPreferences({ ...preferences, batch_activity: v })} />
                </div>
              </div>
              <Button onClick={savePreferences} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced Detail Dialog */}
      <Dialog open={showDetail && !showEscalate} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="flex items-center gap-2 text-xl"><AlertCircle className="h-6 w-6 text-gray-400" /> Alert Investigation</DialogTitle>
              {selectedAlert && <Badge className={PRIORITY_CFG[selectedAlert.priority]?.bg}>{selectedAlert.priority.toUpperCase()}</Badge>}
            </div>
            <DialogDescription>Full lifecycle and action history for this alert.</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-6 mt-2">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-1">{selectedAlert.title}</h3>
                <p className="text-sm text-gray-600">{selectedAlert.message}</p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-white">{selectedAlert.source}</Badge>
                  {selectedAlert.silo_id && <Badge variant="outline" className="bg-white">Silo: {selectedAlert.silo_id.name}</Badge>}
                  {selectedAlert.batch_id && <Badge variant="outline" className="bg-white">Batch Ref</Badge>}
                </div>
              </div>

              {/* Action History Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3"><History className="h-4 w-4" /> Action History</h4>
                <div className="space-y-4 pl-2 border-l-2 border-gray-200 ml-2">
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-red-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                    <p className="text-sm font-medium">Triggered</p>
                    <p className="text-xs text-gray-500">{new Date(selectedAlert.triggered_at).toLocaleString()}</p>
                  </div>

                  {selectedAlert.acknowledged_at && (
                    <div className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-yellow-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                      <p className="text-sm font-medium">Acknowledged</p>
                      <p className="text-xs text-gray-500">{new Date(selectedAlert.acknowledged_at).toLocaleString()}</p>
                    </div>
                  )}

                  {selectedAlert.escalation_history && selectedAlert.escalation_history.map((esc, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-orange-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                      <p className="text-sm font-medium">Escalated (Level {esc.level})</p>
                      <p className="text-xs text-gray-500">{new Date(esc.escalated_at).toLocaleString()}</p>
                      <div className="mt-1 bg-orange-50 text-orange-800 text-xs p-2 rounded border border-orange-100">
                        Reason: {esc.reason}
                      </div>
                    </div>
                  ))}

                  {selectedAlert.resolved_at && (
                    <div className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-green-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                      <p className="text-sm font-medium">Resolved ({selectedAlert.resolution_type})</p>
                      <p className="text-xs text-gray-500">{new Date(selectedAlert.resolved_at).toLocaleString()}</p>
                      {selectedAlert.resolution_notes && (
                        <p className="text-xs mt-1 text-gray-600 bg-gray-50 p-2 rounded border">Note: {selectedAlert.resolution_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={showEscalate} onOpenChange={setShowEscalate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600"><ArrowUpRight className="h-5 w-5" /> Escalate Alert</DialogTitle>
            <DialogDescription>Assign this alert to higher-level management.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Escalate To</Label>
              <Select value={escalateData.escalated_to_id} onValueChange={(val) => setEscalateData({ ...escalateData, escalated_to_id: val })}>
                <SelectTrigger><SelectValue placeholder="Select admin or manager" /></SelectTrigger>
                <SelectContent>
                  {escalatableUsers.map(u => (
                    <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Escalation</Label>
              <Textarea placeholder="Explain why this requires escalation..." value={escalateData.reason} onChange={(e) => setEscalateData({ ...escalateData, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscalate(false)}>Cancel</Button>
            <Button onClick={handleEscalate} className="bg-orange-600 hover:bg-orange-700 text-white">Confirm Escalation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
