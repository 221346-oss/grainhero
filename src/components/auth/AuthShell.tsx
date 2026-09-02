import { Link } from "@tanstack/react-router";
import { Wheat, Sun, Moon, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useEffect, type ReactNode } from "react";
import { getStoredThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";

export function AuthShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(getStoredThemeMode());
  }, []);

  const handleToggle = () => {
    const next = toggleThemeMode();
    setMode(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background transition-colors">
      <div className="w-full max-w-md">
        {/* Top bar: logo + theme toggle */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-foreground hover:text-[#00a63e] transition-colors"
          >
            <Wheat className="w-7 h-7 text-[#00a63e]" />
            <span className="text-xl font-bold tracking-wide">GrainHero</span>
          </Link>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <Card className="shadow-xl p-6">{children}</Card>
      </div>
    </div>
  );
}

export type Msg = { type: "success" | "error" | "info"; text: string } | null;

const messageVariants = {
  success: {
    Icon: CheckCircle2,
    shell: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500",
  },
  error: {
    Icon: AlertCircle,
    shell: "border-red-500/25 bg-red-500/[0.07] text-red-700 dark:text-red-300",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
    accent: "bg-red-500",
  },
  info: {
    Icon: Info,
    shell: "border-sky-500/25 bg-sky-500/[0.07] text-sky-700 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    accent: "bg-sky-500",
  },
} as const;

export function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const { Icon, shell, badge, accent } = messageVariants[msg.type];

  return (
    <div
      role={msg.type === "error" ? "alert" : "status"}
      aria-live={msg.type === "error" ? "assertive" : "polite"}
      className={`relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-300 ${shell}`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${accent}`} aria-hidden="true" />
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full ${badge}`}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-medium leading-snug tracking-[-0.005em]">{msg.text}</p>
    </div>
  );
}
