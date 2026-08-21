import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ArrowRight, Command, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyRole } from "@/lib/roles.functions";

type NavTarget = {
  label: string;
  to: string;
  /** Query-string params to land with, e.g. { tab: "silos" }. */
  search?: Record<string, string>;
  group: string;
  keywords?: string;
  /** Hidden from pure super_admins (no other role) — mirrors the
   * /grain-operations block in _authenticated/route.tsx's beforeLoad guard,
   * so this bar never offers a destination the guard would then reject. */
  operationalOnly?: true;
};

// Global nav catalog — every authenticated destination. This is the ONLY
// place this bar can send you; it never filters in-page content. Each
// page's own table/list search (e.g. the Batches search inside
// /grain-operations) is a separate, unrelated input — see BatchesSection.tsx
// etc. Do not wire this bar to page-level state.
const NAV_TARGETS: NavTarget[] = [
  { label: "Dashboard", to: "/dashboard", group: "Home", keywords: "home overview" },
  // Operations — Grain Batches / Silos / Warehouses / Buyers all live as
  // tabs on the single /grain-operations workspace.
  {
    label: "Grain Operations",
    to: "/grain-operations",
    group: "Operations",
    keywords: "workspace batches silos warehouses buyers",
    operationalOnly: true,
  },
  {
    label: "Grain Batches",
    to: "/grain-operations",
    search: { tab: "batches" },
    group: "Operations",
    keywords: "lots inventory",
    operationalOnly: true,
  },
  {
    label: "Spoiled / Damaged Batches",
    to: "/grain-operations",
    search: { tab: "batches", status: "damaged" },
    group: "Operations",
    keywords: "spoiled rotten loss risk",
    operationalOnly: true,
  },
  {
    label: "Silos",
    to: "/grain-operations",
    search: { tab: "silos" },
    group: "Operations",
    operationalOnly: true,
  },
  {
    label: "Warehouses",
    to: "/grain-operations",
    search: { tab: "warehouses" },
    group: "Operations",
    operationalOnly: true,
  },
  {
    label: "Buyers",
    to: "/grain-operations",
    search: { tab: "buyers" },
    group: "Operations",
    keywords: "customers dispatch",
    operationalOnly: true,
  },
  { label: "Sensors", to: "/sensors", group: "Operations", keywords: "iot devices" },
  { label: "Actuators", to: "/actuators", group: "Operations", keywords: "iot control" },
  { label: "Incidents", to: "/incidents", group: "Operations" },
  { label: "Maintenance", to: "/maintenance", group: "Operations" },
  {
    label: "Environmental",
    to: "/environmental",
    group: "Operations",
    keywords: "climate weather",
  },
  // Insights
  {
    label: "Intelligence",
    to: "/intelligence",
    group: "Insights",
    keywords: "ai predictions analytics ml models reports charts graphs data visualization",
  },
  { label: "Traceability", to: "/traceability", group: "Insights" },
  {
    label: "Administration",
    to: "/administration",
    group: "Admin",
    keywords: "team members users security activity logs audit history",
  },
  // Business
  { label: "Orders", to: "/orders", group: "Business", keywords: "hardware install" },
  {
    label: "Business",
    to: "/business",
    group: "Business",
    keywords: "revenue income subscription insurance policies claims plan management billing",
  },
  { label: "Plans", to: "/plans", group: "Business", keywords: "pricing" },
  // Admin
  { label: "Server Monitoring", to: "/server-monitoring", group: "Admin" },
  { label: "Settings", to: "/settings", group: "Admin" },
  // Platform (super_admin)
  { label: "Platform · Tenants", to: "/platform/tenants", group: "Platform" },
  { label: "Platform · Users & roles", to: "/platform/users", group: "Platform" },
  { label: "Platform · Plans & pricing", to: "/platform/plans", group: "Platform" },
  { label: "Platform · Revenue", to: "/revenue", group: "Platform" },
  {
    label: "Platform · Pipeline",
    to: "/platform/pipeline",
    group: "Platform",
    keywords: "hubspot leads",
  },
  { label: "Platform · Leads", to: "/platform/leads", group: "Platform" },
  {
    label: "Platform · Install orders",
    to: "/platform/orders",
    group: "Platform",
    keywords: "hardware",
  },
  { label: "Platform · Health", to: "/platform/health", group: "Platform" },
  {
    label: "Platform · Reporting",
    to: "/platform/reporting",
    group: "Platform",
    keywords: "bugs hardware queries support",
  },
  { label: "Platform · Audit logs", to: "/platform/audit-logs", group: "Platform" },
  { label: "Platform · System logs", to: "/platform/logs", group: "Platform" },
];

export function AppSearch() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Same query key AppSidebar/useIsSuperAdmin use — shares the cache, no
  // extra request. "Pure" super_admin (no other role) matches the
  // beforeLoad guard's isSuperAdmin && !alsoOperational check exactly.
  const fetchRole = useServerFn(getMyRole);
  const { data: roleData } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const isPureSuperAdmin = useMemo(() => {
    const roles = roleData?.roles ?? [];
    return (
      roles.includes("super_admin") &&
      !roles.some((r) => ["admin", "manager", "technician"].includes(r))
    );
  }, [roleData]);

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

  // Reset on route change.
  useEffect(() => {
    setQ("");
    setOpen(false);
    setHighlight(0);
  }, [pathname]);

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.trim().toLowerCase();
    return NAV_TARGETS.filter(
      (t) =>
        !(isPureSuperAdmin && t.operationalOnly) &&
        (t.label.toLowerCase().includes(needle) ||
          t.group.toLowerCase().includes(needle) ||
          (t.keywords ?? "").toLowerCase().includes(needle)),
    ).slice(0, 10);
  }, [q, isPureSuperAdmin]);

  // Keep highlight in bounds when the result list changes.
  useEffect(() => {
    setHighlight(0);
  }, [q]);

  function goTo(target: NavTarget) {
    setOpen(false);
    setQ("");
    navigate({ to: target.to as never, search: (target.search ?? {}) as never });
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        goTo(target);
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
        placeholder="Search anything or jump to a page…"
        aria-label="Search anything or jump to a page"
        className={cn(
          "w-full h-9 pl-9 pr-16 rounded-full text-sm bg-transparent hover:bg-muted focus:bg-background",
          "border-0 focus:outline-none transition placeholder:text-muted-foreground",
        )}
      />
      <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
        <Command className="h-2.5 w-2.5" />K
      </kbd>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background shadow-lg overflow-hidden z-40">
          {matches.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matching pages.</div>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto">
                {matches.map((m, i) => (
                  <li key={`${m.to}:${m.label}`}>
                    <Link
                      to={m.to as never}
                      search={(m.search ?? {}) as never}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm",
                        i === highlight ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="flex-1">{m.label}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {m.group}
                      </span>
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
                  <CornerDownLeft className="h-3 w-3" /> open ·{" "}
                  <kbd className="rounded border border-border/60 px-1">esc</kbd> close
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
