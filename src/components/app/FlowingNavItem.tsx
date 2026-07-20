import React from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { Badge } from "@/components/ui/badge";
import { VariableFontText } from "@/components/app/VariableFontText";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  to: string;
  active: boolean;
  collapsed: boolean;
  badge?: string;
  dataTour?: string;
  /** Names scrolled in the hover marquee — the group's sections. Falls back to the label. */
  marqueeItems?: string[];
};

/**
 * Sidebar nav row in the "flowing menu" style: hovering slides a mint
 * marquee band in from the nearest vertical edge. The label itself stays
 * above the band at all times (flipping to ink for contrast), so the row
 * remains readable at every point of the animation.
 */
export function FlowingNavItem({ label, to, active, collapsed, badge, dataTour, marqueeItems }: Props) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const marqueeRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);

  const edgeOf = (ev: React.MouseEvent) => {
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return "top";
    return ev.clientY - rect.top < rect.height / 2 ? "top" : "bottom";
  };

  const killRunning = () => {
    tlRef.current?.kill();
    if (marqueeRef.current && innerRef.current) {
      gsap.killTweensOf([marqueeRef.current, innerRef.current]);
    }
  };

  const enter = (ev: React.MouseEvent) => {
    if (active || !marqueeRef.current || !innerRef.current) return;
    const edge = edgeOf(ev);
    killRunning();
    tlRef.current = gsap.timeline({ defaults: { duration: 0.4, ease: "expo.out", overwrite: "auto" } })
      .set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .set(innerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0)
      .to([marqueeRef.current, innerRef.current], { y: "0%" }, 0);
  };

  const leave = (ev: React.MouseEvent) => {
    if (active || !marqueeRef.current || !innerRef.current) return;
    const edge = edgeOf(ev);
    killRunning();
    tlRef.current = gsap.timeline({ defaults: { duration: 0.4, ease: "expo.out", overwrite: "auto" } })
      .to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .to(innerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0);
  };

  if (collapsed) {
    return (
      <Link
        to={to}
        data-tour={dataTour}
        title={label}
        className={cn(
          "mx-auto my-1 flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-colors",
          active
            ? "bg-[--fusion-mint] text-[--fusion-ink]"
            : "bg-sidebar-accent/60 text-sidebar-foreground/80 hover:bg-sidebar-accent",
        )}
      >
        {label.slice(0, 1)}
      </Link>
    );
  }

  const words = marqueeItems && marqueeItems.length > 0 ? marqueeItems : [label];
  // Repeat the word list enough times to guarantee the band is wider than the row.
  const repeats = Math.max(2, Math.ceil(12 / words.length));
  const marqueeChunk = (
    <div className="flex items-center" aria-hidden="true">
      {Array.from({ length: repeats }).flatMap((_, r) =>
        words.map((w, i) => (
          <React.Fragment key={`${r}-${i}`}>
            <span className="px-3">{w}</span>
            <span>✦</span>
          </React.Fragment>
        )),
      )}
    </div>
  );

  return (
    <div
      ref={rowRef}
      className={cn(
        "group relative overflow-hidden border-b border-sidebar-border/40 last:border-b-0",
        active && "bg-[--fusion-mint]",
      )}
    >
      <Link
        to={to}
        data-tour={dataTour}
        onMouseEnter={enter}
        onMouseLeave={leave}
        className={cn(
          "relative z-10 flex h-10 items-center justify-between px-4 text-[11px] font-black uppercase tracking-[0.12em] transition-opacity duration-200",
          active
            ? "text-[--fusion-ink]"
            : "text-sidebar-foreground group-hover:opacity-0",
        )}
      >
        <VariableFontText text={label} base={600} hover={900} className="truncate" />
        {badge && (
          <Badge className="ml-2 h-4 border-0 bg-[--fusion-grape] px-1.5 py-0 text-[9px] font-black tracking-wide text-white">
            {badge}
          </Badge>
        )}
      </Link>
      {!active && (
        <div
          ref={marqueeRef}
          className="pointer-events-none absolute inset-0 z-0 translate-y-[101%] overflow-hidden bg-[#ADFFBC]"
        >
          <div ref={innerRef} className="h-full w-full translate-y-[-101%]">
            <div
              className="flex h-full w-max items-center whitespace-nowrap text-[11px] font-black uppercase tracking-[0.12em] text-[#12210f]"
              style={{ animation: "gh-flow-marquee 9s linear infinite" }}
            >
              {marqueeChunk}
              {marqueeChunk}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
