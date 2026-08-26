import { useEffect, useState } from "react";
import { useRouterState, Link } from "@tanstack/react-router";
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
import { useIsGlobalTechnician } from "@/hooks/useIsGlobalTechnician";
import { useTranslation } from "@/i18n";

type AdminTabKey =
  | "overview"
  | "silos"
  | "batches"
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
  | "launch"
  | "technicians";

type TenantTechnicianTabKey = "overview" | "installs" | "sensors" | "actuators" | "alerts";
type GlobalTechnicianTabKey = "overview" | "installs";
type TechnicianTabKey = TenantTechnicianTabKey | GlobalTechnicianTabKey;

type TabKey = AdminTabKey | SuperTabKey | ManagerTabKey | TechnicianTabKey;

type Def<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
  to: string;
  search?: { tab: string };
};

function getCatalogs(t: (key: string) => string) {
  const CATALOG_ADMIN: Def<AdminTabKey>[] = [
    { key: "overview", label: t("tabs.overview"), icon: LayoutDashboard, to: "/dashboard" },
    { key: "silos", label: t("tabs.silos"), icon: Container, to: "/grain-operations", search: { tab: "silos" } },
    { key: "batches", label: t("tabs.batches"), icon: Wheat, to: "/grain-operations", search: { tab: "batches" } },
    { key: "marketplace", label: t("tabs.marketplace"), icon: Store, to: "/business" },
    { key: "sensors", label: t("tabs.sensors"), icon: Radio, to: "/sensors" },
    { key: "actuators", label: t("tabs.actuators"), icon: ToggleRight, to: "/actuators" },
    { key: "buyers", label: t("tabs.buyers"), icon: Users, to: "/grain-operations", search: { tab: "buyers" } },
    { key: "orders", label: t("tabs.orders"), icon: Package, to: "/orders" },
    { key: "team", label: t("tabs.team"), icon: UserCog, to: "/team-management" },
  ];

  const CATALOG_MANAGER: Def<ManagerTabKey>[] = [
    { key: "overview", label: t("tabs.overview"), icon: LayoutDashboard, to: "/dashboard" },
    { key: "silos", label: t("tabs.silos"), icon: Container, to: "/grain-operations", search: { tab: "silos" } },
    { key: "batches", label: t("tabs.batches"), icon: Wheat, to: "/grain-operations", search: { tab: "batches" } },
    { key: "dispatch", label: t("tabs.dispatch"), icon: Truck, to: "/grain-operations", search: { tab: "silos" } },
    { key: "qc", label: t("tabs.qc"), icon: ClipboardCheck, to: "/grain-operations", search: { tab: "batches" } },
    { key: "actuators", label: t("tabs.actuators"), icon: ToggleRight, to: "/actuators" },
    { key: "orders", label: t("tabs.orders"), icon: Package, to: "/orders" },
    { key: "sensors", label: t("tabs.sensors"), icon: Radio, to: "/sensors" },
    { key: "team", label: t("tabs.team"), icon: UserCog, to: "/team-management" },
  ];

  const CATALOG_TENANT_TECHNICIAN: Def<TenantTechnicianTabKey>[] = [
    { key: "overview", label: t("tabs.overview"), icon: LayoutDashboard, to: "/dashboard" },
    { key: "sensors", label: t("tabs.sensors"), icon: Radio, to: "/sensors" },
    { key: "actuators", label: t("tabs.actuators"), icon: ToggleRight, to: "/actuators" },
    { key: "alerts", label: t("tabs.alerts"), icon: Bell, to: "/grain-alerts" },
    { key: "installs", label: t("tabs.myInstalls"), icon: Package, to: "/technician/installs" },
  ];

  const CATALOG_GLOBAL_TECHNICIAN: Def<GlobalTechnicianTabKey>[] = [
    { key: "overview", label: t("tabs.overview"), icon: LayoutDashboard, to: "/dashboard" },
    { key: "installs", label: t("tabs.myInstalls"), icon: Package, to: "/technician/installs" },
  ];

  const CATALOG_SUPER: Def<SuperTabKey>[] = [
    { key: "overview", label: t("tabs.overview"), icon: LayoutDashboard, to: "/dashboard" },
    { key: "orders", label: t("tabs.installOrders"), icon: Package, to: "/platform/orders" },
    { key: "financials", label: t("tabs.financials"), icon: DollarSign, to: "/platform/financials" },
    { key: "users", label: t("tabs.users"), icon: Users, to: "/platform/users" },
    { key: "plans", label: t("tabs.plans"), icon: CreditCard, to: "/platform/plans" },
    { key: "reporting", label: t("tabs.reporting"), icon: MessageSquare, to: "/platform/reporting" },
    { key: "health", label: t("tabs.health"), icon: Activity, to: "/platform/health" },
    { key: "audit-logs", label: t("tabs.auditLogs"), icon: ScrollText, to: "/platform/audit-logs" },
    { key: "system-logs", label: t("tabs.systemLogs"), icon: ClipboardList, to: "/platform/logs" },
    { key: "pipeline", label: t("tabs.pipeline"), icon: TrendingUp, to: "/platform/pipeline" },
    { key: "leads", label: t("tabs.leads"), icon: UserPlus, to: "/platform/leads" },
    { key: "insurance", label: t("tabs.insurance"), icon: Shield, to: "/insurance" },
    { key: "subscription", label: t("tabs.subscriptions"), icon: CreditCard, to: "/subscription" },
    { key: "security", label: t("tabs.security"), icon: ShieldCheck, to: "/security-center" },
    { key: "launch", label: t("tabs.launchReadiness"), icon: Rocket, to: "/platform/launch-readiness" },
    { key: "technicians", label: t("tabs.technicians"), icon: Users, to: "/platform/technicians" },
  ];

  return { CATALOG_ADMIN, CATALOG_MANAGER, CATALOG_SUPER, CATALOG_TENANT_TECHNICIAN, CATALOG_GLOBAL_TECHNICIAN };
}

