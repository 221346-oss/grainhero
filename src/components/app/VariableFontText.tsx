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

// Arabic-script ranges (Urdu, Arabic, Persian, etc.). Letters in these
// scripts JOIN contextually — splitting them into separate DOM elements
// breaks the shaping and words fall apart into disconnected letters.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Variable-font hover text: on hover, each letter animates from its base
 * weight to bold, staggered outward from the center of the word.
 * Boldening also triggers when a parent <a>/<button> is hovered.
 *
 * Arabic-script text (e.g. Urdu) is rendered as a single plain span so the
 * letters stay properly joined — the per-letter hover effect is Latin-only.
 */
export function VariableFontText({
  text,
  className,
  base = 500,
  hover = 900,
  staggerMs = 25,
}: Props) {
  // Urdu / Arabic script: never split — joined letters are mandatory.
  if (ARABIC_RE.test(text)) {
    return (
      <span
        className={cn("vfh vfh-urdu inline-flex whitespace-pre", className)}
        aria-label={text}
        style={{ "--vfh-base": base, "--vfh-hover": hover } as React.CSSProperties}
      >
        {text}
      </span>
    );
  }

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
