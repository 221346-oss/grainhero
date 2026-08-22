import { ListSkeleton, NotificationsSkeleton } from "@/components/app/skeletons";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Package, Truck, DollarSign, Shield, FileText, Settings, Check, RefreshCw, Trash2, ArrowLeft,
} from "lucide-react";
import {
  listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
} from "@/lib/notifications-audit.functions";
import { getMySettings, updateMySettings } from "@/lib/team-settings-insurance.functions";
import { Switch } from "@/components/ui/switch";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Grain Hero" },
      { name: "description", content: "Notifications workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Notifications — Grain Hero" },
      { property: "og:description", content: "Notifications workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
  moderation: <Shield className="h-3.5 w-3.5" />,
  messaging: <Bell className="h-3.5 w-3.5" />,
  audit: <FileText className="h-3.5 w-3.5" />,
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

const PREF_ROWS = [
  { key: "email_alerts", label: "Email alerts" },
  { key: "sms_alerts", label: "SMS alerts" },
  { key: "push_notifications", label: "Push notifications" },
  { key: "weekly_reports", label: "Weekly reports" },
  { key: "expiry_email_alerts", label: "Email me when my plan is about to expire (7 / 3 / 1 days)" },
  { key: "expiry_push_alerts", label: "In-app notification when my plan is about to expire" },
] as const;

const PREF_DEFAULTS: Record<string, boolean> = {
  email_alerts: true, sms_alerts: false, push_notifications: true,
  weekly_reports: true, expiry_email_alerts: true, expiry_push_alerts: true,
};

function NotificationPreferences() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMySettings);
  const saveFn = useServerFn(updateMySettings);
  const { data } = useQuery({ queryKey: ["my-settings"], queryFn: () => getFn() });

  const prefs: Record<string, boolean> = { ...PREF_DEFAULTS };
  const stored = (data?.preferences ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(PREF_DEFAULTS)) {
    if (typeof stored[k] === "boolean") prefs[k] = stored[k] as boolean;
  }

  const saveMut = useMutation({
    mutationFn: (next: Record<string, boolean>) => saveFn({ data: { preferences: { ...stored, ...next } } }),
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["my-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <CardDescription>Choose how we contact you. Changes save automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PREF_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium text-foreground">{row.label}</span>
            <Switch
              checked={prefs[row.key]}
              disabled={saveMut.isPending || !data}
              onCheckedChange={(v) => saveMut.mutate({ ...prefs, [row.key]: v })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  useRealtimeInvalidate("notifications", [["notifications"]]);
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const del = useServerFn(deleteNotification);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notifications", filter, Array.from(categories).sort().join(",")],
    queryFn: () => list({
      data: {
        filter,
        limit: 50,
        categories: categories.size ? Array.from(categories) : undefined,
      },
    }),
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

  if (isLoading) return <NotificationsSkeleton />;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
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

      {(data?.availableCategories?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wide mr-1">Categories:</span>
          {(data?.availableCategories ?? []).map((c) => {
            const on = categories.has(c);
            return (
              <button
                key={c}
                onClick={() => setCategories((s) => {
                  const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n;
                })}
                className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                  on ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                {CATEGORY_ICON[c] ?? CATEGORY_ICON.system}
                {c}
              </button>
            );
          })}
          {categories.size > 0 && (
            <button className="text-[11px] text-slate-400 hover:text-slate-700 underline"
              onClick={() => setCategories(new Set())}>clear</button>
          )}
        </div>
      )}

      <Card className="border-slate-200/70">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><ListSkeleton rows={5} /></div>
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
              <div className="divide-y divide-gray-200">
                {notifications.map((n) => {
                  const ci = CATEGORY_ICON[n.category] ?? CATEGORY_ICON.system;
                  const isUnread = !n.read;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-4 transition-colors ${isUnread ? "bg-blue-50/30" : "bg-white"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                              <p className={`text-sm leading-snug ${isUnread ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                                {n.title}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {formatTime(n.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 border border-gray-300 rounded text-gray-600">
                            {n.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 border border-gray-300 rounded text-gray-600 capitalize">
                            {n.type}
                          </span>
                          {isUnread && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 ml-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                readMut.mutate(n.id);
                              }}
                              disabled={readMut.isPending}
                            >
                              Mark Read
                            </Button>
                          )}
                          <button
                            className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
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

      <NotificationPreferences />
    </div>
  );
}