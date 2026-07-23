/**
 * dual-probe.functions.ts
 * ────────────────────────
 * Intern's original dual-probe (ambient vs core) monitoring depended on
 * `sensor_readings.probe_type / temperature_value / humidity_value` splits
 * that do not exist in the production Supabase schema on `main`
 * (see docs/ml/FINAL_PLAN.md §2). This file is kept as a safe stub so
 * imports keep type-checking; the real implementation will land once the
 * dual-probe schema migration is approved.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProbeType = "ambient" | "core";

export const submitDualProbeReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        siloId: z.string().uuid(),
        ambient: z.object({ temperature: z.number(), humidity: z.number() }).optional(),
        core: z.object({ temperature: z.number(), humidity: z.number() }).optional(),
      })
      .parse(d),
  )
  .handler(async () => ({ ok: false, reason: "dual_probe_schema_pending" as const }));

export const getDualProbeComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siloId: z.string().uuid() }).parse(d))
  .handler(async () => ({
    ambient: null as null | { temperature: number; humidity: number },
    core: null as null | { temperature: number; humidity: number },
    deltaTemperature: null as number | null,
    deltaHumidity: null as number | null,
    trustworthy: false,
    reason: "dual_probe_schema_pending" as const,
  }));
