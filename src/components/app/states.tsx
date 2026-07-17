/**
 * Phase 1 — Shared Empty / Error / Loading primitives.
 *
 * Every list & detail page must use these so tone and spacing stay
 * consistent across the app. Colors come from theme tokens; nothing
 * hardcoded.
 */
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
