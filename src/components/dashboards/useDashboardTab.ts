import { useEffect, useState } from "react";

export type TabKey =
  | "overview" | "silos" | "batches" | "alerts" | "actuators"
  | "sensors" | "buyers" | "marketplace" | "orders" | "team"
  | "ai-predictions" | "ai-spoilage" | "ai-insights";

const KEY = "gh_dash_tab";
const EVT = "gh_dash_tab_changed";

export function readTab(): TabKey {
  if (typeof window === "undefined") return "overview";
  return (sessionStorage.getItem(KEY) as TabKey) || "overview";
}

export function setTab(t: TabKey) {
  sessionStorage.setItem(KEY, t);
  window.dispatchEvent(new CustomEvent(EVT, { detail: t }));
}

export function useDashboardTab(): [TabKey, (t: TabKey) => void] {
  const [tab, setLocal] = useState<TabKey>("overview");
  useEffect(() => {
    setLocal(readTab());
    const on = () => setLocal(readTab());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return [tab, setTab];
}