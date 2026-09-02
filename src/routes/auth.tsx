import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

// Legacy path — dedicated pages live at /auth/login, /auth/signup, etc.
// Only redirect the bare /auth URL; child routes (/auth/login, /auth/signup,
// /auth/forgot-password, /auth/reset-password) must render normally.
export const Route = createFileRoute("/auth")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/auth" || location.pathname === "/auth/") {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: () => <Outlet />,
});
