import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias route so super-admin notification links resolve to the shared timeline.
export const Route = createFileRoute("/_authenticated/platform/insurance/claims/$claimId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/insurance-claims/$claimId",
      params: { claimId: params.claimId },
    });
  },
});