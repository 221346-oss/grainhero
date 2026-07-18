import { createFileRoute } from "@tanstack/react-router";

// Lightweight public status endpoint — safe for uptime pingers, no PII.
export const Route = createFileRoute("/api/public/v1/status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          data: {
            ok: true,
            service: "grainhero",
            version: "v1",
            build: process.env.CF_PAGES_COMMIT_SHA ?? process.env.VITE_BUILD_SHA ?? "dev",
            time: new Date().toISOString(),
          },
          meta: { version: "v1" },
        });
      },
    },
  },
});