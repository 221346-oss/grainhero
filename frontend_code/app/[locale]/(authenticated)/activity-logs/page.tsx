"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Clock,
    Package,
    AlertTriangle,
    Users,
    Truck,
    DollarSign,
    Shield,
    FileText,
    BarChart3,
    Settings,
    Eye,
    Info,
    AlertCircle,
    XCircle,
    X,
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { config } from "@/config"

interface ActivityLog {
    _id: string
    admin_id: string
    user_id: string
    user_name: string
    user_role: string
    action: string
    category: string
    entity_type: string
    entity_id: string
    entity_ref: string
    description: string
    metadata: Record<string, unknown>
    severity: string
    ip_address: string
    created_at: string
}

interface Pagination {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    batch: { label: "Batch", icon: <Package className="h-4 w-4" />, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
    spoilage: { label: "Spoilage", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600", bgColor: "bg-red-50 border-red-200" },
    buyer: { label: "Buyer", icon: <Users className="h-4 w-4" />, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200" },
    dispatch: { label: "Dispatch", icon: <Truck className="h-4 w-4" />, color: "text-green-600", bgColor: "bg-green-50 border-green-200" },
    payment: { label: "Payment", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200" },
    insurance: { label: "Insurance", icon: <Shield className="h-4 w-4" />, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" },
    invoice: { label: "Invoice", icon: <FileText className="h-4 w-4" />, color: "text-indigo-600", bgColor: "bg-indigo-50 border-indigo-200" },
    report: { label: "Report", icon: <BarChart3 className="h-4 w-4" />, color: "text-cyan-600", bgColor: "bg-cyan-50 border-cyan-200" },
    system: { label: "System", icon: <Settings className="h-4 w-4" />, color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    info: { label: "Info", color: "bg-blue-100 text-blue-700 border-blue-300", icon: <Info className="h-3 w-3" /> },
    warning: { label: "Warning", color: "bg-amber-100 text-amber-700 border-amber-300", icon: <AlertCircle className="h-3 w-3" /> },
    critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-300", icon: <XCircle className="h-3 w-3" /> },
}

export default function ActivityLogsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState<Pagination>({
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 20,
    })
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

    // Filters
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [severityFilter, setSeverityFilter] = useState("all")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [entityFilter, setEntityFilter] = useState("")

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true)
        try {
            let url = `/api/activity-logs?page=${page}&limit=20`
            if (search) url += `&search=${encodeURIComponent(search)}`
            if (categoryFilter !== "all") url += `&category=${categoryFilter}`
            if (severityFilter !== "all") url += `&severity=${severityFilter}`
            if (dateFrom) url += `&from=${dateFrom}`
            if (dateTo) url += `&to=${dateTo}`
            if (entityFilter) url += `&entity_ref=${encodeURIComponent(entityFilter)}`

            const res = await api.get<{
                logs: ActivityLog[]
                pagination: Pagination
                summary: { categories: Record<string, number> }
            }>(url)

            if (res.ok && res.data) {
                setLogs(res.data.logs)
                setPagination(res.data.pagination)
                setCategoryCounts(res.data.summary?.categories || {})
            }
        } catch {
            toast.error("Failed to fetch activity logs")
        } finally {
            setLoading(false)
        }
    }, [search, categoryFilter, severityFilter, dateFrom, dateTo, entityFilter])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchLogs(1)
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const getRelativeTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = (now.getTime() - d.getTime()) / 1000

        if (diff < 60) return "just now"
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
        return formatDate(dateStr)
    }

    const totalLogs = Object.values(categoryCounts).reduce((sum, c) => sum + c, 0)

