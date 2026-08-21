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

// ── Admin / Manager groups ────────────────────────────────────────────
const workspaceGroups: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    icon: Home,
    defaultOpen: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, link: "/dashboard" },
      { id: "grain-operations", label: "Grain Operations", icon: Wheat, link: "/grain-operations" },
      { id: "monitoring", label: "Monitoring", icon: Activity, link: "/monitoring" },
      { id: "intelligence", label: "Intelligence", icon: Sparkles, link: "/intelligence" },
      { id: "business", label: "Business", icon: Briefcase, link: "/business" },
      { id: "administration", label: "Administration", icon: ShieldCheck, link: "/administration" },
    ],
  },
];

// ── Tenant (admin) technician groups — field tools, no installs ─────────
const tenantTechnicianGroups: NavGroup[] = [
  {
    id: "my-work",
    label: "My Work",
    icon: Home,
    defaultOpen: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, link: "/dashboard" },
      { id: "sensors", label: "Sensors", icon: Radio, link: "/sensors" },
      { id: "actuators", label: "Actuators", icon: ToggleRight, link: "/actuators" },
      { id: "alerts", label: "Alerts", icon: Bell, link: "/grain-alerts" },
    ],
  },
];

// ── Global (superadmin) technician groups — installs only (Overview tab on
//    /dashboard already serves as the overview) ────────────────────────────
const globalTechnicianGroups: NavGroup[] = [
  {
    id: "my-work",
    label: "My Work",
    icon: Home,
    defaultOpen: true,
    items: [
      { id: "my-installs", label: "My Installs", icon: Wrench, link: "/technician/installs" },
    ],
  },
];

// ── Super-admin groups ─────────────────────────────────────────────────
const superAdminGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
    defaultOpen: true,
    items: [
      { id: "platform-overview", label: "Overview", icon: Home, link: "/dashboard" },
      { id: "platform", label: "Platform", icon: Building2, link: "/platform" },
    ],
  },
  {
    id: "users-mgmt",
    label: "Users & Management",
    icon: Users,
    items: [
      { id: "platform-tenants", label: "Tenants", icon: Building2, link: "/platform/tenants" },
      { id: "platform-users", label: "Users", icon: Users, link: "/platform/users" },
      { id: "platform-leads", label: "Leads", icon: Users, link: "/platform/leads" },
      { id: "platform-pipeline", label: "Pipeline", icon: TrendingUp, link: "/platform/pipeline" },
      {
        id: "platform-technicians",
        label: "Company Technicians",
        icon: Wrench,
        link: "/platform/technicians",
      },
    ],
  },
  {
    id: "business-finance",
    label: "Business & Finance",
    icon: Briefcase,
    items: [
      { id: "platform-business", label: "Business", icon: Briefcase, link: "/platform/business" },
      {
        id: "platform-financials",
        label: "Financials",
        icon: DollarSign,
        link: "/platform/financials",
      },
      { id: "platform-plans", label: "Plans", icon: CreditCard, link: "/platform/plans" },
      {
        id: "platform-subscriptions",
        label: "Subscriptions",
        icon: Grid3x3,
        link: "/platform/subscriptions",
      },
      { id: "platform-orders", label: "Install Orders", icon: Package, link: "/platform/orders" },
    ],
  },
  {
    id: "monitoring-health",
    label: "Monitoring & Health",
    icon: Activity,
    items: [
      {
        id: "platform-monitoring",
        label: "Monitoring",
        icon: Activity,
        link: "/platform/monitoring",
      },
      { id: "platform-health", label: "Health", icon: Activity, link: "/platform/health" },
      {
        id: "platform-silo-requests",
        label: "Silo Requests",
        icon: Inbox,
        link: "/platform/silo-requests",
      },
    ],
  },
  {
    id: "reporting-analytics",
    label: "Reporting & Analytics",
    icon: BarChart3,
    items: [
      {
        id: "platform-reporting",
        label: "Reporting",
        icon: BarChart3,
        link: "/platform/reporting",
      },
      {
        id: "platform-audit-logs",
        label: "Audit Logs",
        icon: FileText,
        link: "/platform/audit-logs",
      },
      { id: "platform-system-logs", label: "System Logs", icon: FileText, link: "/platform/logs" },
    ],
  },
  {
    id: "security-compliance",
    label: "Security & Compliance",
    icon: Shield,
    items: [
      { id: "platform-security", label: "Security", icon: Shield, link: "/platform/security" },
      {
        id: "platform-insurance",
        label: "Insurance",
        icon: HeartHandshake,
        link: "/platform/insurance",
      },
      {
        id: "platform-launch",
        label: "Launch Readiness",
        icon: Rocket,
        link: "/platform/launch-readiness",
      },
    ],
  },
];

interface MobileAdminNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAdminNav({ isOpen, onClose }: MobileAdminNavProps) {
  const { role } = useIsSuperAdmin();
  // Role-aware navigation: super admins get the platform groups, technicians
  // get their field-work group (Dashboard + My Installs), everyone else
  // (admin / manager) gets the tenant workspace groups.
  const { isGlobalTechnician, isTenantTechnician } = useIsGlobalTechnician();
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
