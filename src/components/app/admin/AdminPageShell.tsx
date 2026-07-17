import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageShell({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-screen p-4 sm:p-6 space-y-5 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30",
        className,
      )}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}