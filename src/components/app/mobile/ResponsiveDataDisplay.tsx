import { ReactNode } from "react";

/**
 * Responsive wrapper that hides content on mobile and desktop appropriately
 * Use this to wrap desktop-only tables and complex layouts
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

/**
 * Responsive wrapper that shows mobile-friendly alternative on mobile
 * Use this to provide mobile-friendly alternatives to complex layouts
 */
export function MobileOnly({ children }: { children: ReactNode }) {
  return <div className="block md:hidden">{children}</div>;
}

/**
 * Responsive table wrapper - automatically adjusts for mobile
 * Desktop: full table with all columns
 * Mobile: card-based layout (handled by AdminPageShell)
 */
export function ResponsiveTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-background overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * Responsive grid that stacks on mobile
 * Desktop: multiple columns
 * Mobile: single column
 */
export function ResponsiveGrid({
  children,
  desktopCols = "grid-cols-3",
  className = "",
}: {
  children: ReactNode;
  desktopCols?: string;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:${desktopCols} gap-3 md:gap-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Hide scrollable overflow container content appropriately
 * Used for tables that need horizontal scroll on desktop but are reformatted on mobile
 */
export function ScrollableTableWrapper({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hidden md:block overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}
