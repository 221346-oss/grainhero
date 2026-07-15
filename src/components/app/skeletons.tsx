import { cn } from "@/lib/utils";

// Lightweight grey pulse skeletons (previous version restored).
function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Bar className="h-3 w-20" />
          <Bar className="h-7 w-24" />
          <Bar className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
          <Bar className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      <div className="grid gap-2 p-3 border-b border-slate-100" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <Bar key={i} className="h-3" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-2 p-3 border-b border-slate-50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => <Bar key={c} className="h-3" />)}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Bar className="h-24 w-full" />
          <Bar className="h-4 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      <CardsSkeleton count={2} />
    </div>
  );
}

export function InlineListSkeleton() {
  return <ListSkeleton rows={3} />;
}