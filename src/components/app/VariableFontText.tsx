import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  /** Resting font weight. */
  base?: number;
  /** Weight letters reach on hover. */
  hover?: number;
  /** Per-letter stagger from the center outward, in ms. */
  staggerMs?: number;
};

/**
 * Variable-font hover text: on hover, each letter animates from its base
 * weight to bold, staggered outward from the center of the word.
 * Boldening also triggers when a parent <a>/<button> is hovered.
 */
export function VariableFontText({ text, className, base = 500, hover = 900, staggerMs = 25 }: Props) {
  const letters = Array.from(text);
  const mid = (letters.length - 1) / 2;
  return (
    <span
      className={cn("vfh inline-flex whitespace-pre", className)}
      aria-label={text}
      style={{ "--vfh-base": base, "--vfh-hover": hover } as React.CSSProperties}
    >
      {letters.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="vfh-letter"
          style={{ transitionDelay: `${Math.round(Math.abs(i - mid) * staggerMs)}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
