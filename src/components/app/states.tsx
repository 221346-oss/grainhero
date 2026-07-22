/**
 * Phase 1 — Shared Empty / Error / Loading primitives.
 *
 * Every list & detail page must use these so tone and spacing stay
 * consistent across the app. Colors come from theme tokens; nothing
 * hardcoded.
 */
import { AlertCircle, Inbox, Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { PlanFeature } from "@/lib/plan-gate";

interface StateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: StateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          {icon ?? <Inbox className="h-6 w-6" />}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md">{description}</p>
          )}
        </div>
        {action && (
          <Button size="sm" variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <Card className={cn("border-destructive/40", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-md">{description}</p>
          )}
        </div>
        {action && (
          <Button size="sm" variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InlineLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

/**
 * Compact banner shown when a tenant has hit or is close to a plan cap.
 * Reads from `usePlanGate` in the caller; this component is purely visual.
 */
export function PlanLimitBanner({
  feature,
  used,
  limit,
  className,
  message,
}: {
  feature: PlanFeature;
  used?: number;
  limit?: number | boolean;
  className?: string;
  message?: string;
}) {
  const numericLimit = typeof limit === "number" ? limit : undefined;
  const label = message
    ?? (numericLimit != null && used != null
      ? `${feature.replace(/^max_/, "")} limit reached (${used}/${numericLimit}).`
      : `${feature.replace(/^max_/, "")} not included in your plan.`);
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <Lock className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/plan-management">Upgrade</Link>
      </Button>
    </div>
  );
}
