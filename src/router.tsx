import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouterState } from "@tanstack/react-router";
import type React from "react";
import { routeTree } from "./routeTree.gen";
import {
  DashboardSkeleton,
  AnalyticsSkeleton,
  NotificationsSkeleton,
  OrdersSkeleton,
  ReportsSkeleton,
  SubscriptionSkeleton,
  GrainBatchesSkeleton,
  SilosSkeleton,
  SensorsSkeleton,
  ActuatorsSkeleton,
  GrainAlertsSkeleton,
  BuyersSkeleton,
  WarehousesSkeleton,
  IncidentsSkeleton,
  MaintenanceSkeleton,
  ActivityLogsSkeleton,
  InsuranceSkeleton,
  PlansSkeleton,
  TeamManagementSkeleton,
  SettingsSkeleton,
  FinancialsSkeleton,
  AdminProfileSkeleton,
  PlatformOrdersSkeleton,
  FinanceCommandSkeleton,
  PayoutsSkeleton,
  LedgerSkeleton,
  TaxRulesSkeleton,
  EarningsSkeleton,
  InsuranceCommandSkeleton,
  MetricRegistrySkeleton,
  DashboardBuilderSkeleton,
  AdminDashSkeleton,
  ManagerDashSkeleton,
  TechnicianDashSkeleton,
  SuperAdminDashSkeleton,
  TableHubSkeleton,
  KpiChartHubSkeleton,
  DetailHubSkeleton,
  RailListDrawerSkeleton,
  CommandConsoleSkeleton,
  LogStreamSkeleton,
  FormPageSkeleton,
} from "@/components/app/skeletons";

