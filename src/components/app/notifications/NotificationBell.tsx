import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { listGrainAlerts } from "@/lib/operations.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SEV_DOT: Record<string, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const { items, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  const listAlertsFn = useServerFn(listGrainAlerts);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: alertsData } = useQuery({ queryKey: ["grain-alerts"], queryFn: () => listAlertsFn() as Promise<any[]> });
  const openAlerts = (alertsData ?? []).filter((a) => a.status !== "resolved");
  const alertsPreview = openAlerts.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
          data-tour="topbar-notifications"
          className="relative shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold grid place-items-center ring-2 ring-background">
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all
            </button>
          )}
        </div>
        {openAlerts.length > 0 && (
          <div className="border-b border-border/60 bg-rose-50/40 dark:bg-rose-500/5">
            <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400 inline-flex items-center gap-1.5">
                <TriangleAlert className="h-3 w-3" /> {openAlerts.length} open alert{openAlerts.length === 1 ? "" : "s"}
              </p>
              <Link
                to="/grain-alerts"
                search={{ priority: "all" }}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                View all
              </Link>
            </div>
            <ul className="pb-1">
              {alertsPreview.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/grain-alerts"
                    search={{ priority: "all" }}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-rose-100/50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[a.priority] ?? PRIORITY_DOT.low)} />
                    <span className="text-xs text-foreground truncate flex-1">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(a.triggered_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="py-10 grid place-items-center text-center text-muted-foreground">
              <Bell className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-sm">You're all caught up</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors",
                    !n.read && "bg-emerald-50/40 dark:bg-emerald-500/5",
                  )}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    const link = (n as { action_url?: string | null }).action_url;
                    if (link) navigate({ to: link });
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        SEV_DOT[n.type] ?? SEV_DOT.info,
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !n.read ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {n.category}
                        </span>
                        {!n.read && (
                          <button
                            type="button"
                            className="ml-auto text-[10px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 inline-flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                          >
                            <Check className="h-3 w-3" /> Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border/60 px-4 py-2 bg-muted/30">
          <Link
            to="/notifications"
            className="block text-center text-[12px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}