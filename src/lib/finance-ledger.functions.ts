/**
 * Phase 18 — Finance ledger.
 * Append-only money movements: payment_in, refund_out, platform_fee,
 * logistics_cost, tax, payout_out, adjustment. Everything else reads from here.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface LedgerEntryInput {
  entryType:
    | "payment_in"
    | "refund_out"
    | "platform_fee"
    | "logistics_cost"
    | "tax"
    | "payout_out"
    | "adjustment";
  direction: "credit" | "debit";
  amount: number;
  currency?: string;
  sellerId?: string | null;
  orderId?: string | null;
  status?: "on_hold" | "payable" | "paid" | "void";
  holdUntilIso?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Write a ledger entry. Uses whichever client is passed (typically admin from a
 * webhook or a user client for adjustments). Idempotency is the caller's job —
 * pass metadata.dedupe_key and check upstream when needed.
 */
export async function writeLedgerEntry(sb: SupabaseClient<Database>, input: LedgerEntryInput) {
  const sbAny = sb as unknown as { from: (t: string) => Row };
  const { data, error } = await sbAny
    .from("finance_ledger_entries")
    .insert({
      entry_type: input.entryType,
      direction: input.direction,
      amount: input.amount,
      currency: input.currency ?? "USD",
      seller_id: input.sellerId ?? null,
      order_id: input.orderId ?? null,
      status: input.status ?? "on_hold",
      hold_until: input.holdUntilIso ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data as { id: string } | null;
}

function centsFromMinor(v: number) {
  return Math.round(v * 100) / 100;
}

export const getSellerBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ sellerId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sellerId = data.sellerId ?? context.userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("finance_ledger_entries")
      .select("amount, direction, status, currency, entry_type")
      .eq("seller_id", sellerId);
    const list = (rows ?? []) as Row[];
    let payable = 0,
      onHold = 0,
      paidOut = 0,
      lifetimeGross = 0,
      refunded = 0,
      fees = 0;
    for (const r of list) {
      const signed = (r.direction === "credit" ? 1 : -1) * Number(r.amount ?? 0);
      if (r.entry_type === "payment_in") lifetimeGross += Number(r.amount ?? 0);
      if (r.entry_type === "refund_out") refunded += Number(r.amount ?? 0);
      if (r.entry_type === "platform_fee" || r.entry_type === "logistics_cost")
        fees += Number(r.amount ?? 0);
      if (r.entry_type === "payout_out" && r.status === "paid") paidOut += Number(r.amount ?? 0);
      if (r.status === "on_hold") onHold += signed;
      else if (r.status === "payable") payable += signed;
    }
    return {
      currency: (list[0]?.currency as string) ?? "USD",
      payable: centsFromMinor(payable),
      onHold: centsFromMinor(onHold),
      paidOut: centsFromMinor(paidOut),
      lifetimeGross: centsFromMinor(lifetimeGross),
      refunded: centsFromMinor(refunded),
      fees: centsFromMinor(fees),
    };
  });

export const getPlatformFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ days: z.number().int().min(1).max(365).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden");
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("finance_ledger_entries")
      .select("entry_type, amount, currency, occurred_at, status")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: true });
    const list = (rows ?? []) as Row[];
    let gmv = 0,
      refunds = 0,
      platformFees = 0,
      tax = 0,
      logistics = 0,
      payoutsPaid = 0;
    const daily: Record<string, { day: string; gmv: number; fees: number; refunds: number }> = {};
    for (const r of list) {
      const amt = Number(r.amount ?? 0);
      const day = String(r.occurred_at).slice(0, 10);
      daily[day] ??= { day, gmv: 0, fees: 0, refunds: 0 };
      if (r.entry_type === "payment_in") {
        gmv += amt;
        daily[day].gmv += amt;
      } else if (r.entry_type === "refund_out") {
        refunds += amt;
        daily[day].refunds += amt;
      } else if (r.entry_type === "platform_fee") {
        platformFees += amt;
        daily[day].fees += amt;
      } else if (r.entry_type === "tax") tax += amt;
      else if (r.entry_type === "logistics_cost") logistics += amt;
      else if (r.entry_type === "payout_out" && r.status === "paid") payoutsPaid += amt;
    }
    // pending payouts
    const { data: pending } = await sb
      .from("seller_payouts")
      .select("net_amount")
      .in("status", ["pending", "approved", "processing"]);
    const pendingPayouts = ((pending as Row[]) ?? []).reduce(
      (s, r) => s + Number(r.net_amount ?? 0),
      0,
    );
    const settings = await loadMarketplaceSettings(context.supabase);
    return {
      currency: settings.finance.defaultCurrency,
      totals: {
        gmv: centsFromMinor(gmv),
        refunds: centsFromMinor(refunds),
        platformFees: centsFromMinor(platformFees),
        tax: centsFromMinor(tax),
        logistics: centsFromMinor(logistics),
        payoutsPaid: centsFromMinor(payoutsPaid),
        pendingPayouts: centsFromMinor(pendingPayouts),
        netRevenue: centsFromMinor(platformFees - logistics),
      },
      trend: Object.values(daily),
    };
  });

export const listLedgerEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).optional(),
        entryType: z.string().optional(),
        sellerId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (context.supabase as any)
      .from("finance_ledger_entries")
      .select(
        "id, entry_type, direction, amount, currency, seller_id, order_id, status, occurred_at, metadata",
      )
      .order("occurred_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (!isAdmin) q = q.eq("seller_id", context.userId);
    if (data.entryType) q = q.eq("entry_type", data.entryType);
    if (data.sellerId) q = q.eq("seller_id", data.sellerId);
    if (data.orderId) q = q.eq("order_id", data.orderId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { rows: (rows as Row[]) ?? [] };
  });
