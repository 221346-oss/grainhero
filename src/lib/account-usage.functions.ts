/**
 * The server function exposing account usage to the all-locations overview.
 *
 * Thin on purpose: the logic lives in `account-usage.server.ts`, which has no
 * server-function imports and can therefore be tested directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildAccountUsage } from "./account-usage.server";

export type { AccountMember, AccountUsage } from "./account-usage.server";

export const getAccountUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => buildAccountUsage(context.supabase, context.userId));
