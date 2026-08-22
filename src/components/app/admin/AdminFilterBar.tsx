import type { ReactNode, FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminFilterBar({
  children,
  onSubmit,
  submitLabel = "Filter",
}: {
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
}) {
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
            {submitLabel}
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
  return (
    <div className={width}>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}