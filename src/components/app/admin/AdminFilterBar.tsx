import type { ReactNode, FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { translateText, useI18n } from "@/i18n";

export function AdminFilterBar({
  children,
  onSubmit,
  submitLabel = "Filter",
}: {
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
}) {
  const { locale } = useI18n();
  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(e);
          }}
          className="flex flex-wrap gap-3 items-end"
        >
          {children}
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {translateText(submitLabel, locale)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminFilterField({
  label,
  children,
  width = "w-40",
}: {
  label: string;
  children: ReactNode;
  width?: string;
}) {
  const { locale } = useI18n();
  return (
    <div className={width}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{translateText(label, locale)}</label>
      {children}
    </div>
  );
}
