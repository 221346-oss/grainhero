import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link as RouterLink } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformMetrics, getPlatformOverviewWidgets } from "@/lib/platform-no-admin.functions";
import { listTickets, type TicketRow } from "@/lib/tickets.functions";
import {
  Menu,
  Bell,
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  GitBranch,
  Settings,
  Moon,
  Grid3x3,
  Check,
  Home,
  Package,
  DollarSign,
  Users,
  MoreHorizontal,
  Ticket,
  ChevronDown,
  BarChart3,
  Shield,
  FileText,
  Zap,
  Inbox,
  Building2,
  Briefcase,
  HeartHandshake,
  Lock,
  Rocket,
  Link as LinkIcon,
} from "lucide-react";

type NavGroup = {
  label: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    link: string;
  }>;
};
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TicketDetailSheet } from "@/components/app/tickets/TicketDetailSheet";

export function SuperAdminDashboardMobile({ name }: { name?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"navigation" | "tickets">("navigation");
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    primary: true,
    users: false,
    plans: false,
    reporting: false,
    monitoring: false,
    orders: false,
    finance: false,
    logistics: false,
    insurance: false,
    marketplace: false,
    mobile: false,
    system: false,
  });
  const metricsFn = useServerFn(getPlatformMetrics);
  const widgetsFn = useServerFn(getPlatformOverviewWidgets);
  const qc = useQueryClient();

  const navigationGroups: NavGroup[] = [
    {
      label: "PRIMARY",
      items: [
        { id: "overview", label: "Overview", icon: Home, link: "/platform" },
        { id: "orders", label: "Install Orders", icon: Package, link: "/platform/orders" },
      ],
    },
    {
      label: "USERS & MANAGEMENT",
      items: [
        { id: "tenants", label: "Tenants", icon: Building2, link: "/platform/tenants" },
        { id: "users", label: "Users", icon: Users, link: "/platform/users" },
        { id: "leads", label: "Leads", icon: Inbox, link: "/platform/leads" },
      ],
    },
    {
      label: "PLANS & BUSINESS",
      items: [
        { id: "plans", label: "Plans", icon: Grid3x3, link: "/platform/plans" },
        { id: "business", label: "Business", icon: Briefcase, link: "/platform/business" },
      ],
    },
    {
      label: "REPORTING & ANALYTICS",
      items: [
        { id: "reporting", label: "Reporting", icon: BarChart3, link: "/platform/reporting" },
        { id: "metrics", label: "Metrics", icon: TrendingUp, link: "/platform/metrics" },
        { id: "key-metrics", label: "Key Metrics", icon: Grid3x3, link: "/platform/key-metrics" },
        {
          id: "dispatch-analytics",
          label: "Dispatch Analytics",
          icon: Activity,
          link: "/platform/dispatch-analytics",
        },
      ],
    },
    {
      label: "MONITORING & HEALTH",
      items: [
        { id: "health", label: "Health", icon: Activity, link: "/platform/health" },
        { id: "monitoring", label: "Monitoring", icon: Activity, link: "/platform/monitoring" },
        {
          id: "field-incidents",
          label: "Field Incidents",
          icon: AlertTriangle,
          link: "/monitoring",
        },
      ],
    },
    {
      label: "ORDERS & DISPUTES",
      items: [
        { id: "order-details", label: "Order Details", icon: Package, link: "/platform/orders" },
        { id: "disputes", label: "Disputes", icon: Shield, link: "/platform/disputes" },
        {
          id: "invoice-failures",
          label: "Invoice Failures",
          icon: FileText,
          link: "/platform/invoice-failures",
        },
      ],
    },
    {
      label: "FINANCE",
      items: [
        { id: "finance", label: "Finance", icon: DollarSign, link: "/platform/finance" },
        { id: "financials", label: "Financials", icon: DollarSign, link: "/platform/financials" },
      ],
    },
    {
      label: "LOGISTICS",
      items: [
        { id: "logistics-fleet", label: "Fleet", icon: Package, link: "/platform/logistics/fleet" },
        {
          id: "logistics-carriers",
          label: "Carriers",
          icon: Package,
          link: "/platform/logistics/carriers",
        },
        {
          id: "logistics-cc",
          label: "Command Center",
          icon: Zap,
          link: "/platform/logistics/command-center",
        },
      ],
    },
    {
      label: "INSURANCE",
      items: [
        { id: "insurance", label: "Insurance", icon: HeartHandshake, link: "/platform/insurance" },
        { id: "insurance-claims", label: "Claims", icon: FileText, link: "/platform/insurance" },
        { id: "insurance-audit", label: "Audit", icon: Shield, link: "/platform/insurance/audit" },
      ],
    },
    {
      label: "MARKETPLACE",
      items: [
        {
          id: "marketplace-mobile",
          label: "Mobile",
          icon: Package,
          link: "/platform/marketplace-mobile",
        },
        {
          id: "marketplace-health",
          label: "Health",
          icon: Activity,
          link: "/platform/marketplace-health",
        },
        {
          id: "marketplace-settings",
          label: "Settings",
          icon: Settings,
          link: "/platform/marketplace-settings",
        },
        { id: "reviews", label: "Reviews", icon: BarChart3, link: "/platform/reviews" },
        { id: "sellers", label: "Sellers", icon: Users, link: "/platform/sellers" },
        { id: "quality", label: "Quality", icon: Check, link: "/platform/quality" },
      ],
    },
    {
      label: "MOBILE",
      items: [
        {
          id: "mobile-settings",
          label: "Settings",
          icon: Settings,
          link: "/platform/mobile-settings",
        },
        {
          id: "mobile-push",
          label: "Push Diagnostics",
          icon: Zap,
          link: "/platform/mobile-push-diagnostics",
        },
        {
          id: "mobile-sync",
          label: "Sync Monitor",
          icon: Activity,
          link: "/platform/mobile-sync-monitor",
        },
        {
          id: "mobile-deep-links",
          label: "Deep Links",
          icon: LinkIcon,
          link: "/platform/mobile-deep-links",
        },
      ],
    },
    {
      label: "SYSTEM & AUDIT",
      items: [
        { id: "audit-logs", label: "Audit Logs", icon: FileText, link: "/platform/audit-logs" },
        { id: "logs", label: "System Logs", icon: FileText, link: "/platform/logs" },
        {
          id: "env-health",
          label: "Environment Health",
          icon: Activity,
          link: "/platform/env-health",
        },
        {
          id: "silo-requests",
          label: "Silo Requests",
          icon: Building2,
          link: "/platform/silo-requests",
        },
        {
          id: "field-settings",
          label: "Field Settings",
          icon: Settings,
          link: "/platform/field-settings",
        },
        { id: "messages", label: "Messages", icon: FileText, link: "/platform/messages" },
        {
          id: "sla-alerts",
          label: "SLA Alerts",
          icon: AlertTriangle,
          link: "/platform/sla-alerts",
        },
        {
          id: "launch-readiness",
          label: "Launch Readiness",
          icon: Rocket,
          link: "/platform/launch-readiness",
        },
      ],
    },
  ];

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("superadmin-mobile")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-metrics"] });
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["platform-metrics"] });
        qc.invalidateQueries({ queryKey: ["platform-widgets"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: m } = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: () => metricsFn(),
    refetchInterval: 30_000,
  });

  const { data: w } = useQuery({
    queryKey: ["platform-widgets"],
    queryFn: () => widgetsFn(),
    refetchInterval: 30_000,
  });

  const reporting = w?.reportingStats ?? { totalTickets: 0 };

  // Fetch tickets for the mobile tickets panel - Only OPEN tickets
  const ticketsFn = useServerFn(listTickets);
  const { data: ticketData } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => ticketsFn({ data: { status: "open" } }),
    staleTime: 30_000,
  });
  const allTickets = ticketData?.tickets ?? [];

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupLabel
        .toLowerCase()
        .replace(/\s+&\s+/g, "-")
        .replace(/\s+/g, "-")]:
        !prev[
          groupLabel
            .toLowerCase()
            .replace(/\s+&\s+/g, "-")
            .replace(/\s+/g, "-")
        ],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Overlay Drawer - Shows navigation or tickets */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSidebarOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-background border-r border-border z-50 overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-4 py-4 flex items-center justify-between">
              {sidebarView === "navigation" ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center">
                      <span className="text-white font-bold text-sm">GH</span>
                    </div>
                    <span className="font-semibold text-foreground">GrainHero</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSidebarView("navigation")}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label="Back to navigation"
                    >
                      <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    <span className="font-semibold text-foreground">Tickets</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="py-1">
              {sidebarView === "navigation" ? (
                // Navigation Groups - Compact Design
                navigationGroups.map((group, idx) => {
                  const groupKey = group.label
                    .toLowerCase()
                    .replace(/\s+&\s+/g, "-")
                    .replace(/\s+/g, "-");
                  const isExpanded = expandedGroups[groupKey] ?? idx === 0; // Primary is expanded by default

                  return (
                    <div key={group.label} className="mb-1">
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/40 transition-colors rounded-md mx-1"
                      >
                        <span className="text-xs font-semibold text-muted-foreground">
                          {group.label}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-1 py-0.5">
                          {group.items.map((item) => (
                            <RouterLink
                              key={item.id}
                              to={item.link}
                              className="flex items-center gap-2.5 px-3 py-1.5 my-0.25 rounded-md hover:bg-muted/50 transition-colors text-xs text-foreground"
                              onClick={() => setSidebarOpen(false)}
                            >
                              <item.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-sm">{item.label}</span>
                            </RouterLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Tickets View - List all tickets
                <div className="space-y-1">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">
                      Open incident tickets from all admins
                    </p>
                  </div>
                  {allTickets.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No tickets</p>
                    </div>
                  ) : (
                    allTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full text-left px-4 py-2.5 border-b border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground line-clamp-1">
                            {ticket.title}
                          </h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ticket.description?.substring(0, 60)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content - Responsive web view, NO bottom nav tabs */}
      <div className="w-full px-4 space-y-4 pb-6" style={{ width: "100%", maxWidth: "100%" }}>
        {/* Welcome Banner */}
        <div className="mb-2">
          <h1 className="text-lg font-semibold text-foreground">
            Welcome back{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your platform
          </p>
        </div>

        {/* 1. Platform Performance */}
        <RouterLink to="/platform/monitoring">
          <div className="bg-background border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Platform Performance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">System health metrics</p>
              </div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">System Health</span>
                  <span className="text-sm font-bold text-warning">85%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: "85%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">API Uptime</span>
                  <span className="text-sm font-bold text-success">99.2%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: "99.2%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">DB Performance</span>
                  <span className="text-sm font-bold text-info">92%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full" style={{ width: "92%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </RouterLink>

        {/* 2. Monthly Revenue */}
        <RouterLink to="/platform/business">
          <div className="bg-background border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium text-foreground">Monthly Revenue</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Total platform revenue</p>
              </div>
              <DollarSign className="w-4 h-4 text-success" />
            </div>

            <div className="text-3xl font-bold text-success mb-2">Rs 24,888</div>

            <div className="relative h-16 rounded-md overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 60 Q 75 30 150 20 T 300 45 L 300 80 L 0 80"
                  fill="url(#revGradMobile)"
                  stroke="none"
                />
                <path
                  d="M 0 60 Q 75 30 150 20 T 300 45"
                  stroke="hsl(var(--success))"
                  strokeWidth="1.5"
                  fill="none"
                  strokeOpacity="0.5"
                />
              </svg>
            </div>
          </div>
        </RouterLink>

        {/* 3. Operational Metrics - 2 Column Grid */}
        <div className="grid grid-cols-2 gap-3">
          <RouterLink to="/platform/users">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Tenants</div>
              <div className="text-2xl font-bold text-foreground">{m?.totalTenants ?? 9}</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/users">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Users</div>
              <div className="text-2xl font-bold text-foreground">{m?.totalUsers ?? 29}</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/plans">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Active Subs</div>
              <div className="text-2xl font-bold text-success">{m?.activeSubscriptions ?? 27}</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/orders">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Orders</div>
              <div className="text-2xl font-bold text-foreground">{w?.ordersTotal ?? 28}</div>
            </div>
          </RouterLink>
        </div>

        {/* Critical Alerts - Full Width */}
        <RouterLink to="/platform/health">
          <div className="bg-background border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Critical Alerts</div>
                <div
                  className={`text-2xl font-bold ${(m?.criticalAlerts ?? 0) > 0 ? "text-severity-critical" : "text-success"}`}
                >
                  {m?.criticalAlerts ?? 0}
                </div>
              </div>
              {(m?.criticalAlerts ?? 0) === 0 ? (
                <CheckCircle2 className="w-8 h-8 text-success" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-severity-critical" />
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {(m?.criticalAlerts ?? 0) === 0 ? "All systems healthy" : "Needs attention"}
            </div>
          </div>
        </RouterLink>

        {/* 4. Quick KPI Summary - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <RouterLink to="/platform/users">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <TrendingUp className="w-3 h-3 text-success" />
              </div>
              <div className="text-2xl font-bold text-foreground">{w?.signupsTotal ?? 29}</div>
              <div className="text-xs text-muted-foreground mt-1">Signups</div>
              <div className="text-xs text-success mt-0.5">+{w?.wowDelta ?? 33}% WoW</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/reporting" search={{ tab: "hardware" }}>
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Ticket className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{allTickets.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Support Tickets</div>
              <div className="text-xs text-muted-foreground mt-0.5">Open tickets</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/pipeline">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{w?.pipelineTotal ?? 2}</div>
              <div className="text-xs text-muted-foreground mt-1">Pipeline</div>
              <div className="text-xs text-muted-foreground mt-0.5">CRM contacts</div>
            </div>
          </RouterLink>

          <RouterLink to="/platform/health">
            <div className="bg-background border border-border rounded-xl p-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{m?.criticalAlerts ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Alerts</div>
              <div className="text-xs text-muted-foreground mt-0.5">System wide</div>
            </div>
          </RouterLink>
        </div>

        {/* 5. Recent Signups */}
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Recent Signups</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(w?.recentSignups ?? []).length} total
              </p>
            </div>
            <RouterLink to="/platform/users" className="text-xs text-primary hover:underline">
              View all
            </RouterLink>
          </div>

          <div className="space-y-2">
            {(w?.recentSignups ?? []).slice(0, 6).map((signup) => (
              <div
                key={signup.id}
                className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded-lg transition-colors"
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(signup.name || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {signup.name || "New User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{signup.email}</p>
                </div>
                <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
                  {signup.subscription_plan || "Basic"}
                </Badge>
              </div>
            ))}

            {(!w?.recentSignups || w.recentSignups.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">No recent signups</p>
            )}
          </div>
        </div>

        {/* 6. Platform Activity & Events */}
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Platform Activity & Events</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Recent activity</p>
            </div>
            <RouterLink to="/platform/audit-logs" className="text-xs text-primary hover:underline">
              View all
            </RouterLink>
          </div>

          {/* 3-Column Compact Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">
                {(w?.recentSignups ?? []).length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">New Users</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{w?.ordersTotal ?? 28}</div>
              <div className="text-xs text-muted-foreground mt-1">Orders</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{m?.criticalAlerts ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Alerts</div>
            </div>
          </div>

          {/* Events Timeline */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Events
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-success flex-shrink-0 mt-1.5"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">New user registration</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0 mt-1.5"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">System update</p>
                  <p className="text-xs text-muted-foreground">5 mins ago</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-info flex-shrink-0 mt-1.5"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">System log entry</p>
                  <p className="text-xs text-muted-foreground">15 mins ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
