import { createMiddleware } from "@tanstack/react-start";

/**
 * Server-function middleware that refuses to run when the caller is a
 * super_admin currently impersonating a tenant. Attach to any mutation
 * that changes tenant data — impersonation is view-only.
 */
export const blockIfImpersonating = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { readImpersonationCookie } = await import("./impersonation.server");
    if (readImpersonationCookie()) {
      throw new Error(
        "Read-only while impersonating. Exit impersonation to make changes.",
      );
    }
    return next();
  },
);