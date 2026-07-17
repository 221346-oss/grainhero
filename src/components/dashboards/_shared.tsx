import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{subtitle}</p>}
      </div>
      {badge && (
        <Badge variant="outline" className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
          {badge}
        </Badge>
      )}
    </div>
  );
}

export function StatCard({
  label, value, trend,
}: {
  label: string; value: string | number; icon?: LucideIcon;
  trend?: string; accent?: "emerald" | "amber" | "sky" | "violet" | "rose";
}) {
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
        {trend && <p className="mt-1 text-[10px] text-slate-400">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export function Placeholder({ note = "Wired up in Phase 4" }: { note?: string }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500")}>
      {note}
    </div>
  );
}