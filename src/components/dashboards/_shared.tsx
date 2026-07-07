import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {badge && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{badge}</Badge>}
    </div>
  );
}

const accentMap: Record<string, string> = {
  emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-600",
  amber: "from-amber-500/10 to-amber-500/0 text-amber-600",
  sky: "from-sky-500/10 to-sky-500/0 text-sky-600",
  violet: "from-violet-500/10 to-violet-500/0 text-violet-600",
  rose: "from-rose-500/10 to-rose-500/0 text-rose-600",
};

export function StatCard({
  label, value, icon: Icon, trend, accent = "emerald",
}: {
  label: string; value: string | number; icon: LucideIcon;
  trend?: string; accent?: "emerald" | "amber" | "sky" | "violet" | "rose";
}) {
  return (
    <Card className="relative overflow-hidden border-slate-200/70 shadow-sm">
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", accentMap[accent])} />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</CardTitle>
          <Icon className={cn("h-4 w-4", accentMap[accent].split(" ").pop())} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export function Placeholder({ note = "Wired up in Phase 4" }: { note?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
      {note}
    </div>
  );
}