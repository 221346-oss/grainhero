import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, BellOff, CheckCircle2, AlertTriangle, Info, XCircle, Clock,
  Package, Truck, DollarSign, Shield, FileText, Settings, Check, RefreshCw, Trash2,
} from "lucide-react";
import {
  listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
} from "@/lib/notifications-audit.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "read";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  info: { icon: <Info className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50" },
  critical: { icon: <XCircle className="h-5 w-5" />, color: "text-red-600", bg: "bg-red-50" },
  success: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  batch: <Package className="h-3.5 w-3.5" />,
  spoilage: <AlertTriangle className="h-3.5 w-3.5" />,
  dispatch: <Truck className="h-3.5 w-3.5" />,
  payment: <DollarSign className="h-3.5 w-3.5" />,
  insurance: <Shield className="h-3.5 w-3.5" />,
  invoice: <FileText className="h-3.5 w-3.5" />,
  system: <Settings className="h-3.5 w-3.5" />,
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const qc = useQueryClient();
  useRealtimeInvalidate("notifications", [["notifications"]]);
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const del = useServerFn(deleteNotification);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => list({ data: { filter, limit: 50 } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const readMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: invalidate,
  });
  const allMut = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => { invalidate(); toast.success("All marked as read"); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Notification removed"); },
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All caught up!"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {unread > 0 && (
            <Button size="sm" onClick={() => allMut.mutate()} disabled={allMut.isPending}>
              <Check className="h-4 w-4 mr-2" /> Mark all read
            </Button>
          )}
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(["all", "unread", "read"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {f === "all" ? <Bell className="h-4 w-4 mr-1.5" /> : f === "unread" ? <BellOff className="h-4 w-4 mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            {f[0].toUpperCase() + f.slice(1)}
            {f === "unread" && unread > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5">{unread}</Badge>
            )}
          </Button>
        ))}
      </div>

      <Card className="border-slate-200/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
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
                  const t = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                  const ci = CATEGORY_ICON[n.category] ?? CATEGORY_ICON.system;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 sm:gap-4 p-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? "bg-emerald-50/30 border-l-4 border-l-emerald-500" : "border-l-4 border-l-transparent"}`}
                      onClick={() => !n.read && readMut.mutate(n.id)}
                    >
                      <div className={`mt-0.5 shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${t.bg}`}>
                        <span className={t.color}>{t.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-snug ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            {ci}
                            {n.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {n.type}
                          </Badge>
                          <button
                            className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                            onClick={(e) => { e.stopPropagation(); delMut.mutate(n.id); }}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}