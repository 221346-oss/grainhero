/**
 * The server function exposing the portfolio summary to the dashboard.
 *
 * Thin on purpose: the arithmetic lives in `portfolio.server.ts`, which has no
 * server-function imports and can therefore be tested directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildPortfolioSummary } from "./portfolio.server";

export type { PortfolioCity, PortfolioSummary } from "./portfolio.server";

export const getPortfolioSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ range: z.enum(["today", "7d", "30d", "mtd", "ytd"]).default("mtd") })
      .parse(data ?? {}),
  )
  .handler(({ context, data }) =>
    buildPortfolioSummary(context.supabase, context.userId, data.range),
  );