// Route → matching page skeleton. Every page-level skeleton mirrors the real
// layout (container, grid, tile counts) so the pending state visually snaps
// to the destination page instead of a generic table/insight block.
const PAGE_SKELETONS: Record<string, React.ComponentType> = {
  // Dashboards — we can't know the role at pending-time; use the admin bento
  // as the safe default (Manager/Technician/SuperAdmin all render bento-ish
  // grids and users rarely cold-land on a role dash from an unauth boot).
  "/dashboard": AdminDashSkeleton,
  // Operational (silos hub uses rail+list+drawer)
  "/silos": RailListDrawerSkeleton,
  "/warehouses": RailListDrawerSkeleton,
  "/grain-batches": GrainBatchesSkeleton,
  "/sensors": SensorsSkeleton,
  "/actuators": ActuatorsSkeleton,
  "/grain-alerts": GrainAlertsSkeleton,
  "/buyers": TableHubSkeleton,
  "/suppliers": TableHubSkeleton,
  "/incidents": IncidentsSkeleton,
  "/maintenance": MaintenanceSkeleton,
  "/activity-logs": LogStreamSkeleton,
  "/insurance": InsuranceSkeleton,
  "/plans": PlansSkeleton,
  "/team-management": TableHubSkeleton,
  "/settings": FormPageSkeleton,
  "/settings/notifications": FormPageSkeleton,
  "/plan-management": FormPageSkeleton,
  "/subscription": SubscriptionSkeleton,
  "/notifications": NotificationsSkeleton,
  "/orders": TableHubSkeleton,
  "/sales": TableHubSkeleton,
  "/returns": TableHubSkeleton,
  "/listings": TableHubSkeleton,
  "/attention": TableHubSkeleton,
  "/buyer/orders": TableHubSkeleton,
  "/reports": ReportsSkeleton,
  "/analytics": KpiChartHubSkeleton,
  "/ai-predictions": KpiChartHubSkeleton,
  "/data-visualization": KpiChartHubSkeleton,
  "/traceability": KpiChartHubSkeleton,
  "/ml-models": KpiChartHubSkeleton,
  "/revenue": KpiChartHubSkeleton,
  "/environmental": KpiChartHubSkeleton,
  "/server-monitoring": CommandConsoleSkeleton,
  "/security-center": CommandConsoleSkeleton,
  // Platform (super-admin)
  "/platform": SuperAdminDashSkeleton,
  "/platform/pipeline": KpiChartHubSkeleton,
  "/platform/health": CommandConsoleSkeleton,
  "/platform/financials": FinancialsSkeleton,
  "/platform/orders": PlatformOrdersSkeleton,
  "/platform/finance": FinanceCommandSkeleton,
  "/platform/finance/payouts": PayoutsSkeleton,
  "/platform/finance/ledger": LedgerSkeleton,
  "/platform/finance/tax-rules": TaxRulesSkeleton,
  "/earnings": EarningsSkeleton,
  "/platform/insurance": InsuranceCommandSkeleton,
  "/platform/insurance/audit": InsuranceCommandSkeleton,
  "/platform/insurance/webhooks": InsuranceCommandSkeleton,
  "/platform/users": TableHubSkeleton,
  "/platform/tenants": TableHubSkeleton,
  "/platform/plans": TableHubSkeleton,
  "/platform/sellers": TableHubSkeleton,
  "/platform/leads": TableHubSkeleton,
  "/platform/reviews": TableHubSkeleton,
  "/platform/messages": LogStreamSkeleton,
  "/platform/quality": KpiChartHubSkeleton,
  "/platform/reporting": KpiChartHubSkeleton,
  "/platform/audit-logs": LogStreamSkeleton,
  "/platform/logs": LogStreamSkeleton,
  "/platform/disputes": TableHubSkeleton,
  "/platform/sla-alerts": TableHubSkeleton,
  "/platform/invoice-failures": TableHubSkeleton,
  "/platform/marketplace-health": CommandConsoleSkeleton,
  "/platform/marketplace-settings": FormPageSkeleton,
  "/platform/dispatch-analytics": KpiChartHubSkeleton,
  "/platform/launch-readiness": CommandConsoleSkeleton,
  "/platform/metrics": MetricRegistrySkeleton,
  "/platform/dashboard-builder": DashboardBuilderSkeleton,
  "/platform/mobile-settings": FormPageSkeleton,
  "/platform/mobile-deep-links": FormPageSkeleton,
  "/platform/mobile-push-diagnostics": CommandConsoleSkeleton,
  "/platform/field-settings": FormPageSkeleton,
  "/platform/field-incidents": TableHubSkeleton,
  "/platform/marketplace-mobile": FormPageSkeleton,
  "/platform/mobile-sync-monitor": CommandConsoleSkeleton,
  "/platform/commerce-mobile": FormPageSkeleton,
  "/platform/logistics/command-center": CommandConsoleSkeleton,
  "/platform/logistics/fleet": TableHubSkeleton,
  "/platform/logistics/carriers": TableHubSkeleton,
  // Technician
  "/technician/installs": TableHubSkeleton,
  // Role hubs
  "/grain-operations": KpiChartHubSkeleton,
  "/monitoring": CommandConsoleSkeleton,
  "/intelligence": KpiChartHubSkeleton,
  "/business": KpiChartHubSkeleton,
  "/administration": FormPageSkeleton,
  "/not-allowed": FormPageSkeleton,
};

// Prefix rules for dynamic detail pages that don't match an exact map entry.
const PREFIX_SKELETONS: Array<[string, React.ComponentType]> = [
  ["/admins/", AdminProfileSkeleton],
  ["/silos/", DetailHubSkeleton],
  ["/suppliers/", DetailHubSkeleton],
  ["/technician/installs/", DetailHubSkeleton],
  ["/platform/orders/", DetailHubSkeleton],
  ["/platform/insurance/claims/", DetailHubSkeleton],
  ["/insurance-claims/", DetailHubSkeleton],
  ["/insurance-policies/", DetailHubSkeleton],
  ["/buyer/orders/", DetailHubSkeleton],
  ["/platform/", CommandConsoleSkeleton], // fallback for any remaining super-admin page
];

function AutoPending() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  let Skel = PAGE_SKELETONS[pathname];
  if (!Skel) {
    for (const [prefix, Comp] of PREFIX_SKELETONS) {
      if (pathname.startsWith(prefix)) { Skel = Comp; break; }
    }
  }
  if (Skel) return <Skel />;
  return <DashboardSkeleton />;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: AutoPending,
  });

  return router;
};