const STORAGE_ADMIN = "gh_admin_tabs_v3";
const STORAGE_SUPER = "gh_super_tabs_v1";
const STORAGE_MANAGER = "gh_manager_tabs_v1";
const DEFAULT_ADMIN: AdminTabKey[] = ["overview", "silos", "batches", "sensors", "marketplace"];
const DEFAULT_SUPER: SuperTabKey[] = ["overview", "orders", "financials", "users", "plans"];
const DEFAULT_MANAGER: ManagerTabKey[] = ["overview", "silos", "batches", "sensors", "dispatch"];
const DEFAULT_TENANT_TECHNICIAN: TenantTechnicianTabKey[] = ["overview", "sensors", "actuators"];
const DEFAULT_GLOBAL_TECHNICIAN: GlobalTechnicianTabKey[] = ["overview", "installs"];

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
  const { isGlobalTechnician, isTenantTechnician } = useIsGlobalTechnician();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const isManager = role === "manager";
  const { t } = useTranslation();

  const { CATALOG_ADMIN, CATALOG_MANAGER, CATALOG_SUPER, CATALOG_TENANT_TECHNICIAN, CATALOG_GLOBAL_TECHNICIAN } =
    getCatalogs(t);

  const CATALOG = (
    isSuperAdmin
      ? CATALOG_SUPER
      : isManager
        ? CATALOG_MANAGER
        : isGlobalTechnician
          ? CATALOG_GLOBAL_TECHNICIAN
          : isTenantTechnician
            ? CATALOG_TENANT_TECHNICIAN
            : CATALOG_ADMIN
  ) as Def<TabKey>[];
  const STORAGE = isSuperAdmin
    ? STORAGE_SUPER
    : isManager
      ? STORAGE_MANAGER
      : isGlobalTechnician || isTenantTechnician
        ? "gh_tech_tabs_v1"
        : STORAGE_ADMIN;
  const DEFAULT = (
    isSuperAdmin
      ? DEFAULT_SUPER
      : isManager
        ? DEFAULT_MANAGER
        : isGlobalTechnician
          ? DEFAULT_GLOBAL_TECHNICIAN
          : isTenantTechnician
            ? DEFAULT_TENANT_TECHNICIAN
            : DEFAULT_ADMIN
  ) as TabKey[];
  const validKeys = new Set(CATALOG.map((c) => c.key));
  const [tabs, setTabs] = useState<TabKey[]>(DEFAULT);
  useEffect(() => {
    setTabs(readStored(STORAGE, DEFAULT, validKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isManager, isGlobalTechnician, isTenantTechnician]);

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
              {t("tabs.showTabs")}
            </p>
            <div className="grid gap-0.5">
              {CATALOG.map((item) => {
                const checked = tabs.includes(item.key);
                const locked = item.key === "overview";
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={locked}
                    onClick={() => toggle(item.key)}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-muted disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                      {locked && (
                        <span className="ml-1 text-[9px] text-muted-foreground">{t("tabs.pinned")}</span>
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
    </TooltipProvider>
  );
}
