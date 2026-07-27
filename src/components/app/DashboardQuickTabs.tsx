import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState, useNavigate, Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Container,
  Wheat,
  Bell,
  Store,
  Radio,
  ToggleRight,
  Users,
  Package,
  UserCog,
  Settings2,
  Check,
  type LucideIcon,
  DollarSign,
  CreditCard,
  MessageSquare,
  Activity,
  ScrollText,
  ClipboardList,
  TrendingUp,
  UserPlus,
  Shield,
  ShieldCheck,
  Rocket,
  Truck,
  ClipboardCheck,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { AlertCard } from "@/components/ui/alert-card";

const MAX_TABS = 5;

type AdminTabKey =
  | "overview"
  | "silos"
  | "batches"
  | "alerts"
  | "marketplace"
  | "sensors"
  | "actuators"
  | "buyers"
  | "orders"
  | "team";

type ManagerTabKey =
  | "overview"
  | "silos"
  | "batches"
  | "alerts"
  | "dispatch"
  | "qc"
  | "actuators"
  | "orders"
  | "team"
  | "sensors";

type SuperTabKey =
  | "overview"
  | "orders"
  | "financials"
  | "users"
  | "plans"
  | "reporting"
  | "health"
  | "audit-logs"
  | "system-logs"
  | "pipeline"
  | "leads"
  | "insurance"
  | "subscription"
  | "security"
  | "launch";

type TabKey = AdminTabKey | SuperTabKey | ManagerTabKey;

type Def<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
  to: string;
  search?: { tab: string };
};

const CATALOG_ADMIN: Def<AdminTabKey>[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
  {
    key: "silos",
    label: "Silos",
    icon: Container,
    to: "/grain-operations",
    search: { tab: "silos" },
  },
  {
    key: "batches",
    label: "Batches",
    icon: Wheat,
    to: "/grain-operations",
    search: { tab: "batches" },
  },
  { key: "alerts", label: "Alerts", icon: Bell, to: "/grain-alerts" },
  { key: "marketplace", label: "Marketplace", icon: Store, to: "/business" },
  { key: "sensors", label: "Sensors", icon: Radio, to: "/sensors" },
  { key: "actuators", label: "Actuators", icon: ToggleRight, to: "/actuators" },
  {
    key: "buyers",
    label: "Buyers",
    icon: Users,
    to: "/grain-operations",
    search: { tab: "buyers" },
  },
  { key: "orders", label: "Orders", icon: Package, to: "/orders" },
  { key: "team", label: "Team", icon: UserCog, to: "/team-management" },
];

const CATALOG_MANAGER: Def<ManagerTabKey>[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
  {
    key: "silos",
    label: "Silos",
    icon: Container,
    to: "/grain-operations",
    search: { tab: "silos" },
  },
  {
    key: "batches",
    label: "Batches",
    icon: Wheat,
    to: "/grain-operations",
    search: { tab: "batches" },
  },
  { key: "alerts", label: "Alerts", icon: Bell, to: "/grain-alerts" },
  {
    key: "dispatch",
    label: "Dispatch",
    icon: Truck,
    to: "/grain-operations",
    search: { tab: "silos" },
  },
  {
    key: "qc",
    label: "QC",
    icon: ClipboardCheck,
    to: "/grain-operations",
    search: { tab: "batches" },
  },
  { key: "actuators", label: "Actuators", icon: ToggleRight, to: "/actuators" },
  { key: "orders", label: "Orders", icon: Package, to: "/orders" },
  { key: "sensors", label: "Sensors", icon: Radio, to: "/sensors" },
  { key: "team", label: "Team", icon: UserCog, to: "/team-management" },
];

const CATALOG_SUPER: Def<SuperTabKey>[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, to: "/dashboard" },
  { key: "orders", label: "Install Orders", icon: Package, to: "/platform/orders" },
  { key: "financials", label: "Financials", icon: DollarSign, to: "/platform/financials" },
  { key: "users", label: "Users", icon: Users, to: "/platform/users" },
  { key: "plans", label: "Plans", icon: CreditCard, to: "/platform/plans" },
  { key: "reporting", label: "Reporting", icon: MessageSquare, to: "/platform/reporting" },
  { key: "health", label: "Health", icon: Activity, to: "/platform/health" },
  { key: "audit-logs", label: "Audit logs", icon: ScrollText, to: "/platform/audit-logs" },
  { key: "system-logs", label: "System logs", icon: ClipboardList, to: "/platform/logs" },
  { key: "pipeline", label: "Pipeline", icon: TrendingUp, to: "/platform/pipeline" },
  { key: "leads", label: "Leads", icon: UserPlus, to: "/platform/leads" },
  { key: "insurance", label: "Insurance", icon: Shield, to: "/insurance" },
  { key: "subscription", label: "Subscriptions", icon: CreditCard, to: "/subscription" },
  { key: "security", label: "Security", icon: ShieldCheck, to: "/security-center" },
  { key: "launch", label: "Launch readiness", icon: Rocket, to: "/platform/launch-readiness" },
];

