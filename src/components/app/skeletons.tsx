import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Content-shaped skeletons (LinkedIn / YouTube style).
 * Use these instead of a spinner while the initial page data loads.
 */

export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-slate-200/70">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("border-slate-200/70", className)}>
      <CardContent className="p-0 divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 8, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <Card className={cn("border-slate-200/70 overflow-hidden", className)}>
      <div className="p-4 border-b border-border/60 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 0 ? "w-24" : "flex-1")} />
        ))}
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-24" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CardsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-slate-200/70">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <Card className={cn("border-slate-200/70", className)}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <StatsSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-200/70">
          <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-56 w-full rounded-lg" /></CardContent>
        </Card>
        <Card className="border-slate-200/70">
          <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Section-level fallback for inline data blocks. */
export function InlineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}