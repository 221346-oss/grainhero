import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ResponsiveTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-responsive tabs wrapper
 * On mobile: Tabs are horizontally scrollable
 * On desktop: Normal tabs layout
 */
export function ResponsiveTabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: ResponsiveTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {children}
    </Tabs>
  );
}

interface ResponsiveTabsListProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTabsList({ children, className }: ResponsiveTabsListProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <TabsList
        className={cn(
          "inline-flex h-auto w-max bg-transparent p-0 border-b border-border rounded-none gap-0",
          "md:h-10 md:bg-muted md:p-1 md:rounded-lg md:border-0 md:gap-1 md:w-full",
          className,
        )}
      >
        {children}
      </TabsList>
    </div>
  );
}

interface ResponsiveTabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function ResponsiveTabsTrigger({ children, value, className }: ResponsiveTabsTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "flex-shrink-0 px-4 py-2 rounded-none border-b-2 border-transparent text-sm whitespace-nowrap",
        "data-[state=active]:border-b-2 data-[state=active]:border-primary",
        "md:border-b-0 md:rounded-md md:px-3 md:py-1.5 md:text-sm",
        "md:bg-transparent md:data-[state=active]:bg-background",
        className,
      )}
    >
      {children}
    </TabsTrigger>
  );
}

interface ResponsiveTabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function ResponsiveTabsContent({ children, value, className }: ResponsiveTabsContentProps) {
  return (
    <TabsContent value={value} className={cn("mt-4 md:mt-2", className)}>
      {children}
    </TabsContent>
  );
}
