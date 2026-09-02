import { useEffect } from "react";
import { applyTheme, getStoredTheme, applyThemeMode, getStoredThemeMode } from "@/lib/theme";

export function ThemeInit() {
  useEffect(() => {
    applyTheme(getStoredTheme());
    applyThemeMode(getStoredThemeMode()); // Respect stored preference
  }, []);
  return null;
}
