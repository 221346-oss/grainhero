import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouterState } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import {
  DashboardSkeleton,
  TableSkeleton,
  AnalyticsSkeleton,
  FormSkeleton,
} from "@/components/app/skeletons";

// Route-shape mapping — keeps the pending state consistent with what the
// page will actually render, so users don't see a dashboard skeleton on
// a table page and vice-versa.
const TABLE = new Set([
  "/grain-batches", "/silos", "/sensors", "/actuators", "/warehouses",
  "/grain-alerts", "/buyers", "/incidents", "/maintenance", "/notifications",
  "/orders", "/activity-logs", "/team-management",
  "/platform/tenants", "/platform/users", "/platform/leads",
  "/platform/orders", "/platform/audit-logs", "/platform/logs",
]);
const INSIGHT = new Set([
  "/analytics", "/ai-predictions", "/reports", "/data-visualization",
  "/traceability", "/ml-models", "/revenue", "/environmental",
  "/server-monitoring", "/security-center",
  "/platform/revenue", "/platform/pipeline", "/platform/health",
]);
const FORM = new Set([
  "/settings", "/subscription", "/plans", "/insurance",
  "/platform/plans", "/checkout", "/theme-test",
]);

function AutoPending() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  if (TABLE.has(pathname)) return <TableSkeleton rows={6} cols={5} />;
  if (INSIGHT.has(pathname)) return <AnalyticsSkeleton />;
  if (FORM.has(pathname)) return <FormSkeleton fields={4} />;
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
