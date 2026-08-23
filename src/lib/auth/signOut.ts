/**
 * Phase 2 — Centralized client sign-out drain.
 *
 * Order matters:
 *   1. cancelQueries — stop in-flight queries so they don't 401-flash.
 *   2. clear         — drop cached protected data (back-button safety).
 *   3. signOut       — clear Supabase session (fires SIGNED_OUT event).
 *   4. navigate      — history REPLACE so Back doesn't restore the route.
 *
 * Fire-and-forget the security event so a slow log write never blocks
 * the user from getting out of the app.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/security-events.functions";

type NavigateFn = ReturnType<typeof useNavigate>;

export async function performSignOut(opts: {
  queryClient: QueryClient;
  navigate: NavigateFn;
  reason?: "user" | "expired" | "forced";
}) {
  const { queryClient, navigate, reason = "user" } = opts;
  void logSecurityEvent({ data: { event: "sign_out", meta: { reason } } }).catch(() => {});
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
  navigate({ to: "/auth", replace: true });
}
