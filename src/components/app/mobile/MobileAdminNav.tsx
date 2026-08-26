import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Package,
  DollarSign,
  Users,
  Grid3x3,
  BarChart3,
  Activity,
  Building2,
  FileText,
  Shield,
  Briefcase,
  HeartHandshake,
  Rocket,
  TrendingUp,
  Wheat,
  Wrench,
  Radio,
  ToggleRight,
  Bell,
} from "lucide-react";

import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useIsGlobalTechnician } from "@/hooks/useIsGlobalTechnician";
import { Sparkles, ShieldCheck, CreditCard, Inbox } from "lucide-react";
import { useTranslation } from "@/i18n";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
};

function getNavGroups(t: (key: string) => string): {
  workspaceGroups: NavGroup[];
  tenantTechnicianGroups: NavGroup[];
  globalTechnicianGroups: NavGroup[];
  superAdminGroups: NavGroup[];
} {
  const workspaceGroups: NavGroup[] = [
    {
      id: "main",
      label: t("tabs.main"),
      icon: Home,
      defaultOpen: true,
      items: [
        { id: "dashboard", label: t("tabs.overview"), icon: Home, link: "/dashboard" },
        { id: "grain-operations", label: t("tabs.grainOperations"), icon: Wheat, link: "/grain-operations" },
        { id: "monitoring", label: t("tabs.monitoring"), icon: Activity, link: "/monitoring" },
        { id: "intelligence", label: t("tabs.intelligence"), icon: Sparkles, link: "/intelligence" },
        { id: "business", label: t("tabs.business"), icon: Briefcase, link: "/business" },
        { id: "administration", label: t("tabs.administration"), icon: ShieldCheck, link: "/administration" },
      ],
    },
  ];

  const tenantTechnicianGroups: NavGroup[] = [
    {
      id: "my-work",
      label: t("tabs.myWork"),
      icon: Home,
      defaultOpen: true,
      items: [
        { id: "dashboard", label: t("tabs.overview"), icon: Home, link: "/dashboard" },
        { id: "sensors", label: t("tabs.sensors"), icon: Radio, link: "/sensors" },
        { id: "actuators", label: t("tabs.actuators"), icon: ToggleRight, link: "/actuators" },
        { id: "alerts", label: t("tabs.alerts"), icon: Bell, link: "/grain-alerts" },
      ],
    },
  ];

  const globalTechnicianGroups: NavGroup[] = [
    {
      id: "my-work",
      label: t("tabs.myWork"),
      icon: Home,
      defaultOpen: true,
      items: [
        { id: "my-installs", label: t("tabs.myInstalls"), icon: Wrench, link: "/technician/installs" },
      ],
    },
  ];

  const superAdminGroups: NavGroup[] = [
    {
      id: "overview",
      label: t("tabs.overview"),
      icon: Home,
      defaultOpen: true,
      items: [
        { id: "platform-overview", label: t("tabs.overview"), icon: Home, link: "/dashboard" },
        { id: "platform", label: t("tabs.platform"), icon: Building2, link: "/platform" },
      ],
    },
    {
      id: "users-mgmt",
      label: t("tabs.usersAndManagement"),
      icon: Users,
      items: [
        { id: "platform-tenants", label: t("tabs.tenants"), icon: Building2, link: "/platform/tenants" },
        { id: "platform-users", label: t("tabs.users"), icon: Users, link: "/platform/users" },
        { id: "platform-leads", label: t("tabs.leads"), icon: Users, link: "/platform/leads" },
        { id: "platform-pipeline", label: t("tabs.pipeline"), icon: TrendingUp, link: "/platform/pipeline" },
        {
          id: "platform-technicians",
          label: t("tabs.companyTechnicians"),
          icon: Wrench,
          link: "/platform/technicians",
        },
      ],
    },
    {
      id: "business-finance",
      label: t("tabs.businessAndFinance"),
      icon: Briefcase,
      items: [
        { id: "platform-business", label: t("tabs.business"), icon: Briefcase, link: "/platform/business" },
        { id: "platform-financials", label: t("tabs.financials"), icon: DollarSign, link: "/platform/financials" },
        { id: "platform-plans", label: t("tabs.plans"), icon: CreditCard, link: "/platform/plans" },
        { id: "platform-subscriptions", label: t("tabs.subscriptions"), icon: Grid3x3, link: "/platform/subscriptions" },
        { id: "platform-orders", label: t("tabs.installOrders"), icon: Package, link: "/platform/orders" },
      ],
    },
    {
      id: "monitoring-health",
      label: t("tabs.monitoringAndHealth"),
      icon: Activity,
      items: [
        {
          id: "platform-monitoring",
          label: t("tabs.monitoring"),
          icon: Activity,
          link: "/platform/monitoring",
        },
        { id: "platform-health", label: t("tabs.health"), icon: Activity, link: "/platform/health" },
        { id: "platform-silo-requests", label: t("tabs.siloRequests"), icon: Inbox, link: "/platform/silo-requests" },
      ],
    },
    {
      id: "reporting-analytics",
      label: t("tabs.reportingAndAnalytics"),
      icon: BarChart3,
      items: [
        {
          id: "platform-reporting",
          label: t("tabs.reporting"),
          icon: BarChart3,
          link: "/platform/reporting",
        },
        { id: "platform-audit-logs", label: t("tabs.auditLogsFull"), icon: FileText, link: "/platform/audit-logs" },
        { id: "platform-system-logs", label: t("tabs.systemLogsFull"), icon: FileText, link: "/platform/logs" },
      ],
    },
    {
      id: "security-compliance",
      label: t("tabs.securityAndCompliance"),
      icon: Shield,
      items: [
        { id: "platform-security", label: t("tabs.security"), icon: Shield, link: "/platform/security" },
        { id: "platform-insurance", label: t("tabs.insurance"), icon: HeartHandshake, link: "/platform/insurance" },
        { id: "platform-launch", label: t("tabs.launchReadinessFull"), icon: Rocket, link: "/platform/launch-readiness" },
      ],
    },
  ];

  return { workspaceGroups, tenantTechnicianGroups, globalTechnicianGroups, superAdminGroups };
}

