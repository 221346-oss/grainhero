import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { DashboardSkeleton } from "@/components/app/skeletons";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Instant navigation: show a skeleton immediately while the next route loads,
    // instead of freezing on the previous page until data resolves.
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultPendingComponent: () => (
      <div className="p-4 sm:p-6 lg:p-8">
        <DashboardSkeleton />
      </div>
    ),
  });

  return router;
};
