/**
 * Shared types, helpers, and UI primitives for the field-incidents pages.
 * Import from here — never duplicate across route files.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ALL_SUGGESTIONS } from "@/lib/field-incident-suggestions";
import {
  Clock, Archive, X, Search, CheckCircle2, Ban, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncidentRow = {
  id: string;
  category: string;
  severity: string;
  status: string;
  notes: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  silo_id: string | null;
  reporter_user_id: string;
  target_role?: string | null;
};

// ─── Colour maps (used in detail panels — NOT on cards per spec) ──────────────

export const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high:     "bg-orange-100 text-orange-800 border-orange-200",
  medium:   "bg-amber-100 text-amber-800 border-amber-200",
  low:      "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const STATUS_COLOR: Record<string, string> = {
  open:          "bg-blue-100 text-blue-800 border-blue-200",
  investigating: "bg-indigo-100 text-indigo-800 border-indigo-200",
  resolved:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  dismissed:     "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_ICON: Record<string, React.ReactNode> = {
  open:          <Clock className="h-3 w-3" />,
  investigating: <Clock className="h-3 w-3 text-indigo-600" />,
  resolved:      <CheckCircle2 className="h-3 w-3" />,
  dismissed:     <Ban className="h-3 w-3" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractTargetRole(row: IncidentRow): string | null {
  if (row.target_role) return row.target_role.toLowerCase();
  if (row.notes) {
    const m = row.notes.match(/Target Role:\s*(\w+)/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/** Pulls "Name (role)" from the notes header written by reportMobileFieldIncident */
