import { useEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export function ThemeInit() {
  useEffect(() => { applyTheme(getStoredTheme()); }, []);
  return null;
}