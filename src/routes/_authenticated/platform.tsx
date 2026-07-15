import { createFileRoute, redirect } from "@tanstack/react-router";

// Old "Platform Console" layout removed — super admin manages everything from
// their dashboard. Redirect any /platform hit there.
export const Route = createFileRoute("/_authenticated/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});