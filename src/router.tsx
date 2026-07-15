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
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: () => (
      <div className="p-6"><DashboardSkeleton /></div>
    ),
  });

  return router;
};
