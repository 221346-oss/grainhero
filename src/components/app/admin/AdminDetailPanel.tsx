import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDetailPanel({
  title = "Details",
  emptyText = "Select a row to view details",
  children,
  isEmpty,
}: {
  title?: string;
  emptyText?: string;
  children: ReactNode;
  isEmpty: boolean;
}) {
  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </h4>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}