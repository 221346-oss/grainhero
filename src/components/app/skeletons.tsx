import { Skeleton } from "@/components/ui/skeleton";

// ─── Shared primitive ────────────────────────────────────────────────────────
function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {children}
    </div>
  );
}

// ─── Router default pending (full-page) ─────────────────────────────────────
export function BrandedLoader() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-8 w-28 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}

// ─── Dashboard skeleton (main content only, no sidebar) ───────────────────────
export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(null).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
      
      {/* Two column content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: List card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="divide-y">
            {Array(5).fill(null).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: Chart card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-3 w-40 rounded mt-2" />
          </div>
          <div className="p-4 space-y-3">
            {/* Bar chart */}
            <div className="flex items-end justify-between h-48 gap-2">
              {Array(7).fill(null).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="flex-1 rounded-t" 
                  style={{ height: `${30 + Math.random() * 70}%` }} 
                />
              ))}
            </div>
            <div className="flex justify-between pt-2">
              {Array(7).fill(null).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats skeleton (reusable row of KPI cards) ───────────────────────────────
export function StatsSkeleton({ count = 4 }: { count?: number; className?: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array(count).fill(null).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex justify-between items-start">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </SkeletonCard>
      ))}
    </div>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex gap-4 px-4 py-3 border-b bg-muted/40">
        {Array(cols).fill(null).map((_, i) => (
          <Skeleton key={i} className="h-4 rounded flex-1" />
        ))}
      </div>
      {Array(rows).fill(null).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          {Array(cols - 1).fill(null).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 rounded" />
          ))}
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── List skeleton (notifications, activity, simple rows) ────────────────────
export function ListSkeleton({ rows = 5 }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3">
      {Array(rows).fill(null).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <Skeleton className="h-3 w-12 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Cards grid skeleton ──────────────────────────────────────────────────────
export function CardsSkeleton({ count = 6 }: { count?: number; className?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array(count).fill(null).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-9 w-full rounded-lg mt-1" />
        </SkeletonCard>
      ))}
    </div>
  );
}

// ─── Form skeleton ────────────────────────────────────────────────────────────
export function FormSkeleton({ fields = 4 }: { fields?: number; className?: string }) {
  return (
    <div className="space-y-5">
      {Array(fields).fill(null).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

// ─── Orders skeleton ──────────────────────────────────────────────────────────
// Matches: header + grid of cards each with title, badge, 2-col details
export function OrdersSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24 rounded" />
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
      </div>
      {/* Order cards */}
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {Array(4).fill(null).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3.5 w-full rounded border-t pt-2 mt-1" />
        </div>
      ))}
    </div>
  );
}

// ─── Analytics skeleton ───────────────────────────────────────────────────────
// Matches: 4 stat cards + 3 env cards + bar chart + two distribution grids
export function AnalyticsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24 rounded" />
      <div className="space-y-1">
        <Skeleton className="h-8 w-56 rounded" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>
      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-8 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded shrink-0" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      {/* 3 env cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {Array(3).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
      {/* Bar chart */}
      <SkeletonCard>
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-3.5 w-48 rounded" />
        <div className="flex items-end gap-1.5 h-36 pt-2">
          {Array(14).fill(null).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${20 + ((i * 13) % 80)}%` }} />
          ))}
        </div>
      </SkeletonCard>
      {/* Distribution grids */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array(2).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-5 w-32 rounded" />
            {Array(4).fill(null).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3.5 w-12 rounded" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Notifications skeleton ───────────────────────────────────────────────────
// Matches: header with buttons + filter tabs + notification list
export function NotificationsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24 rounded" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-36 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array(3).fill(null).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>
      {/* Notification items */}
      {Array(6).fill(null).map((_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3.5 w-14 rounded shrink-0" />
            </div>
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-3/4 rounded" />
          </div>
          <div className="flex gap-1 shrink-0">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reports skeleton ─────────────────────────────────────────────────────────
// Matches: back link + header with period select + 4 stat cards + 4 download cards
export function ReportsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24 rounded" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      {/* 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-20 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded shrink-0" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      {/* 4 download cards in 2-col grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-3.5 w-48 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Subscription skeleton ───────────────────────────────────────────────────
// Matches: back link + header + plan card + usage bars + invoice table
export function SubscriptionSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24 rounded" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      {/* Plan card */}
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonCard>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-6 w-36 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          {Array(3).fill(null).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </SkeletonCard>
        {/* Usage card */}
        <SkeletonCard>
          <Skeleton className="h-5 w-24 rounded" />
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </SkeletonCard>
      </div>
      {/* Invoice table */}
      <SkeletonCard>
        <Skeleton className="h-5 w-28 rounded" />
        {Array(3).fill(null).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}

// ─── Inline list skeleton (sidebar, small panels) ─────────────────────────────
export function InlineListSkeleton() {
  return (
    <div className="space-y-2">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Shared: PageHeader + stat strip + toolbar ────────────────────────────────
function PageHeaderSkel({ cols = 4, statH = "h-8" }: { cols?: number; statH?: string }) {
  return (
    <>
      {/* PageHeader */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      {/* Stat strip */}
      <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-3 mb-6`}>
        {Array(cols).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className={`${statH} w-20 rounded`} />
          </SkeletonCard>
        ))}
      </div>
    </>
  );
}

