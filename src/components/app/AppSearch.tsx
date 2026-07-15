import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";

type NavTarget = { label: string; to: string; group: string };

// Global nav catalog for quick-jump on dashboard / platform scopes.
const NAV_TARGETS: NavTarget[] = [
  { label: "Dashboard", to: "/dashboard", group: "Home" },
  { label: "Grain Batches", to: "/grain-batches", group: "Operations" },
  { label: "Silos", to: "/silos", group: "Operations" },
  { label: "Warehouses", to: "/warehouses", group: "Operations" },
  { label: "Sensors", to: "/sensors", group: "Operations" },
  { label: "Actuators", to: "/actuators", group: "Operations" },
  { label: "Alerts", to: "/grain-alerts", group: "Operations" },
  { label: "Incidents", to: "/incidents", group: "Operations" },
  { label: "Maintenance", to: "/maintenance", group: "Operations" },
  { label: "AI Predictions", to: "/ai-predictions", group: "Insights" },
  { label: "Analytics", to: "/analytics", group: "Insights" },
  { label: "Reports", to: "/reports", group: "Insights" },
  { label: "ML Models", to: "/ml-models", group: "Insights" },
  { label: "Data Visualization", to: "/data-visualization", group: "Insights" },
  { label: "Traceability", to: "/traceability", group: "Insights" },
  { label: "Notifications", to: "/notifications", group: "Insights" },
  { label: "Activity Logs", to: "/activity-logs", group: "Insights" },
  { label: "Buyers", to: "/buyers", group: "Business" },
  { label: "Revenue", to: "/revenue", group: "Business" },
  { label: "Subscription", to: "/subscription", group: "Business" },
  { label: "Plans", to: "/plans", group: "Business" },
  { label: "Insurance", to: "/insurance", group: "Business" },
  { label: "Team", to: "/team-management", group: "Admin" },
  { label: "Security", to: "/security-center", group: "Admin" },
  { label: "Settings", to: "/settings", group: "Admin" },
  { label: "Platform Console", to: "/platform", group: "Admin" },
];

// Human-readable label per route prefix.
const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Global search",
  "/platform": "Platform (tenants, users, logs)",
  "/grain-batches": "batches",
  "/silos": "silos",
  "/sensors": "sensors",
  "/actuators": "actuators",
  "/warehouses": "warehouses",
  "/grain-alerts": "alerts",
  "/buyers": "buyers",
  "/incidents": "incidents",
  "/maintenance": "maintenance tasks",
  "/team-management": "team members",
  "/notifications": "notifications",
  "/orders": "orders",
  "/activity-logs": "activity",
  "/reports": "reports",
  "/plans": "plans",
};

function scopeFor(pathname: string): { global: boolean; label: string } {
  if (pathname === "/dashboard" || pathname.startsWith("/platform")) {
    return { global: true, label: PAGE_LABELS[pathname === "/dashboard" ? "/dashboard" : "/platform"] };
  }
  const key = Object.keys(PAGE_LABELS).find((k) => k !== "/dashboard" && k !== "/platform" && pathname.startsWith(k));
  return { global: false, label: key ? `Search ${PAGE_LABELS[key]} on this page` : "Search this page" };
}

/**
 * Broadcasts the current search query to page-level listeners.
 * Pages can subscribe via `useAppSearchQuery()` to filter their own lists.
 */
export function useAppSearchQuery() {
  const [q, setQ] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (window as unknown as { __appSearch?: string }).__appSearch ?? "";
  });
  useEffect(() => {
    const handler = (e: Event) => setQ((e as CustomEvent<string>).detail ?? "");
    window.addEventListener("app:search", handler as EventListener);
    return () => window.removeEventListener("app:search", handler as EventListener);
  }, []);
  return q;
}

export function AppSearch() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const scope = useMemo(() => scopeFor(pathname), [pathname]);

  // "/" or "Cmd/Ctrl+K" focuses the bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Broadcast query for page-scoped searches (debounced-lite via effect).
  useEffect(() => {
    if (scope.global) return;
    (window as unknown as { __appSearch?: string }).__appSearch = q;
    window.dispatchEvent(new CustomEvent("app:search", { detail: q }));
  }, [q, scope.global]);

  // Reset on route change.
  useEffect(() => {
    setQ("");
    setOpen(false);
  }, [pathname]);

  const matches = useMemo(() => {
    if (!scope.global || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    return NAV_TARGETS.filter((t) => t.label.toLowerCase().includes(needle)).slice(0, 8);
  }, [q, scope.global]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={scope.global ? "Search silos, batches, sensors, or jump to a page…" : scope.label}
        aria-label={scope.label}
        className={cn(
          "w-full h-9 pl-9 pr-16 rounded-full text-sm bg-muted/60 hover:bg-muted focus:bg-background",
          "border border-transparent focus:border-[--fusion-grape]/50 focus:outline-none transition placeholder:text-muted-foreground",
        )}
      />
      <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
        <Command className="h-2.5 w-2.5" />K
      </kbd>

      {open && scope.global && q.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg overflow-hidden z-40">
          {matches.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matching pages.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {matches.map((m) => (
                <li key={m.to}>
                  <Link
                    to={m.to}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="flex-1">{m.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.group}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && !scope.global && q.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg z-40 p-3 text-xs text-muted-foreground">
          Filtering this page by <span className="font-semibold text-foreground">"{q}"</span>. Press
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => navigate({ to: "/dashboard" })}
            className="ml-1 text-[#00a63e] hover:underline"
          >
            search everywhere
          </button>{" "}
          to jump to global search.
        </div>
      )}
    </div>
  );
}