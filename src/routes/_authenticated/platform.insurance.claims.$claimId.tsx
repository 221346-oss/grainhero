import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias route so super-admin notification links resolve to the shared timeline.
export const Route = createFileRoute("/_authenticated/platform/insurance/claims/$claimId")({
  head: () => ({
    meta: [
      { title: "Platform · Insurance · Claims · ClaimId — Grain Hero" },
      { name: "description", content: "Platform · Insurance · Claims · ClaimId workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Insurance · Claims · ClaimId — Grain Hero" },
      { property: "og:description", content: "Platform · Insurance · Claims · ClaimId workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/insurance-claims/$claimId",
      params: { claimId: params.claimId },
    });
  },
});