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
} from "@/components/app/skeletons";

// Route → matching page skeleton. Every page-level skeleton mirrors the real
// layout (container, grid, tile counts) so the pending state visually snaps
// to the destination page instead of a generic table/insight block.
const PAGE_SKELETONS: Record<string, React.ComponentType> = {
  "/grain-batches": GrainBatchesSkeleton,
  "/silos": SilosSkeleton,
  "/sensors": SensorsSkeleton,
  "/actuators": ActuatorsSkeleton,
  "/grain-alerts": GrainAlertsSkeleton,
  "/buyers": BuyersSkeleton,
  "/warehouses": WarehousesSkeleton,
  "/incidents": IncidentsSkeleton,
  "/maintenance": MaintenanceSkeleton,
  "/activity-logs": ActivityLogsSkeleton,
  "/insurance": InsuranceSkeleton,
  "/plans": PlansSkeleton,
  "/team-management": TeamManagementSkeleton,
  "/settings": SettingsSkeleton,
  "/subscription": SubscriptionSkeleton,
  "/notifications": NotificationsSkeleton,
  "/orders": OrdersSkeleton,
  "/reports": ReportsSkeleton,
  "/analytics": AnalyticsSkeleton,
  "/ai-predictions": AnalyticsSkeleton,
  "/data-visualization": AnalyticsSkeleton,
  "/traceability": AnalyticsSkeleton,
  "/ml-models": AnalyticsSkeleton,
  "/revenue": AnalyticsSkeleton,
  "/environmental": AnalyticsSkeleton,
  "/server-monitoring": AnalyticsSkeleton,
  "/security-center": AnalyticsSkeleton,
  "/platform/pipeline": AnalyticsSkeleton,
  "/platform/health": AnalyticsSkeleton,
  "/platform/financials": FinancialsSkeleton,
  "/platform/orders": PlatformOrdersSkeleton,
  "/platform/finance": FinanceCommandSkeleton,
  "/platform/finance/payouts": PayoutsSkeleton,
  "/platform/finance/ledger": LedgerSkeleton,
  "/platform/finance/tax-rules": TaxRulesSkeleton,
  "/earnings": EarningsSkeleton,
  "/platform/insurance": InsuranceCommandSkeleton,
  "/platform/insurance/audit": InsuranceCommandSkeleton,
  "/platform/logistics/command-center": AnalyticsSkeleton,
  "/platform/logistics/fleet": AnalyticsSkeleton,
  "/platform/logistics/carriers": AnalyticsSkeleton,
  "/technician/installs": OrdersSkeleton,
  "/sales": OrdersSkeleton,
  "/listings": GrainBatchesSkeleton,
};

function AutoPending() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  let Skel = PAGE_SKELETONS[pathname];
  if (!Skel && pathname.startsWith("/admins/")) Skel = AdminProfileSkeleton;
  if (!Skel && pathname.startsWith("/platform/orders/")) Skel = PlatformOrdersSkeleton;
  if (!Skel && pathname.startsWith("/technician/installs/")) Skel = OrdersSkeleton;
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
