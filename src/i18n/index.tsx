import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "./en";
import ur from "./ur";
import type { Translations } from "./en";

// ─── Supported languages ──────────────────────────────────────────────────
export type Locale = "en" | "ur";

export const LOCALES: { id: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl"; font: string }[] = [
  { id: "en", label: "English", nativeLabel: "English", dir: "ltr", font: "" },
  { id: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", font: "'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'Noto Sans', sans-serif" },
];

// ─── Translation map ──────────────────────────────────────────────────────
const translations: Record<Locale, Translations> = { en, ur };

const STORAGE_KEY = "gh-locale";

function getStoredLocale(): Locale {
  if (typeof localStorage === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return v && v in translations ? v : "en";
}

function applyLocaleToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const def = LOCALES.find((l) => l.id === locale);
  document.documentElement.lang = locale;
  // Keep the document direction LTR in every language so the layout stays
  // identical to the English design. Urdu words render correctly inside an
  // LTR layout via the browser's bidirectional text engine. Flipping the
  // document to RTL reverses per-letter animated labels (e.g. the sidebar's
  // VariableFontText) and mirrors the whole design, which users reported as
  // broken — so we never flip.
  document.documentElement.dir = "ltr";
  // Apply language-specific font
  if (def?.font) {
    document.documentElement.style.setProperty("--font-lang", def.font);
  } else {
    document.documentElement.style.removeProperty("--font-lang");
  }
}

// ─── Context ──────────────────────────────────────────────────────────────
type I18nContextValue = {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: en,
  setLocale: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyLocaleToDocument(next);
  }, []);

  // Apply on mount + whenever locale changes
  useEffect(() => {
    applyLocaleToDocument(locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, t: translations[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}

/**
 * Convenience hook that returns a typed `t` object.
 *
 * Supports simple interpolation: `t("dashboard.welcome", { name: "Ali" })`
 * replaces `{{name}}` in the string.
 */
export function useTranslation() {
  const { locale, t, setLocale } = useI18n();

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const lookup = (dict: Translations): string | null => {
        let result: unknown = dict;
        for (const part of key.split(".")) {
          if (result && typeof result === "object" && part in result) {
            result = (result as Record<string, unknown>)[part];
          } else {
            return null;
          }
        }
        return typeof result === "string" ? result : null;
      };
      // Prefer the active locale; fall back to English so a missing
      // translation never leaks a raw dotted key into the UI.
      const result = lookup(t) ?? lookup(en);
      if (result === null) return key;
      if (!params) return result;
      // Interpolate {{param}} placeholders
      return result.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        name in params ? String(params[name]) : `{{${name}}}`,
      );
    },
    [t],
  );

  return { t: translate, locale, setLocale, raw: t };
}