interface MobileAdminNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAdminNav({ isOpen, onClose }: MobileAdminNavProps) {
  const { role } = useIsSuperAdmin();
  const { isGlobalTechnician, isTenantTechnician } = useIsGlobalTechnician();
  const { t } = useTranslation();
  
  const { workspaceGroups, tenantTechnicianGroups, globalTechnicianGroups, superAdminGroups } = getNavGroups(t);

  const groups =
    role === "super_admin"
      ? superAdminGroups
      : isGlobalTechnician
        ? globalTechnicianGroups
        : isTenantTechnician
          ? tenantTechnicianGroups
          : workspaceGroups;

  // Build initial open state from defaultOpen flags
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g) => {
      init[g.id] = g.defaultOpen ?? false;
    });
    return init;
  });

  const toggle = (id: string) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={onClose}
          />

          {/* Nav Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white border-r border-border z-50 flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-border px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2FAC0C] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">GH</span>
                </div>
                <span className="font-semibold text-foreground">GrainHero</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Groups — Scrollable */}
            <nav className="flex-1 overflow-y-auto py-2 px-2">
              {groups.map((group) => {
                const isOpen = openGroups[group.id] ?? false;
                const GroupIcon = group.icon;

                return (
                  <div key={group.id} className="mb-1">
                    {/* Group header — acts as collapsible toggle */}
                    <button
                      onClick={() => toggle(group.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <GroupIcon className="w-[18px] h-[18px] text-[#2FAC0C] flex-shrink-0" />
                      <span className="flex-1 text-left text-[13px] font-semibold text-foreground tracking-wide">
                        {group.label}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                      />
                    </button>

                    {/* Collapsible child items */}
                    {isOpen && (
                      <div className="ml-3 pl-4 border-l-2 border-[#2FAC0C]/20 space-y-0.5 pb-1">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.id}
                              to={item.link}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-[13px] text-foreground active:bg-muted"
                              onClick={onClose}
                            >
                              <ItemIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
