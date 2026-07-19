import { useEffect, useState } from "react";
import { Settings2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TabKey =
  | "overview" | "silos" | "batches" | "alerts" | "actuators"
  | "sensors" | "buyers" | "marketplace" | "orders" | "team";

export const TAB_CATALOG: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "silos", label: "Silos" },
  { key: "batches", label: "Batches" },
  { key: "alerts", label: "Alerts" },
  { key: "actuators", label: "Actuators" },
  { key: "sensors", label: "Sensors" },
  { key: "buyers", label: "Buyers" },
  { key: "marketplace", label: "Marketplace" },
  { key: "orders", label: "Orders" },
  { key: "team", label: "Team" },
];

const STORAGE_KEY = "gh_admin_tabs";
const DEFAULT: TabKey[] = ["overview", "silos", "batches", "alerts", "marketplace"];

function readStored(): TabKey[] {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as TabKey[];
    return parsed.length ? parsed.slice(0, 5) : DEFAULT;
  } catch { return DEFAULT; }
}

export function DashTabs({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const [tabs, setTabs] = useState<TabKey[]>(DEFAULT);
  useEffect(() => { setTabs(readStored()); }, []);

  function toggle(k: TabKey) {
    setTabs((cur) => {
      const has = cur.includes(k);
      let next = has ? cur.filter((x) => x !== k) : [...cur, k];
      if (!has && next.length > 5) next = next.slice(-5);
      if (!next.includes("overview")) next = (["overview", ...next] as TabKey[]).slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((k) => {
          const t = TAB_CATALOG.find((x) => x.key === k);
          if (!t) return null;
          const isActive = active === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={
                "shrink-0 px-3 h-8 rounded-full text-xs font-medium transition whitespace-nowrap " +
                (isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Customize tabs"
            className="shrink-0 h-8 w-8 grid place-items-center rounded-full border hover:border-emerald-500/50 hover:text-emerald-600 transition"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">Show tabs (max 5)</p>
          <div className="grid gap-0.5">
            {TAB_CATALOG.map((t) => {
              const checked = tabs.includes(t.key);
              const locked = t.key === "overview";
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(t.key)}
                  className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted disabled:opacity-60"
                >
                  <span>{t.label}{locked && <span className="ml-1 text-[9px] text-muted-foreground">pinned</span>}</span>
                  {checked && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}