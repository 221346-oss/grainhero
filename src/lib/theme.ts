export type ThemeId = "fusion" | "aubergine" | "blue" | "jazz" | "clementine";

type ThemeVars = Record<string, string>;
export type ThemeDef = {
  id: ThemeId;
  name: string;
  swatch: string[]; // 2-3 hex for the picker preview
  light: ThemeVars;
  dark: ThemeVars;
};

// Each theme sets only the tokens that differ from the base. We override on :root
// (light) and .dark (dark) via a runtime <style> tag.
export const THEMES: ThemeDef[] = [
  {
    id: "fusion",
    name: "Electric Fusion",
    swatch: ["#DCF095", "#ADFFBC", "#C674F2"],
    light: {
      "--sidebar": "#DCF095",
      "--sidebar-primary": "#ADFFBC",
      "--fusion-lime": "#DCF095",
      "--fusion-mint": "#ADFFBC",
      "--fusion-grape": "#C674F2",
      "--gradient-fusion": "linear-gradient(135deg,#DCF095 0%,#ADFFBC 100%)",
      "--ring": "#C674F2",
    },
    dark: {
      "--sidebar": "#1a1f14",
      "--sidebar-foreground": "#DCF095",
      "--fusion-lime": "#DCF095",
      "--fusion-mint": "#ADFFBC",
      "--fusion-grape": "#C674F2",
    },
  },
  {
    id: "aubergine",
    name: "Aubergine",
    swatch: ["#3E1F47", "#8B5CF6", "#F0ABFC"],
    light: {
      "--sidebar": "#3E1F47",
      "--sidebar-foreground": "#F5E6FF",
      "--sidebar-primary": "#8B5CF6",
      "--sidebar-primary-foreground": "#FFFFFF",
      "--sidebar-accent": "rgba(240,171,252,0.18)",
      "--sidebar-accent-foreground": "#F5E6FF",
      "--sidebar-border": "rgba(255,255,255,0.10)",
      "--fusion-lime": "#F0ABFC",
      "--fusion-mint": "#8B5CF6",
      "--fusion-grape": "#F472B6",
      "--fusion-ink": "#FFFFFF",
      "--gradient-fusion": "linear-gradient(135deg,#8B5CF6 0%,#F472B6 100%)",
      "--ring": "#F472B6",
    },
    dark: {
      "--sidebar": "#2A1330",
      "--sidebar-foreground": "#F5E6FF",
      "--sidebar-primary": "#8B5CF6",
      "--sidebar-accent": "rgba(240,171,252,0.14)",
      "--fusion-lime": "#F0ABFC",
      "--fusion-mint": "#8B5CF6",
      "--fusion-grape": "#F472B6",
    },
  },
  {
    id: "blue",
    name: "Kind of Blue",
    swatch: ["#0F172A", "#38BDF8", "#A78BFA"],
    light: {
      "--sidebar": "#0F172A",
      "--sidebar-foreground": "#E0F2FE",
      "--sidebar-primary": "#38BDF8",
      "--sidebar-primary-foreground": "#0F172A",
      "--sidebar-accent": "rgba(56,189,248,0.18)",
      "--sidebar-accent-foreground": "#E0F2FE",
      "--sidebar-border": "rgba(255,255,255,0.08)",
      "--fusion-lime": "#38BDF8",
      "--fusion-mint": "#7DD3FC",
      "--fusion-grape": "#A78BFA",
      "--fusion-ink": "#0F172A",
      "--gradient-fusion": "linear-gradient(135deg,#38BDF8 0%,#A78BFA 100%)",
      "--ring": "#A78BFA",
    },
    dark: {
      "--sidebar": "#0B1220",
      "--sidebar-foreground": "#E0F2FE",
      "--sidebar-primary": "#38BDF8",
      "--fusion-lime": "#38BDF8",
      "--fusion-mint": "#7DD3FC",
      "--fusion-grape": "#A78BFA",
    },
  },
  {
    id: "jazz",
    name: "Jazz Club",
    swatch: ["#1F0A0A", "#B91C1C", "#F59E0B"],
    light: {
      "--sidebar": "#1F0A0A",
      "--sidebar-foreground": "#FEE2E2",
      "--sidebar-primary": "#B91C1C",
      "--sidebar-primary-foreground": "#FFF7ED",
      "--sidebar-accent": "rgba(245,158,11,0.16)",
      "--sidebar-accent-foreground": "#FEE2E2",
      "--sidebar-border": "rgba(255,255,255,0.08)",
      "--fusion-lime": "#F59E0B",
      "--fusion-mint": "#EF4444",
      "--fusion-grape": "#F97316",
      "--fusion-ink": "#1F0A0A",
      "--gradient-fusion": "linear-gradient(135deg,#B91C1C 0%,#F59E0B 100%)",
      "--ring": "#F97316",
    },
    dark: {
      "--sidebar": "#170707",
      "--sidebar-foreground": "#FEE2E2",
      "--fusion-lime": "#F59E0B",
      "--fusion-mint": "#EF4444",
      "--fusion-grape": "#F97316",
    },
  },
  {
    id: "clementine",
    name: "Clementine",
    swatch: ["#FFF7ED", "#EA580C", "#FDBA74"],
    light: {
      "--sidebar": "#FFEDD5",
      "--sidebar-foreground": "#431407",
      "--sidebar-primary": "#FDBA74",
      "--sidebar-primary-foreground": "#431407",
      "--sidebar-accent": "rgba(234,88,12,0.16)",
      "--sidebar-accent-foreground": "#431407",
      "--sidebar-border": "rgba(67,20,7,0.10)",
      "--fusion-lime": "#FDBA74",
      "--fusion-mint": "#FED7AA",
      "--fusion-grape": "#EA580C",
      "--fusion-ink": "#431407",
      "--gradient-fusion": "linear-gradient(135deg,#FDBA74 0%,#FB7185 100%)",
      "--ring": "#EA580C",
    },
    dark: {
      "--sidebar": "#1C0A03",
      "--sidebar-foreground": "#FED7AA",
      "--sidebar-primary": "#EA580C",
      "--fusion-lime": "#FDBA74",
      "--fusion-mint": "#FED7AA",
      "--fusion-grape": "#EA580C",
    },
  },
];

export const DEFAULT_THEME: ThemeId = "fusion";
const STORAGE_KEY = "gh-theme";

function buildCss(t: ThemeDef): string {
  const toBlock = (sel: string, vars: ThemeVars) =>
    `${sel}{${Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join("")}}`;
  return `${toBlock(":root", t.light)}${toBlock(".dark", t.dark)}`;
}

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  let tag = document.getElementById("app-theme") as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "app-theme";
    document.head.appendChild(tag);
  }
  tag.textContent = buildCss(t);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage can be unavailable (private mode); fall through to defaults
  }
  document.documentElement.dataset.theme = id;
}

export function getStoredTheme(): ThemeId {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  const v = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  return v && THEMES.some((t) => t.id === v) ? v : DEFAULT_THEME;
}

// Dark Mode Support
export type ThemeMode = "light" | "dark";
const MODE_STORAGE_KEY = "gh-theme-mode";

export function getStoredThemeMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "light";
  const mode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;
  if (mode === "dark" || mode === "light") return mode;
  // check system preference
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  if (mode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // storage can be unavailable (private mode); fall through to defaults
  }
}

export function toggleThemeMode(): ThemeMode {
  const current = getStoredThemeMode();
  const next = current === "dark" ? "light" : "dark";
  applyThemeMode(next);
  return next;
}
