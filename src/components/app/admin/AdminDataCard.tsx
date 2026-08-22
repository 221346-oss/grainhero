import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminDataCard({
  title,
  description,
  children,
  page,
  totalPages,
  onPageChange,
  maxHeight = "max-h-[520px]",
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn("overflow-auto", maxHeight)}>{children}</div>
        {totalPages && totalPages > 1 && page !== undefined && onPageChange && (
          <div className="flex items-center justify-between p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}