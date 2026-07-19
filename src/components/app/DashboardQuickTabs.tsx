import { useEffect, useState } from "react";
import { useRouterState, useNavigate, Link } from "@tanstack/react-router";
import {
  LayoutDashboard, Container, Wheat, Bell, Store, Radio,
  ToggleRight, Users, Package, UserCog, Settings2, Check, Sparkles,
  Brain, ShieldAlert, LineChart, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardTab, type TabKey } from "@/components/dashboards/useDashboardTab";

type Def = { key: TabKey; label: string; icon: LucideIcon; to?: string };

const CATALOG: Def[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "silos", label: "Silos", icon: Container },
  { key: "batches", label: "Batches", icon: Wheat },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "marketplace", label: "Marketplace", icon: Store },
  { key: "sensors", label: "Sensors", icon: Radio },
  { key: "actuators", label: "Actuators", icon: ToggleRight },
  { key: "buyers", label: "Buyers", icon: Users },
  { key: "orders", label: "Orders", icon: Package },
  { key: "team", label: "Team", icon: UserCog },
];

const AI_TABS: Def[] = [
  { key: "ai-predictions", label: "Predictions", icon: Brain, to: "/ai-predictions" },
  { key: "ai-spoilage", label: "Spoilage", icon: ShieldAlert, to: "/ai-spoilage-detection" },
  { key: "ai-insights", label: "Insights", icon: LineChart, to: "/ai-insights" },
];

const STORAGE = "gh_admin_tabs_v2";
const DEFAULT: TabKey[] = ["overview", "silos", "batches", "alerts", "marketplace"];

function readStored(): TabKey[] {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as TabKey[];
    return parsed.length ? parsed.slice(0, 5) : DEFAULT;
  } catch { return DEFAULT; }
}

export function DashboardQuickTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [active, setActive] = useDashboardTab();
  const [tabs, setTabs] = useState<TabKey[]>(DEFAULT);
  useEffect(() => { setTabs(readStored()); }, []);

  if (path !== "/dashboard") return null;

  function toggle(k: TabKey) {
    setTabs((cur) => {
      const has = cur.includes(k);
      let next = has ? cur.filter((x) => x !== k) : [...cur, k];
      if (!has && next.length > 5) next = next.slice(-5);
      if (!next.includes("overview")) next = (["overview", ...next] as TabKey[]).slice(0, 5);
      localStorage.setItem(STORAGE, JSON.stringify(next));
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {tabs.map((k) => {
          const def = CATALOG.find((d) => d.key === k);
          if (!def) return null;
          const Icon = def.icon;
          const isActive = active === k;
          const btn = (
            <button
              type="button"
              onClick={() => setActive(k)}
              className={
                "h-8 inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition " +
                (isActive
                  ? "bg-emerald-600 text-white px-3 shadow-sm"
                  : "w-8 justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10")
              }
              aria-label={def.label}
            >
              <Icon className="h-3.5 w-3.5" />
              {isActive && <span>{def.label}</span>}
            </button>
          );
          return isActive ? (
            <span key={k}>{btn}</span>
          ) : (
            <Tooltip key={k}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">{def.label}</TooltipContent>
            </Tooltip>
          );
        })}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Customize tabs"
              className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">Show tabs (max 5)</p>
            <div className="grid gap-0.5">
              {CATALOG.map((t) => {
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
                    <span className="inline-flex items-center gap-2">
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                      {locked && <span className="ml-1 text-[9px] text-muted-foreground">pinned</span>}
                    </span>
                    {checked && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-2 h-6 w-px bg-border" aria-hidden />

        <div className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-1 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mr-1">AI</span>
          {AI_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Tooltip key={t.key}>
                <TooltipTrigger asChild>
                  <Link
                    to={t.to!}
                    aria-label={t.label}
                    onClick={() => navigate({ to: t.to! })}
                    className="h-6 w-6 grid place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    <Icon className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">{t.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}