    const handleDownloadReport = async (batchId: string) => {
        try {
            const token = localStorage.getItem("token")
            const res = await fetch(`${config.backendUrl}/api/logging/batches/${batchId}/report`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error("Failed to download")
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `batch-report-${batchId}.pdf`
            a.click()
            URL.revokeObjectURL(url)
            toast.success("Report downloaded!")
        } catch {
            toast.error("Failed to download report")
        }
    }

    const handleExportCSV = async () => {
        try {
            const token = localStorage.getItem("token")
            let url = `${config.backendUrl}/api/activity-logs/export?format=csv`
            if (categoryFilter !== "all") url += `&category=${categoryFilter}`
            if (severityFilter !== "all") url += `&severity=${severityFilter}`
            if (dateFrom) url += `&from=${dateFrom}`
            if (dateTo) url += `&to=${dateTo}`
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            if (!res.ok) throw new Error("Export failed")
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = blobUrl
            a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(blobUrl)
            toast.success("CSV exported!")
        } catch {
            toast.error("Failed to export CSV")
        }
    }

    const handleEntityClick = (entityRef: string) => {
        setSearch(entityRef)
        fetchLogs(1)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Activity Logs
                    </h1>
                    <p className="text-gray-500 mt-1">Complete audit trail of all system activities</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => fetchLogs(pagination.current_page)}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${categoryFilter === "all" ? "ring-2 ring-blue-400 shadow-md" : ""}`}
                    onClick={() => setCategoryFilter("all")}
                >
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            <span className="text-2xl font-bold text-gray-900">{totalLogs}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">All Events</p>
                    </CardContent>
                </Card>

                {Object.entries(CATEGORY_CONFIG).slice(0, 4).map(([key, cfg]) => (
                    <Card
                        key={key}
                        className={`cursor-pointer transition-all hover:shadow-md ${categoryFilter === key ? `ring-2 ring-blue-400 shadow-md` : ""}`}
                        onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
                    >
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className={cfg.color}>{cfg.icon}</span>
                                <span className="text-2xl font-bold text-gray-900">{categoryCounts[key] || 0}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">{cfg.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search logs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="w-40">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); fetchLogs(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-36">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Severity</label>
                            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); fetchLogs(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Severity</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-40">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>

                        <div className="w-40">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>

                        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white gap-2">
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Logs Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Log List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Event Timeline</CardTitle>
                                <CardDescription>
                                    Showing {logs.length} of {pagination.total_items} events
                                    {entityFilter && <span className="ml-2 font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Filtering by: {entityFilter} <X className="inline h-3 w-3 cursor-pointer ml-1" onClick={() => setEntityFilter('')} /></span>}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FileText className="h-12 w-12 mb-3" />
                                    <p className="text-lg font-medium">No activity logs found</p>
                                    <p className="text-sm mt-1">Logs will appear as actions are performed</p>
                                </div>
                            ) : (
                                <div className="relative pl-8 pr-4 py-4 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-gray-300 before:to-gray-100 space-y-6">
                                    {logs.map((log) => {
                                        const catCfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.system
                                        const sevCfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info
                                        const isSelected = selectedLog?._id === log._id

                                        // Severity Node Colors
                                        let nodeColor = 'bg-blue-400 border-blue-100'
                                        if (log.severity === 'critical') nodeColor = 'bg-red-500 border-red-100'
                                        else if (log.severity === 'warning') nodeColor = 'bg-amber-400 border-amber-100'

                                        return (
                                            <div
                                                key={log._id}
                                                className={`relative flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? "bg-gray-50 ring-1 ring-gray-200 shadow-sm" : "hover:bg-gray-50/50"}`}
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                {/* Timeline Node */}
                                                <div className={`absolute -left-5 top-4 w-3 h-3 rounded-full border-2 ${nodeColor} z-10 shadow-sm`} />

                                                {/* Category Icon */}
                                                <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded border ${catCfg.bgColor}`}>
                                                    <span className={catCfg.color}>{catCfg.icon}</span>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-medium text-gray-900 leading-snug">{log.description}</p>
                                                        <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {getRelativeTime(log.created_at)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevCfg.color}`}>
                                                            {sevCfg.icon}
                                                            <span className="ml-0.5">{sevCfg.label}</span>
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
                                                            {catCfg.label}
                                                        </Badge>
                                                        {log.entity_ref && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); handleEntityClick(log.entity_ref) }}>
                                                                {log.entity_ref}
                                                            </Badge>
                                                        )}
                                                        <span className="text-[10px] text-gray-400">
                                                            by {log.user_name || "System"} ({log.user_role})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination.total_pages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
                                    <p className="text-sm text-gray-500">
                                        Page {pagination.current_page} of {pagination.total_pages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page === 1}
                                            onClick={() => fetchLogs(pagination.current_page - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page === pagination.total_pages}
                                            onClick={() => fetchLogs(pagination.current_page + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Eye className="h-5 w-5 text-gray-400" />
                                Event Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedLog ? (
                                <div className="space-y-4">
                                    {/* Action */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Action</h4>
                                        <p className="text-sm font-medium text-gray-900">{selectedLog.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                                        <p className="text-sm text-gray-700">{selectedLog.description}</p>
                                    </div>

                                    {/* Category & Severity */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</h4>
                                            <Badge variant="outline" className={`${CATEGORY_CONFIG[selectedLog.category]?.bgColor || ""}`}>
                                                {CATEGORY_CONFIG[selectedLog.category]?.label || selectedLog.category}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Severity</h4>
                                            <Badge variant="outline" className={`${SEVERITY_CONFIG[selectedLog.severity]?.color || ""}`}>
                                                {SEVERITY_CONFIG[selectedLog.severity]?.label || selectedLog.severity}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Entity */}
                                    {selectedLog.entity_ref && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Entity</h4>
                                            <p className="text-sm text-gray-700">
                                                <span className="text-gray-500">{selectedLog.entity_type}:</span>{" "}
                                                <span className="font-mono font-medium">{selectedLog.entity_ref}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* User */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Performed By</h4>
                                        <p className="text-sm text-gray-700">
                                            {selectedLog.user_name || "System"}{" "}
                                            <span className="text-gray-400">({selectedLog.user_role})</span>
                                        </p>
                                    </div>

                                    {/* Timestamp */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Timestamp</h4>
                                        <p className="text-sm text-gray-700">{formatDate(selectedLog.created_at)}</p>
                                    </div>

                                    {/* Metadata */}
                                    {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Details</h4>
                                            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                                {Object.entries(selectedLog.metadata).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between text-xs">
                                                        <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
                                                        <span className="text-gray-800 font-medium">{String(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Download Report (if batch) */}
                                    {selectedLog.entity_type === "GrainBatch" && selectedLog.entity_id && (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 mt-2"
                                            onClick={() => handleDownloadReport(selectedLog.entity_id)}
                                        >
                                            <Download className="h-4 w-4" />
                                            Download Batch Report
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Eye className="h-10 w-10 mb-3 opacity-30" />
                                    <p className="text-sm">Select an event to view details</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
