import {
  Ban,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  EyeOff,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

/**
 * Icons for the AnimatedDrawer demo.
 *
 * All of these sit next to visible text labels, so they are decorative and are
 * marked aria-hidden — the adjacent copy is the accessible name.
 */

/* --- Inline list-row icons (18px, inherit row colour) --- */

export const LockIcon = ({ className }: IconProps) => (
  <Lock aria-hidden="true" size={18} className={cn("shrink-0", className)} />
);

export const PassIcon = ({ className }: IconProps) => (
  <KeyRound aria-hidden="true" size={18} className={cn("shrink-0", className)} />
);

export const WarningIcon = ({ className }: IconProps) => (
  <TriangleAlert
    aria-hidden="true"
    size={18}
    className={cn("shrink-0", className)}
  />
);

/* --- Bullet icons inside the "how to stay safe" list (20px, muted) --- */

export const ShieldIcon = ({ className }: IconProps) => (
  <ShieldCheck
    aria-hidden="true"
    size={20}
    className={cn("shrink-0 text-neutral-400 dark:text-neutral-500", className)}
  />
);

export const PhraseIcon = ({ className }: IconProps) => (
  <EyeOff
    aria-hidden="true"
    size={20}
    className={cn("shrink-0 text-neutral-400 dark:text-neutral-500", className)}
  />
);

export const BannedIcon = ({ className }: IconProps) => (
  <Ban
    aria-hidden="true"
    size={20}
    className={cn("shrink-0 text-neutral-400 dark:text-neutral-500", className)}
  />
);

/* --- Icon shown inside the confirm button (inherits button text colour) --- */

export const FaceIDIcon = ({ className }: IconProps) => (
  <Fingerprint
    aria-hidden="true"
    size={20}
    className={cn("shrink-0", className)}
  />
);

/* --- Large "hero" badges at the top of a panel (48px tinted circle) --- */

const HeroBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      "flex size-12 shrink-0 items-center justify-center rounded-full",
      className,
    )}
  >
    {children}
  </div>
);

export const DangerIcon = ({ className }: IconProps) => (
  <HeroBadge className={cn("bg-red-50 dark:bg-red-900/20", className)}>
    <Trash2 size={24} className="text-red-500 dark:text-red-400" />
  </HeroBadge>
);

export const RecoveryPhraseIcon = ({ className }: IconProps) => (
  <HeroBadge className={cn("bg-sky-50 dark:bg-sky-900/20", className)}>
    <ShieldAlert size={24} className="text-sky-500 dark:text-sky-400" />
  </HeroBadge>
);
