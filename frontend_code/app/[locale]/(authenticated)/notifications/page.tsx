"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  Package,
  Truck,
  DollarSign,
  Shield,
  FileText,
  Settings,
  Check,
  RefreshCw,
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/app/[locale]/providers"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  category: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  read: boolean
  read_at?: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  info: { icon: <Info className="h-5 w-5" />, color: "text-blue-500", bgColor: "bg-blue-50" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-500", bgColor: "bg-amber-50" },
  critical: { icon: <XCircle className="h-5 w-5" />, color: "text-red-500", bgColor: "bg-red-50" },
  success: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-green-500", bgColor: "bg-green-50" },
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  batch: <Package className="h-3.5 w-3.5" />,
  spoilage: <AlertTriangle className="h-3.5 w-3.5" />,
  dispatch: <Truck className="h-3.5 w-3.5" />,
  payment: <DollarSign className="h-3.5 w-3.5" />,
  insurance: <Shield className="h-3.5 w-3.5" />,
  invoice: <FileText className="h-3.5 w-3.5" />,
  system: <Settings className="h-3.5 w-3.5" />,
}

export default function NotificationsPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const router = useRouter()
  const { currentLanguage } = useLanguage()

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      let url = "/api/notifications?limit=50"
      if (filter === "unread") url += "&read=false"
      if (filter === "read") url += "&read=true"

      const res = await api.get<{
        notifications: Notification[]
        unread_count: number
        pagination: { total_items: number }
      }>(url)

      if (res.ok && res.data) {
        setNotifications(res.data.notifications)
        setUnreadCount(res.data.unread_count)
      }
    } catch {
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error("Failed to mark as read")
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch("/api/notifications/mark-all-read")
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id)
    }
    if (notification.action_url) {
      router.push(`/${currentLanguage}${notification.action_url}`)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000

    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {f === "all" ? <Bell className="h-4 w-4 mr-1.5" /> : f === "unread" ? <BellOff className="h-4 w-4 mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "unread" && unreadCount > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5">{unreadCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm mt-1">
                {filter === "unread" ? "All notifications have been read" : "You have no notifications yet"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[75vh]">
              <div className="divide-y">
                {notifications.map((n) => {
                  const typeCfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                  const catIcon = CATEGORY_ICONS[n.category] || CATEGORY_ICONS.system

                  return (
                    <div
                      key={n._id}
                      className={`flex items-start gap-4 p-4 cursor-pointer transition-all hover:bg-gray-50
                        ${!n.read ? "bg-blue-50/30 border-l-4 border-l-blue-400" : "border-l-4 border-l-transparent"}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex items-center justify-center w-10 h-10 rounded-full ${typeCfg.bgColor}`}>
                        <span className={typeCfg.color}>{typeCfg.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${!n.read ? "text-gray-900" : "text-gray-600"}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!n.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            {catIcon}
                            {n.category}
                          </Badge>
                          {n.action_url && (
                            <span className="text-[10px] text-blue-500 hover:underline">View →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
