import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translateText, useI18n } from "@/i18n";

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
  const { locale } = useI18n();
  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{translateText(title, locale)}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm">{translateText(emptyText, locale)}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {translateText(label, locale)}
      </h4>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}
