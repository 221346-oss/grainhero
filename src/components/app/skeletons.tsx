import { cn } from "@/lib/utils";
import { Wheat } from "lucide-react";

/**
 * Content-shaped skeletons (LinkedIn / YouTube style) with GrainHero branding.
 * Use these instead of a spinner while the initial page data loads.
 */

// ─── Option 1: Branded Loader ───────────────────────────────────────────────
export function BrandedLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Wheat className="h-9 w-9 text-white" />
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-1.5 rounded-[18px] border-2 border-emerald-300 border-t-emerald-600 animate-spin" />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GrainHero</h1>
          <p className="text-sm text-slate-500 mt-1">Loading your dashboard…</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-emerald-100 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

// Branded pulse box
function GreenPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-emerald-100/70",
        className
      )}
    />
  );
}

export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-emerald-100 bg-white p-4 space-y-3 shadow-sm">
          <GreenPulse className="h-3 w-24" />
          <GreenPulse className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm", className)}>
      <div className="divide-y divide-emerald-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <GreenPulse className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <GreenPulse className="h-3.5 w-1/3" />
              <GreenPulse className="h-3 w-1/2" />
            </div>
            <GreenPulse className="h-5 w-16 rounded-full hidden sm:block" />
            <GreenPulse className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm", className)}>
      <div className="p-4 border-b border-emerald-50 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <GreenPulse key={i} className={cn("h-3", i === 0 ? "w-24" : "flex-1")} />
        ))}
      </div>
      <div className="divide-y divide-emerald-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <GreenPulse key={c} className={cn("h-4", c === 0 ? "w-24" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <GreenPulse className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <GreenPulse className="h-3.5 w-2/3" />
              <GreenPulse className="h-3 w-1/3" />
            </div>
          </div>
          <div className="space-y-2">
            <GreenPulse className="h-3 w-full" />
            <GreenPulse className="h-3 w-5/6" />
            <GreenPulse className="h-3 w-3/4" />
          </div>
          <div className="flex gap-2 pt-1">
            <GreenPulse className="h-6 w-16 rounded-full" />
            <GreenPulse className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-emerald-100 bg-white p-6 shadow-sm", className)}>
      <div className="space-y-2 mb-6">
        <GreenPulse className="h-5 w-40" />
        <GreenPulse className="h-3 w-64" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <GreenPulse className="h-3 w-20" />
            <GreenPulse className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Branded header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center animate-pulse">
          <Wheat className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <GreenPulse className="h-5 w-48" />
          <GreenPulse className="h-3 w-72 max-w-full" />
        </div>
      </div>

      {/* Stats row */}
      <StatsSkeleton />

      {/* Main content area */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart area */}
        <div className="lg:col-span-2 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
          <GreenPulse className="h-4 w-32" />
          <GreenPulse className="h-56 w-full rounded-lg" />
        </div>

        {/* Side list */}
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
          <GreenPulse className="h-4 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <GreenPulse className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <GreenPulse className="h-3 w-3/4" />
                <GreenPulse className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom table */}
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}

/** Section-level fallback for inline data blocks. */
export function InlineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <GreenPulse className="h-4 w-4 rounded-full" />
          <GreenPulse className="h-3 flex-1" />
          <GreenPulse className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}