function ToolbarSkel({ filters = 2, hasButton = true }: { filters?: number; hasButton?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-5">
      <Skeleton className="h-10 flex-1 rounded-md" />
      {Array(filters).fill(null).map((_, i) => (
        <Skeleton key={i} className="h-10 w-36 rounded-md" />
      ))}
      {hasButton && <Skeleton className="h-10 w-32 rounded-md" />}
    </div>
  );
}

// ─── Grain Batches skeleton ───────────────────────────────────────────────────
// p-4 md:p-8 max-w-7xl — PageHeader + 5 stats + search+2filters+btn + 3-col cards
export function GrainBatchesSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeaderSkel cols={5} />
      <ToolbarSkel filters={2} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {Array(3).fill(null).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Silos skeleton ───────────────────────────────────────────────────────────
// p-4 md:p-8 max-w-7xl — PageHeader + 4 stats + search+2filters+btn + 3-col silo cards
export function SilosSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeaderSkel cols={4} />
      <ToolbarSkel filters={2} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full shrink-0" />
            </div>
            {/* Capacity progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            {/* Sensor readings row */}
            <div className="grid grid-cols-3 gap-2">
              {Array(3).fill(null).map((_, j) => (
                <div key={j} className="rounded-lg bg-muted/40 p-2 space-y-1">
                  <Skeleton className="h-3 w-10 rounded" />
                  <Skeleton className="h-4 w-8 rounded" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Sensors skeleton ─────────────────────────────────────────────────────────
// p-4 md:p-8 max-w-7xl — PageHeader + 4 stats + search+2filters+btn + 3-col cards
export function SensorsSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeaderSkel cols={4} />
      <ToolbarSkel filters={2} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full shrink-0" />
            </div>
            {/* Live readings row */}
            <div className="grid grid-cols-2 gap-2">
              {Array(4).fill(null).map((_, j) => (
                <div key={j} className="rounded-lg bg-muted/40 p-2 space-y-1">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Actuators skeleton ───────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — inline header+buttons + 4 stats + search+2filters + 3-col control cards
export function ActuatorsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header row with buttons */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </SkeletonCard>
        ))}
      </div>
      <ToolbarSkel filters={2} hasButton={false} />
      {/* Actuator control cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full shrink-0" />
            </div>
            {/* PWM slider skeleton */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Grain Alerts skeleton ────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — PageHeader+btn + 6 stats + search+2filters + alert list rows
export function GrainAlertsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="h-7 w-12 rounded" />
          </SkeletonCard>
        ))}
      </div>
      <ToolbarSkel filters={2} hasButton={false} />
      <div className="space-y-3">
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Buyers skeleton ─────────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — PageHeader+btn + 4 stats + search+2filters + 3-col buyer cards
export function BuyersSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-8 w-16 rounded" />
          </SkeletonCard>
        ))}
      </div>
      <ToolbarSkel filters={2} hasButton={false} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(6).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-40 rounded" />
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3.5 w-28 rounded" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Warehouses skeleton ─────────────────────────────────────────────────────
// p-6 md:p-8 max-w-7xl — PageHeader + 3 stats + search+filter+btn + table
export function WarehousesSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array(3).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-7 w-24 rounded" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <ToolbarSkel filters={1} />
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b bg-muted/40">
          {["Warehouse","Location","Capacity","Silos","Status","Actions"].map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" />
          ))}
        </div>
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 items-center px-4 py-3 border-b last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <div className="flex gap-1 justify-end">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Incidents skeleton ───────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — inline h1+p header + 5 stat cards + search+filter card + list rows
export function IncidentsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array(5).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-12 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b flex-wrap">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-56 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>
        <div className="divide-y">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Maintenance skeleton ─────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — h1+p header + 4 stat cards + card with search + service list