export function extractReporterName(row: IncidentRow): string | null {
  if (!row.notes) return null;
  // Format: "Reported by: <name> (<role>) ➔ Target Role: ..."
  const m = row.notes.match(/Reported by:\s*([^(➔\n]+)/);
  if (m) return m[1].trim() || null;
  return null;
}

export function extractReporterRole(row: IncidentRow): string | null {
  if (!row.notes) return null;
  const m = row.notes.match(/Reported by:[^(]*\(([^)]+)\)/);
  if (m) return m[1].trim().toLowerCase() || null;
  return null;
}

export function cleanNotes(notes: string | null | undefined): string {
  if (!notes) return "—";
  return notes.replace(/Reported by:.*?(?:➔ Target Role:[^\n]*)?\n?/g, "").trim() || "—";
}

export function safeRows(data: unknown): IncidentRow[] {
  return (Array.isArray(data) ? data : (data as any)?.incidents ?? []) as IncidentRow[];
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────

type TabCounts = {
  all?: number;
  active?: number;
  resolved?: number;
  dismissed?: number;
  incoming?: number;
};

const TABS = [
  { key: "all",       label: "All",                icon: Archive,      subpath: "/all"       as const },
  { key: "active",    label: "Active",             icon: Clock,        subpath: ""           as const },
  { key: "resolved",  label: "Resolved",           icon: CheckCircle2, subpath: "/resolved"  as const },
  { key: "dismissed", label: "Dismissed",          icon: Ban,          subpath: "/dismissed" as const },
  { key: "incoming",  label: "Incoming",           icon: Users,        subpath: "/incoming"  as const },
] as const;

export function IncidentTabNav({ counts = {}, basePath = "/platform/field-incidents" }: { counts?: TabCounts; basePath?: string }) {
  const location = useLocation();
  const path = location.pathname;

  function isActive(tabPath: string) {
    // Exact match for base path (Active tab)
    if (tabPath === basePath) {
      return path === basePath || path === basePath + "/";
    }
    // For sub-paths, ensure it's an exact match or starts with the path + "/"
    // This prevents /all from matching when on base path
    return path === tabPath || path.startsWith(tabPath + "/");
  }

  const countMap: Record<string, number | undefined> = {
    all:       counts.all,
    active:    counts.active,
    resolved:  counts.resolved,
    dismissed: counts.dismissed,
    incoming:  counts.incoming,
  };

  return (
    <div className="flex items-center gap-0 border-b border-border mb-5 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const tabPath = basePath + tab.subpath;
        const active = isActive(tabPath);
        const Icon   = tab.icon;
        const count  = countMap[tab.key];
        return (
          <Link
            key={tab.key}
            to={tabPath}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium uppercase tracking-widest transition-colors whitespace-nowrap ${
              active
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {count !== undefined && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/70"
              }`}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ─── SearchCombobox ───────────────────────────────────────────────────────────

export function SearchCombobox({
  value,
  onChange,
  existingTitles = [],
}: {
  value: string;
  onChange: (v: string) => void;
  existingTitles?: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef    = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allOptions = useMemo(() => {
    const seen   = new Set<string>();
    const result: string[] = [];
    for (const t of [...existingTitles, ...ALL_SUGGESTIONS]) {
      const key = t.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); result.push(t.trim()); }
    }
    return result;
  }, [existingTitles]);

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    return term ? allOptions.filter((s) => s.toLowerCase().includes(term)) : allOptions;
  }, [allOptions, value]);

  return (
    <div className="relative flex-1 min-w-[200px] max-w-xs" ref={containerRef}>
      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder="Search by title…"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pl-8 h-8 text-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
          <div className="py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">No matching titles found.</p>
            )}
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-muted ${
                  value === s ? "bg-muted font-medium" : "text-foreground/90"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); inputRef.current?.focus(); }}
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors border-t border-border mt-1 pt-2 font-medium"
            >
              Other — type your own search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter chip strip ────────────────────────────────────────────────────────

export function FilterChips({
  search, severity, role,
  onClearSearch, onClearSeverity, onClearRole, onClearAll,
}: {
  search: string; severity: string; role: string;
  onClearSearch: () => void; onClearSeverity: () => void;
  onClearRole: () => void; onClearAll: () => void;
}) {
  const hasAny = search || severity !== "all" || role !== "all";
  if (!hasAny) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Filters:</span>
      {search && (
        <button onClick={onClearSearch} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border hover:bg-muted/80">
          "{search}" <X className="h-2.5 w-2.5" />
        </button>
      )}
      {severity !== "all" && (
        <button onClick={onClearSeverity} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border hover:bg-muted/80 capitalize">
          {severity} <X className="h-2.5 w-2.5" />
        </button>
      )}
      {role !== "all" && (
        <button onClick={onClearRole} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border hover:bg-muted/80 capitalize">
          → {role} <X className="h-2.5 w-2.5" />
        </button>
      )}
      <button onClick={onClearAll} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
        Clear all
      </button>
    </div>
  );
}

// ─── Incident card (stripped: title + date only) ───────────────────────────

export function IncidentCard({
  row,
  isSelected,
  onClick,
  extra,
}: {
  row: IncidentRow;
  isSelected: boolean;
  onClick: () => void;
  /** Optional line below the title (e.g. reporter name) */
  extra?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card
        className={`transition-all duration-150 hover:shadow-md ${
          isSelected
            ? "border-primary ring-1 ring-primary/30 bg-primary/5"
            : "hover:border-primary/40"
        }`}
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{row.category}</p>
              {extra && <div className="mt-0.5">{extra}</div>}
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0 text-right leading-tight">
              {new Date(row.created_at).toLocaleDateString()}<br />
              <span className="text-[10px]">
                {new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

// ─── Detail panel (read/write or read-only) ───────────────────────────────────

export function DetailPanel({
  row,
  onClose,
  children,
}: {
  row: IncidentRow;
  onClose: () => void;
  /** Action buttons / resolution textarea — omit for read-only panels */
  children?: React.ReactNode;
}) {
  const tr           = extractTargetRole(row);
  const reporterName = extractReporterName(row);
  const reporterRole = extractReporterRole(row);

  return (
    <div className="sticky top-4">
      <Card className="shadow-md border-primary/30">
        <CardContent className="p-5 space-y-4 text-sm">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base leading-tight">{row.category}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`border text-xs ${SEVERITY_COLOR[row.severity] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {row.severity}
            </Badge>
            <Badge className={`border text-xs inline-flex items-center gap-1 ${STATUS_COLOR[row.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {STATUS_ICON[row.status]} {row.status}
            </Badge>
            {tr && (
              <Badge variant="outline" className="text-xs capitalize">→ {tr}</Badge>
            )}
          </div>

          {/* Reporter */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reported by</p>
            <p className="text-xs bg-muted/40 rounded px-2 py-1.5">
              {reporterName
                ? <><span className="font-medium">{reporterName}</span>{reporterRole ? <span className="text-muted-foreground"> · {reporterRole}</span> : null}</>
                : <span className="font-mono">{row.reporter_user_id}</span>
              }
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
              {cleanNotes(row.notes)}
            </p>
          </div>

          {/* Resolution notes (read-only, shown when present) */}
          {row.resolution_notes && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution notes</p>
              <p className="text-sm whitespace-pre-wrap bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/60 rounded-lg px-3 py-2 leading-relaxed">
                {row.resolution_notes}
              </p>
            </div>
          )}

          {/* Closed at (for resolved/dismissed pages) */}
          {row.resolved_at && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {row.status === "dismissed" ? "Dismissed at" : "Resolved at"}
              </p>
              <p className="text-xs font-mono bg-muted/40 rounded px-2 py-1">
                {new Date(row.resolved_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Slot for action buttons / resolution textarea */}
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
