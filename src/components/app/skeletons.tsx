import { cn } from "@/lib/utils";
import { Wheat } from "lucide-react";

/**
 * Branded Loader featuring the GrainHero logo in the center and a spinning green ring.
 * Replaces generic grey pulse skeletons for a premium loading experience.
 */
export function BrandedLoader({
  fullScreen = true,
  text = "Loading your dashboard…"
}: {
  fullScreen?: boolean;
  text?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center transition-all duration-300",
      fullScreen 
        ? "min-h-screen bg-gradient-to-br from-emerald-50/40 to-sky-50/40" 
        : "h-[320px] w-full bg-transparent"
    )}>
      <div className="flex flex-col items-center gap-4">
        {/* Centered Logo with green ring around it */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-[#00a63e] flex items-center justify-center shadow-lg shadow-emerald-100">
            <Wheat className="h-9 w-9 text-white animate-[pulse_2s_infinite]" />
          </div>
          {/* Spinning green ring */}
          <div className="absolute -inset-1.5 rounded-[18px] border-2 border-emerald-100 border-t-[#00a63e] animate-[spin_1.2s_linear_infinite]" />
        </div>

        {/* Brand details */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">GrainHero</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">{text}</p>
        </div>

        {/* Dynamic progress bar */}
        <div className="w-36 h-1 bg-emerald-100 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-gradient-to-r from-[#00a63e] to-emerald-400 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton({ className }: { count?: number; className?: string }) {
  return <BrandedLoader fullScreen={false} text="Loading stats…" />;
}

export function ListSkeleton({ className }: { rows?: number; className?: string }) {
  return <BrandedLoader fullScreen={false} text="Loading list details…" />;
}

export function TableSkeleton({ className }: { rows?: number; cols?: number; className?: string }) {
  return <BrandedLoader fullScreen={false} text="Loading table data…" />;
}

export function CardsSkeleton({ className }: { count?: number; className?: string }) {
  return <BrandedLoader fullScreen={false} text="Loading cards…" />;
}

export function FormSkeleton({ className }: { fields?: number; className?: string }) {
  return <BrandedLoader fullScreen={false} text="Loading form fields…" />;
}

export function DashboardSkeleton() {
  return <BrandedLoader fullScreen={false} text="Loading dashboard modules…" />;
}

export function InlineListSkeleton() {
  return <BrandedLoader fullScreen={false} text="Syncing latest info…" />;
}