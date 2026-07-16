import { createFileRoute, Outlet } from "@tanstack/react-router";

// Platform layout for super admin routes
export const Route = createFileRoute("/_authenticated/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}