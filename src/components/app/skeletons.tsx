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

export function ChartSkeleton({ className, height = "h-56" }: { className?: string; height?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 space-y-3", className)}>
      <Bar className="h-3 w-32" />
      <div className={cn("flex items-end gap-2", height)}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-md bg-slate-200/70 animate-pulse" style={{ height: `${20 + ((i * 37) % 80)}%` }} />
        ))}
      </div>
      <div className="flex justify-between">
        <Bar className="h-2 w-10" />
        <Bar className="h-2 w-10" />
      </div>
    </div>
  );
}

/**
 * Unified per-page loading skeleton — pick the variant that matches the page shape:
 * - dashboard: header + stat tiles + widget cards (used by /dashboard, super-admin, manager, technician).
 * - table:    filter bar + tabular rows (used by list pages: silos, batches, sensors, tenants, users…).
 * - insight:  stat strip + charts (analytics, revenue, pipeline, health…).
 * - form:     labelled fields + supporting cards (settings, plans editor, subscription…).
 */
export function PageSkeleton({
  variant = "dashboard",
  className,
}: {
  variant?: "dashboard" | "table" | "insight" | "form";
  className?: string;
}) {
  if (variant === "table") {
    return (
      <div className={cn("p-4 md:p-6 space-y-4", className)}>
        <div className="flex items-center justify-between gap-3">
          <Bar className="h-6 w-40" />
          <Bar className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex gap-2"><Bar className="h-9 w-64 rounded-md" /><Bar className="h-9 w-28 rounded-md" /></div>
        <TableSkeleton rows={8} cols={5} />
      </div>
    );
  }
  if (variant === "insight") {
    return (
      <div className={cn("p-4 md:p-6 space-y-4", className)}>
        <Bar className="h-6 w-48" />
        <StatsSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }
  if (variant === "form") {
    return (
      <div className={cn("p-4 md:p-6 grid gap-4 lg:grid-cols-3", className)}>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <FormSkeleton fields={6} />
        </div>
        <div className="space-y-4"><CardsSkeleton count={2} /></div>
      </div>
    );
  }
  // dashboard
  return (
    <div className={cn("p-4 md:p-6 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Bar className="h-9 w-9 rounded-lg" />
        <div className="space-y-2"><Bar className="h-4 w-40" /><Bar className="h-2 w-24" /></div>
      </div>
      <StatsSkeleton count={6} />
      <CardsSkeleton count={3} />
    </div>
  );
}