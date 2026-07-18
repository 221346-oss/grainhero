/**
 * Phase 18 — Tax rules & seller registrations.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const listTaxRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any).from("tax_rules")
      .select("*").order("region", { ascending: true });
    return { rows: (data as Row[]) ?? [] };
  });

export const upsertTaxRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid().optional(),
    region: z.string().min(2).max(80),
    ruleType: z.enum(["vat","gst","sales","withholding"]),
    ratePct: z.number().min(0).max(100),
    appliesTo: z.enum(["buyer","seller","platform_fee"]),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional().nullable(),
    active: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const payload = {
      region: data.region, rule_type: data.ruleType, rate_pct: data.ratePct,
      applies_to: data.appliesTo,
      effective_from: data.effectiveFrom ?? undefined,
      effective_to: data.effectiveTo ?? null,
      active: data.active ?? true, notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await sb.from("tax_rules").update(payload).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("tax_rules").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const archiveTaxRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase
      .rpc("is_super_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("tax_rules")
      .update({ active: false }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listMyTaxRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any).from("tax_registrations")
      .select("*").eq("seller_id", context.userId);
    return { rows: (data as Row[]) ?? [] };
  });

export const upsertTaxRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    region: z.string().min(2).max(80),
    ruleType: z.string().min(2).max(20),
    registrationNumber: z.string().min(1).max(80),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("tax_registrations")
      .upsert({
        seller_id: context.userId,
        region: data.region, rule_type: data.ruleType,
        registration_number: data.registrationNumber,
      }, { onConflict: "seller_id,region,rule_type" });
    if (error) throw error;
    return { ok: true };
  });