export function MaintenanceSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-12 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b flex-wrap">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
          <Skeleton className="h-10 w-56 rounded-md" />
        </div>
        <div className="divide-y">
          {Array(6).fill(null).map((_, i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-64 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Logs skeleton ───────────────────────────────────────────────────
// min-h-screen p-4 sm:p-6 — header+btns + 5 category tiles + filter card + 2-col layout
export function ActivityLogsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      {/* 5 category tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Array(5).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-7 w-8 rounded" />
            </div>
            <Skeleton className="h-3 w-16 rounded mx-auto" />
          </SkeletonCard>
        ))}
      </div>
      {/* Filter card */}
      <SkeletonCard>
        <div className="flex flex-wrap gap-3 items-end">
          <Skeleton className="h-10 flex-1 min-w-[200px] rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </SkeletonCard>
      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCard>
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <div className="space-y-4 pt-2">
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="flex gap-3 items-start pl-4">
                  <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-1" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2 flex-wrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
        <div className="space-y-4">
          <SkeletonCard>
            <Skeleton className="h-5 w-28 rounded mb-2" />
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-3.5 w-8 rounded" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

// ─── Insurance skeleton ───────────────────────────────────────────────────────
// p-6 md:p-8 max-w-7xl — PageHeader + 4 stats + tabs (Policies / Claims) + list rows
export function InsuranceSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-7 w-16 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-4 p-4 border-b last:border-0">
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3.5 w-48 rounded" />
            </div>
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Plans skeleton ───────────────────────────────────────────────────────────
// p-4 sm:p-6 lg:p-8 — h1+p header + 4-col pricing cards
export function PlansSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-7 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-3.5 w-40 rounded" />
              <Skeleton className="h-9 w-24 rounded" />
            </div>
            <div className="space-y-2">
              {Array(5).fill(null).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-3.5 flex-1 rounded" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team Management skeleton ─────────────────────────────────────────────────
// p-6 md:p-8 max-w-7xl — PageHeader + 4 stats + search+filter+btn card + member list
export function TeamManagementSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(null).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-10 rounded" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      {/* Toolbar card */}
      <SkeletonCard>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </SkeletonCard>
      {/* Member list card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {Array(6).fill(null).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 p-4 border-b last:border-0">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3.5 w-48 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings skeleton ────────────────────────────────────────────────────────
// p-6 md:p-8 max-w-4xl — PageHeader + tabs row + profile card (avatar+fields)
export function SettingsSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        {Array(4).fill(null).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      {/* Profile card */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-4 w-44 rounded" />
        </div>
        {/* Avatar row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-3.5 w-48 rounded" />
          </div>
        </div>
        {/* Form fields 2-col */}
        <div className="grid md:grid-cols-2 gap-4">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Auth page skeletons (login/signup/forgot-password) ───────────────────────
export function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <Skeleton className="h-10 w-48 mx-auto rounded mb-2" />
          <Skeleton className="h-4 w-64 mx-auto rounded" />
        </div>
        
        {/* Form card */}
        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6">
          {/* Form fields */}
          <div className="space-y-4">
            {Array(3).fill(null).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-4 w-32 mx-auto rounded" />
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-px flex-1" />
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-px flex-1" />
          </div>
          
          {/* Social buttons */}
          <div className="space-y-3">
            {Array(2).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Bottom link */}
        <div className="text-center mt-6">
          <Skeleton className="h-4 w-56 mx-auto rounded" />
        </div>
      </div>
    </div>
  );
}