const STORAGE_ADMIN = "gh_admin_tabs_v3";
const STORAGE_SUPER = "gh_super_tabs_v1";
const STORAGE_MANAGER = "gh_manager_tabs_v1";
const DEFAULT_ADMIN: AdminTabKey[] = ["overview", "silos", "batches", "alerts", "marketplace"];
const DEFAULT_SUPER: SuperTabKey[] = ["overview", "orders", "financials", "users", "plans"];
const DEFAULT_MANAGER: ManagerTabKey[] = ["overview", "silos", "batches", "alerts", "dispatch"];

function readStored(storage: string, def: TabKey[], validKeys: Set<string>): TabKey[] {
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(storage);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as TabKey[];
    const filtered = parsed.filter((k) => validKeys.has(k));
    if (!filtered.length) return def;
    let out = filtered.slice(0, 5);
    if (!out.includes("overview")) out = (["overview", ...out] as TabKey[]).slice(0, 5);
    return out;
  } catch {
    return def;
  }
}

export function DashboardQuickTabs() {
  const { isSuperAdmin, role } = useIsSuperAdmin();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const isManager = role === "manager";
  const CATALOG = (
    isSuperAdmin ? CATALOG_SUPER : isManager ? CATALOG_MANAGER : CATALOG_ADMIN
  ) as Def<TabKey>[];
  const STORAGE = isSuperAdmin ? STORAGE_SUPER : isManager ? STORAGE_MANAGER : STORAGE_ADMIN;
  const DEFAULT = (
    isSuperAdmin ? DEFAULT_SUPER : isManager ? DEFAULT_MANAGER : DEFAULT_ADMIN
  ) as TabKey[];
  const validKeys = new Set(CATALOG.map((c) => c.key));
  const [tabs, setTabs] = useState<TabKey[]>(DEFAULT);
  const [slotsFullAlert, setSlotsFullAlert] = useState(false);
  useEffect(() => {
    setTabs(readStored(STORAGE, DEFAULT, validKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isManager]);

  function toggle(k: TabKey) {
    const has = tabs.includes(k);
    if (!has && tabs.length >= MAX_TABS) {
      setSlotsFullAlert(true);
      return;
    }
    let next = has ? tabs.filter((x) => x !== k) : [...tabs, k];
    if (!next.includes("overview")) next = (["overview", ...next] as TabKey[]).slice(0, MAX_TABS);
    localStorage.setItem(STORAGE, JSON.stringify(next));
    setTabs(next);
  }

  // Hover-to-open: pointing at a tab navigates to its screen after a short
  // delay, so sweeping the cursor across the row to reach the bell/avatar
  // doesn't fire off navigations. Leaving before the delay cancels it.
  const navigate = useNavigate();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHover = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  useEffect(() => cancelHover, []);
  const hoverOpen = (def: Def<TabKey>) => {
    cancelHover();
    hoverTimer.current = setTimeout(() => {
      navigate({ to: def.to, search: def.search as never });
    }, 180);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {tabs.map((k) => {
          const def = CATALOG.find((d) => d.key === k);
          if (!def) return null;
          const Icon = def.icon;
          const isActive =
            def.to === "/dashboard"
              ? path === "/dashboard"
              : (path === def.to || path.startsWith(def.to + "/")) &&
                (!def.search || search.tab === def.search.tab);
          const pill = (
            <Link
              to={def.to}
              search={def.search as never}
              aria-label={def.label}
              onMouseEnter={isActive ? undefined : () => hoverOpen(def)}
              onMouseLeave={cancelHover}
              className={
                "h-8 inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition " +
                (isActive
                  ? "px-3 text-emerald-600 dark:text-emerald-400"
                  : "w-8 justify-center text-muted-foreground hover:text-emerald-600")
              }
            >
              {!isActive && <Icon className="h-3.5 w-3.5" />}
              {isActive && <span>{def.label}</span>}
            </Link>
          );
          return isActive ? (
            <span key={k}>{pill}</span>
          ) : (
            <Tooltip key={k}>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {def.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Customize tabs"
              className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-emerald-600 transition"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Show tabs (max 5)
            </p>
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
                      {locked && (
                        <span className="ml-1 text-[9px] text-muted-foreground">pinned</span>
                      )}
                    </span>
                    {checked && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <AlertCard
              className="pointer-events-auto"
              isVisible={slotsFullAlert}
              title="Slots are full"
              description={`You can pin up to ${MAX_TABS} tabs. Remove one before adding another.`}
              buttonText="Got it"
              icon={<Bell className="h-5 w-5 text-destructive-foreground" />}
              onButtonClick={() => setSlotsFullAlert(false)}
              onDismiss={() => setSlotsFullAlert(false)}
            />
          </div>,
          document.body,
        )}
    </TooltipProvider>
  );
}
