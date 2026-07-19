import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { InfoDot } from "@/components/ui/InfoDot";

export function PageHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-foreground">{title}</h1>
          {subtitle && <InfoDot text={subtitle} />}
        </div>
      </div>
      {badge && (
        <Badge variant="outline" className="shrink-0 font-semibold">
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
    <Card className="shadow-sm">
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-foreground leading-tight">{value}</div>
        <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
        {trend && <p className="mt-1 text-[10px] text-muted-foreground/70">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export function Placeholder({ note = "Wired up in Phase 4" }: { note?: string }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground")}>
      {note}
    </div>
  );
}