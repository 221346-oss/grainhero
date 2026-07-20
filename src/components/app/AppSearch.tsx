import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search, ArrowRight, Command, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type NavTarget = { label: string; to: string; group: string; keywords?: string };

// Global nav catalog — every authenticated destination.
const NAV_TARGETS: NavTarget[] = [
  { label: "Dashboard", to: "/dashboard", group: "Home", keywords: "home overview" },
  // Operations
  { label: "Grain Batches", to: "/grain-batches", group: "Operations", keywords: "lots inventory" },
  { label: "Silos", to: "/silos", group: "Operations" },
  { label: "Warehouses", to: "/warehouses", group: "Operations" },
  { label: "Sensors", to: "/sensors", group: "Operations", keywords: "iot devices" },
  { label: "Actuators", to: "/actuators", group: "Operations", keywords: "iot control" },
  { label: "Alerts", to: "/grain-alerts", group: "Operations" },
  { label: "Incidents", to: "/incidents", group: "Operations" },
  { label: "Maintenance", to: "/maintenance", group: "Operations" },
  { label: "Environmental", to: "/environmental", group: "Operations", keywords: "climate weather" },
  // Insights
  { label: "Intelligence", to: "/intelligence", group: "Insights", keywords: "ai predictions analytics ml models reports charts graphs data visualization" },
  { label: "Traceability", to: "/traceability", group: "Insights" },
  { label: "Administration", to: "/administration", group: "Admin", keywords: "team members users security activity logs audit history" },
  // Business
  { label: "Buyers", to: "/buyers", group: "Business", keywords: "customers" },
  { label: "Orders", to: "/orders", group: "Business", keywords: "hardware install" },
  { label: "Business", to: "/business", group: "Business", keywords: "revenue income subscription insurance policies claims plan management billing" },
  { label: "Plans", to: "/plans", group: "Business", keywords: "pricing" },
  // Admin
  { label: "Server Monitoring", to: "/server-monitoring", group: "Admin" },
  { label: "Settings", to: "/settings", group: "Admin" },
  // Platform (super_admin)
  { label: "Platform · Tenants", to: "/platform/tenants", group: "Platform" },
  { label: "Platform · Users & roles", to: "/platform/users", group: "Platform" },
  { label: "Platform · Plans & pricing", to: "/platform/plans", group: "Platform" },
  { label: "Platform · Revenue", to: "/revenue", group: "Platform" },
  { label: "Platform · Pipeline", to: "/platform/pipeline", group: "Platform", keywords: "hubspot leads" },
  { label: "Platform · Leads", to: "/platform/leads", group: "Platform" },
  { label: "Platform · Install orders", to: "/platform/orders", group: "Platform", keywords: "hardware" },
  { label: "Platform · Health", to: "/platform/health", group: "Platform" },
  { label: "Platform · Reporting", to: "/platform/reporting", group: "Platform", keywords: "bugs hardware queries support" },
  { label: "Platform · Audit logs", to: "/platform/audit-logs", group: "Platform" },
  { label: "Platform · System logs", to: "/platform/logs", group: "Platform" },
];

// Human-readable label per route prefix — for page-scoped placeholder.
const PAGE_LABELS: Record<string, string> = {
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
  "/insurance": "policies",
  "/subscription": "your subscription",
  "/environmental": "environmental readings",
  "/traceability": "batch traceability",
  "/analytics": "analytics",
  "/ai-predictions": "predictions",
  "/ml-models": "models",
  "/intelligence": "intelligence",
  "/security-center": "security events",
  "/administration": "administration",
  "/server-monitoring": "server metrics",
  "/revenue": "revenue records",
  "/business": "business",
  "/settings": "settings",
};

function scopeFor(pathname: string): { global: boolean; label: string } {
  if (pathname === "/dashboard" || pathname.startsWith("/platform")) {
    return { global: true, label: pathname === "/dashboard" ? "Global search" : "Platform search" };
  }
  const key = Object.keys(PAGE_LABELS).find((k) => pathname.startsWith(k));
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
  const [highlight, setHighlight] = useState(0);
  const scope = useMemo(() => scopeFor(pathname), [pathname]);

  // Global shortcuts: "/" and ⌘K / Ctrl+K focus the bar. Esc clears + closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
        setQ("");
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
    setHighlight(0);
  }, [pathname]);

  const matches = useMemo(() => {
    if (!scope.global || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    return NAV_TARGETS.filter((t) =>
      t.label.toLowerCase().includes(needle) ||
      t.group.toLowerCase().includes(needle) ||
      (t.keywords ?? "").toLowerCase().includes(needle),
    ).slice(0, 10);
  }, [q, scope.global]);

  // Keep highlight in bounds when the result list changes.
  useEffect(() => { setHighlight(0); }, [q]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!scope.global) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (matches.length ? (h + 1) % matches.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (matches.length ? (h - 1 + matches.length) % matches.length : 0));
    } else if (e.key === "Enter") {
      const target = matches[highlight] ?? matches[0];
      if (target) {
        e.preventDefault();
        setOpen(false);
        setQ("");
        navigate({ to: target.to as never });
      }
    }
  };

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
        onKeyDown={onInputKeyDown}
        placeholder={scope.global ? "Search anything or jump to a page…" : scope.label}
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
            <>
              <ul className="max-h-80 overflow-y-auto">
                {matches.map((m, i) => (
                  <li key={m.to}>
                    <Link
                      to={m.to as never}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => { setOpen(false); setQ(""); }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm",
                        i === highlight ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="flex-1">{m.label}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.group}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <kbd className="rounded border border-border/60 px-1">↑</kbd>
                  <kbd className="rounded border border-border/60 px-1">↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" /> open · <kbd className="rounded border border-border/60 px-1">esc</kbd> close
                </span>
              </div>
            </>
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