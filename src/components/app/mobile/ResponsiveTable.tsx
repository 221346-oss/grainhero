import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-responsive table wrapper
 * On mobile: Horizontal scroll with min-w constraint
 * On desktop: Normal table layout
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("border border-border rounded-md overflow-hidden", className)}>
      {/* Mobile: Horizontal scroll, Desktop: Normal flow */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm md:text-base">{children}</table>
      </div>
    </div>
  );
}

interface ResponsiveTableHeadProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableHead({ children, className }: ResponsiveTableHeadProps) {
  return <thead className={cn("border-b border-border bg-muted/30", className)}>{children}</thead>;
}

interface ResponsiveTableBodyProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export function ResponsiveTableBody({
  children,
  className,
  maxHeight = "max-h-[500px]",
}: ResponsiveTableBodyProps) {
  return (
    <tbody
      className={cn(
        "divide-y divide-border",
        maxHeight && `${maxHeight} overflow-y-auto`,
        className,
      )}
    >
      {children}
    </tbody>
  );
}

interface ResponsiveTableRowProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableRow({ children, className }: ResponsiveTableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
        className,
      )}
    >
      {children}
    </tr>
  );
}

interface ResponsiveTableCellProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  nowrap?: boolean;
}

export function ResponsiveTableCell({
  children,
  className,
  align = "left",
  nowrap = false,
}: ResponsiveTableCellProps) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <td
      className={cn(
        "px-3 py-2 md:px-4 md:py-3",
        alignClass,
        nowrap && "whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  );
}

interface ResponsiveTableHeaderCellProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export function ResponsiveTableHeaderCell({
  children,
  className,
  align = "left",
}: ResponsiveTableHeaderCellProps) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <th
      className={cn(
        "font-medium text-muted-foreground uppercase tracking-wide text-[11px] px-3 py-2 md:px-4 md:py-3",
        alignClass,
        className,
      )}
    >
      {children}
    </th>
  );
}

/**
 * Card-based table layout for mobile
 * Shows data as stacked cards instead of table rows
 */
interface MobileCardTableProps {
  data: Array<Record<string, any>>;
  renderCard: (item: Record<string, any>, index: number) => ReactNode;
  emptyMessage?: string;
}

export function MobileCardTable({
  data,
  renderCard,
  emptyMessage = "No data available",
}: MobileCardTableProps) {
  return (
    <div className="space-y-2 md:hidden">
      {data.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground border border-border rounded-md">
          {emptyMessage}
        </div>
      ) : (
        data.map((item, idx) => (
          <div key={idx} className="border border-border rounded-md p-3 bg-background">
            {renderCard(item, idx)}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Wrapper to make inline HTML tables mobile-responsive
 * Simply add this wrapper around raw HTML tables to make them scrollable on mobile
 */
interface MobileTableWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MobileTableWrapper({ children, className }: MobileTableWrapperProps) {
  return (
    <div className={cn("border border-border rounded-md overflow-hidden", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
