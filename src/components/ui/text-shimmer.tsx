'use client'

/**
 * @author: @shatlyk1011
 * @description: Text Shimmer Component
 * @version: 1.0.0
 * @date: 2026-02-04
 * @license: MIT
 * @website: https://emerald-ui.com
 */
// @keyframes shimmer is registered in src/styles.css
import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  as?: string;
  duration?: number;
  spread?: number;
  /** Base (dim) color of the sweep. Defaults to var(--muted-foreground). */
  baseColor?: string;
  /** Peak (bright) color of the sweep. Defaults to var(--foreground). */
  peakColor?: string;
  children: React.ReactNode | string;
} & React.HTMLAttributes<HTMLElement>;

export default function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  baseColor = "var(--muted-foreground)",
  peakColor = "var(--foreground)",
  children = "Default Text",
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 55);
  const Component = as as React.ElementType;

  return (
    <Component
      className={cn(
        "bg-size-[200%_auto] bg-clip-text font-medium text-transparent",
        "animate-[shimmer_4s_infinite_linear]",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(to right, ${baseColor} ${50 - dynamicSpread}%, ${peakColor} 50%, ${baseColor} ${50 + dynamicSpread}%)`,
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
