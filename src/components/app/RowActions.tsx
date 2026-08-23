import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

/**
 * Renders row actions as up to 3 inline icon buttons.
 * Any extras collapse into a "More" dropdown menu.
 * Use across every data table for a consistent, dark-mode-friendly UX.
 */
export function RowActions({
  actions,
  visible = 3,
  align = "end",
}: {
  actions: RowAction[];
  visible?: number;
  align?: "start" | "end";
}) {
  const shown = actions.filter((a) => !a.hidden);
  const inline = shown.slice(0, visible);
  const overflow = shown.slice(visible);

  return (
    <div
      className={cn("flex items-center gap-0.5", align === "end" ? "justify-end" : "justify-start")}
    >
      {inline.map((a, i) => {
        const Icon = a.icon;
        return (
          <Button
            key={i}
            size="icon"
            variant="ghost"
            title={a.label}
            aria-label={a.label}
            disabled={a.disabled}
            onClick={a.onClick}
            className={cn(
              "h-8 w-8",
              a.destructive &&
                "text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300",
              a.className,
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : a.label}
          </Button>
        );
      })}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {overflow.map((a, i) => {
              const Icon = a.icon;
              return (
                <DropdownMenuItem
                  key={i}
                  disabled={a.disabled}
                  onClick={a.onClick}
                  className={cn(
                    "gap-2 text-sm",
                    a.destructive && "text-rose-600 focus:text-rose-700 dark:text-rose-400",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {a.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
