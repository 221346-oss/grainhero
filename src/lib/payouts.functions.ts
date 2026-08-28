/**
 * Phase 18 — Seller payouts (super-admin approve → mark paid).
 * Uses finance ledger as the source of truth for balances.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

type Row = Record<string, any>;

async function ensureAdmin(ctx: { supabase: unknown; userId: string }) {
  const { data } = await (ctx.supabase as any).rpc("is_super_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

export const listPayableSellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const settings = await loadMarketplaceSettings(context.supabase);

    const sb = context.supabase as any;
    const { data } = await sb
      .from("finance_ledger_entries")
      .select("seller_id, direction, amount, status")
      .in("status", ["payable"]);
    const bySeller = new Map<string, number>();
    for (const r of (data as Row[]) ?? []) {
      if (!r.seller_id) continue;
      const cur = bySeller.get(r.seller_id) ?? 0;
      bySeller.set(r.seller_id, cur + (r.direction === "credit" ? 1 : -1) * Number(r.amount));
    }
    const min = settings.finance.minimumPayoutAmount;
    const ids = [...bySeller.entries()].filter(([, v]) => v >= min).map(([id]) => id);
    if (!ids.length) return { rows: [] };
    const { data: profs } = await sb.from("profiles").select("id, name, email").in("id", ids);
    const nameById = new Map<string, Row>();
    for (const p of (profs as Row[]) ?? []) nameById.set(p.id, p);
    return {
      rows: ids.map((id) => ({
        sellerId: id,
        name: nameById.get(id)?.name ?? "—",
        email: nameById.get(id)?.email ?? null,
        payable: Math.round((bySeller.get(id) ?? 0) * 100) / 100,
      })),
    };
  });

export const createPayoutBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        sellerIds: z.array(z.string().uuid()).min(1).max(200),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const settings = await loadMarketplaceSettings(context.supabase);

    const sb = context.supabase as any;
    const created: string[] = [];
    for (const sellerId of data.sellerIds) {
      const { data: entries } = await sb
        .from("finance_ledger_entries")
        .select("id, amount, direction, currency")
        .eq("seller_id", sellerId)
        .eq("status", "payable");
      const list = (entries as Row[]) ?? [];
      if (!list.length) continue;
      const gross = list.reduce(
        (s, r) => s + (r.direction === "credit" ? 1 : -1) * Number(r.amount),
        0,
      );
      if (gross < settings.finance.minimumPayoutAmount) continue;
      const currency = list[0]?.currency ?? settings.finance.defaultCurrency;
      const { data: payout, error } = await sb
        .from("seller_payouts")
        .insert({
          seller_id: sellerId,
          status: "pending",
          currency,
          gross_amount: gross,
          fees_amount: 0,
          tax_withheld: 0,
          net_amount: gross,
          notes: data.notes ?? null,
        })
        .select("id")
        .maybeSingle();
      if (error || !payout) continue;
      const items = list.map((r) => ({
        payout_id: payout.id,
        ledger_entry_id: r.id,
        amount: Number(r.amount),
      }));
      await sb.from("seller_payout_items").insert(items);
      created.push(payout.id);
      await logActivity({
        sb: context.supabase,
        actorId: context.userId,
        action: "payout.created",
        targetType: "seller_payout",
        targetId: payout.id,
        meta: { sellerId, gross },
      });
    }
    return { created };
  });

export const approvePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ payoutId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const sb = context.supabase as any;
    const { error } = await sb
      .from("seller_payouts")
      .update({
        status: "approved",
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.payoutId);
    if (error) throw error;
    await logActivity({
      sb: context.supabase,
      actorId: context.userId,
      action: "payout.approved",
      targetType: "seller_payout",
      targetId: data.payoutId,
    });
    return { ok: true };
  });

export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        payoutId: z.string().uuid(),
        reference: z.string().max(200).optional(),
        receiptUrl: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const sb = context.supabase as any;
    const { data: items } = await sb
      .from("seller_payout_items")
      .select("ledger_entry_id")
      .eq("payout_id", data.payoutId);
    const ids = ((items as Row[]) ?? []).map((r) => r.ledger_entry_id);
    if (ids.length) {
      await sb
        .from("finance_ledger_entries")
        .update({ status: "paid", payout_id: data.payoutId })
        .in("id", ids);
    }
    const { data: payout } = await sb
      .from("seller_payouts")
      .select("seller_id, net_amount, currency")
      .eq("id", data.payoutId)
      .maybeSingle();
    if (payout) {
      await sb.from("finance_ledger_entries").insert({
        entry_type: "payout_out",
        direction: "debit",
        amount: payout.net_amount,
        currency: payout.currency,
        seller_id: payout.seller_id,
        status: "paid",
        payout_id: data.payoutId,
        meta: { reference: data.reference ?? null },
      });
    }
    const { error } = await sb
      .from("seller_payouts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        reference: data.reference ?? null,
        receipt_url: data.receiptUrl ?? null,
      })
      .eq("id", data.payoutId);
    if (error) throw error;
    await logActivity({
      sb: context.supabase,
      actorId: context.userId,
      action: "payout.paid",
      targetType: "seller_payout",
      targetId: data.payoutId,
      meta: { reference: data.reference ?? null },
    });
    return { ok: true };
  });

export const cancelPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ payoutId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const sb = context.supabase as any;
    const { error } = await sb
      .from("seller_payouts")
      .update({
        status: "cancelled",
        failed_reason: data.reason ?? null,
      })
      .eq("id", data.payoutId);
    if (error) throw error;
    await logActivity({
      sb: context.supabase,
      actorId: context.userId,
      action: "payout.cancelled",
      targetType: "seller_payout",
      targetId: data.payoutId,
      meta: { reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const listPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        status: z.string().optional(),
        sellerId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });

    let q: any = (context.supabase as any)
      .from("seller_payouts")
      .select(
        "id, seller_id, status, currency, gross_amount, net_amount, method, reference, paid_at, approved_at, created_at, receipt_url",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (!isAdmin) q = q.eq("seller_id", context.userId);
    if (data.status) q = q.eq("status", data.status);
    if (data.sellerId) q = q.eq("seller_id", data.sellerId);
    const { data: rows } = await q;
    return { rows: (rows as Row[]) ?? [] };
  });

export const upsertPayoutAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        method: z.string().min(1).max(40),
        bankName: z.string().max(200).optional(),
        accountHolder: z.string().max(200).optional(),
        accountNumber: z.string().max(200).optional(),
        iban: z.string().max(80).optional(),
        swift: z.string().max(40).optional(),
        country: z.string().max(80).optional(),
        currency: z.string().length(3).optional(),
        minimumPayoutOverride: z.number().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const payload = {
      seller_id: context.userId,
      method: data.method,
      bank_name: data.bankName ?? null,
      account_holder: data.accountHolder ?? null,
      account_number_encrypted: data.accountNumber ?? null,
      iban_encrypted: data.iban ?? null,
      swift: data.swift ?? null,
      country: data.country ?? null,
      currency: data.currency ?? "USD",
      minimum_payout_override: data.minimumPayoutOverride ?? null,
    };
    const { error } = await sb
      .from("seller_payout_accounts")
      .upsert(payload, { onConflict: "seller_id" });
    if (error) throw error;
    return { ok: true };
  });

export const getMyPayoutAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb
      .from("seller_payout_accounts")
      .select("*")
      .eq("seller_id", context.userId)
      .maybeSingle();
    return { account: (data as Row) ?? null };
  });
