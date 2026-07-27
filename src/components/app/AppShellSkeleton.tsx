import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

/**
 * Full app-chrome skeleton shown on the very first paint of the authenticated
 * layout (before `_authenticated/route.tsx` finishes its auth check). Renders
 * a collapsed sidebar rail + sticky topbar + a slot for a per-page body
 * skeleton so nothing on screen is empty during boot.
 *
 * On subsequent navigations the real sidebar/topbar stay mounted and only
 * the per-page skeleton swaps — see the `gh_shell_ready` flag in router.tsx.
 */
export function AppShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar rail */}
      <aside className="w-16 shrink-0 border-r border-border/40 flex flex-col items-center py-3 gap-2">
        <Skeleton className="h-9 w-9 rounded-xl mb-2" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-xl" />
        ))}
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 mx-2 sm:mx-3 mt-2 rounded-2xl bg-background/90 backdrop-blur-md px-3 sm:px-6 shadow-lg shadow-black/5 sticky top-2 z-30 flex items-center gap-2 sm:gap-3">
          <Skeleton className="flex-1 h-9 max-w-2xl mx-auto rounded-full" />
          <div className="hidden md:flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>

        {/* Body slot */}
        <main className="flex-1 overflow-x-hidden">
          {children ?? <AppShellBodyFallback />}
        </main>
      </div>
    </div>
  );
}

function AppShellBodyFallback() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card p-4 h-72">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
