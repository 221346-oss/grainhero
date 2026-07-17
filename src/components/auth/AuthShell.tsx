import { Link } from "@tanstack/react-router";
import { Wheat, Sun, Moon } from "lucide-react";
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

export function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const styles =
    msg.type === "error"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
      : msg.type === "success"
        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  return <div className={`text-sm border rounded-md p-3 ${styles}`}>{msg.text}</div>;
}
