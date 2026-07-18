/**
 * Phase 31 — server-only mobile checkout helpers.
 *
 * Pricing, fees, tax and validation live here so both the quote and the
 * checkout endpoints share the same math and cannot drift. No hardcoded
 * numbers: everything comes from `mobile_commerce_settings` + `tax_rules`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CommerceCfg = {
  id: string;
  checkout_enabled: boolean;
  allowed_payment_methods: string[];
  min_order_cents: number;
  max_order_cents: number;
  platform_fee_bps: number;
  currency_default: string;
  cod_max_cents: number;
  quote_ttl_seconds: number;
};

export type CartItem = { listing_id: string; quantity_kg: number; unit_price_cents: number };

export type QuoteResult = {
  currency: string;
  subtotal_cents: number;
  platform_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  ttl_seconds: number;
  warnings: string[];
  lines: Array<{
    listing_id: string;
    admin_id: string;
    batch_id: string | null;
    quantity_kg: number;
    unit_price_cents: number;
    subtotal_cents: number;
  }>;
};

export async function loadCommerceConfig(supabase: SupabaseClient<Database>): Promise<CommerceCfg> {
  const { data, error } = await supabase.from("mobile_commerce_settings")
    .select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("commerce_disabled");
  const row = data as unknown as Record<string, unknown>;
  const allowed = Array.isArray(row.allowed_payment_methods)
    ? (row.allowed_payment_methods as string[])
    : [];
  return {
    id: String(row.id),
    checkout_enabled: Boolean(row.checkout_enabled),
    allowed_payment_methods: allowed,
    min_order_cents: Number(row.min_order_cents ?? 0),
    max_order_cents: Number(row.max_order_cents ?? 0),
    platform_fee_bps: Number(row.platform_fee_bps ?? 0),
    currency_default: String(row.currency_default ?? "USD"),
    cod_max_cents: Number(row.cod_max_cents ?? 0),
    quote_ttl_seconds: Number(row.quote_ttl_seconds ?? 300),
  };
}

async function loadListings(supabase: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return new Map<string, { admin_id: string; batch_id: string | null; price_per_kg: number; available_kg: number; currency: string; status: string }>();
  const { data, error } = await supabase.from("grain_listings")
    .select("id, admin_id, batch_id, price_per_kg, available_kg, currency, status")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map<string, { admin_id: string; batch_id: string | null; price_per_kg: number; available_kg: number; currency: string; status: string }>();
  for (const r of (data ?? []) as Array<{
    id: string; admin_id: string; batch_id: string | null;
    price_per_kg: number | string; available_kg: number | string;
    currency: string; status: string;
  }>) {
    map.set(r.id, {
      admin_id: r.admin_id, batch_id: r.batch_id,
      price_per_kg: Number(r.price_per_kg), available_kg: Number(r.available_kg),
      currency: r.currency, status: r.status,
    });
  }
  return map;
}

async function loadTaxRate(supabase: SupabaseClient<Database>, region: string | null) {
  if (!region) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("tax_rules")
    .select("rate_pct, effective_from, effective_to, active")
    .eq("region", region).eq("active", true).limit(50);
  const rows = (data ?? []) as Array<{ rate_pct: number | string; effective_from: string | null; effective_to: string | null }>;
  const applicable = rows.find((r) =>
    (!r.effective_from || r.effective_from <= today) &&
    (!r.effective_to || r.effective_to >= today));
  return applicable ? Number(applicable.rate_pct) : 0;
}

export async function computeQuote(
  supabase: SupabaseClient<Database>,
  items: CartItem[],
  addressId: string | null,
  userId: string,
): Promise<QuoteResult> {
  const cfg = await loadCommerceConfig(supabase);
  if (!cfg.checkout_enabled) throw new Error("checkout_disabled");
  if (items.length === 0) throw new Error("cart_empty");

  const warnings: string[] = [];
  const listingIds = [...new Set(items.map((i) => i.listing_id))];
  const listings = await loadListings(supabase, listingIds);

  let currency = cfg.currency_default;
  const lines: QuoteResult["lines"] = [];
  let subtotal = 0;

  for (const item of items) {
    const l = listings.get(item.listing_id);
    if (!l) { warnings.push(`listing_missing:${item.listing_id}`); continue; }
    if (l.status !== "active") warnings.push(`listing_inactive:${item.listing_id}`);
    if (item.quantity_kg > l.available_kg) warnings.push(`insufficient_stock:${item.listing_id}`);
    // Trust server pricing — ignore client unit_price_cents drift, but surface it.
    const serverUnitCents = Math.round(l.price_per_kg * 100);
    if (serverUnitCents !== item.unit_price_cents) warnings.push(`price_updated:${item.listing_id}`);
    currency = l.currency ?? currency;
    const lineSubtotal = Math.round(item.quantity_kg * serverUnitCents);
    subtotal += lineSubtotal;
    lines.push({
      listing_id: item.listing_id, admin_id: l.admin_id, batch_id: l.batch_id,
      quantity_kg: item.quantity_kg, unit_price_cents: serverUnitCents,
      subtotal_cents: lineSubtotal,
    });
  }

  if (lines.length === 0) throw new Error("no_valid_lines");

  let region: string | null = null;
  if (addressId) {
    const { data: addr } = await supabase.from("buyer_addresses")
      .select("region, country, buyer_id").eq("id", addressId).maybeSingle();
    if (!addr) throw new Error("address_not_found");
    if ((addr as { buyer_id: string }).buyer_id !== userId) throw new Error("address_forbidden");
    region = (addr as { region: string | null; country: string }).region
      ?? (addr as { country: string }).country;
  }

  const taxRate = await loadTaxRate(supabase, region);
  const taxCents = Math.round((subtotal * taxRate) / 100);
  const feeCents = Math.floor((subtotal * cfg.platform_fee_bps) / 10000);
  const total = subtotal + taxCents + feeCents;

  if (total < cfg.min_order_cents) warnings.push(`below_min:${cfg.min_order_cents}`);
  if (cfg.max_order_cents > 0 && total > cfg.max_order_cents) warnings.push(`above_max:${cfg.max_order_cents}`);

  return {
    currency: currency.toUpperCase(),
    subtotal_cents: subtotal,
    platform_fee_cents: feeCents,
    tax_cents: taxCents,
    total_cents: total,
    ttl_seconds: cfg.quote_ttl_seconds,
    warnings,
    lines,
  };
}

/** Generate an order_number scoped to today. Best-effort uniqueness — DB unique index would be safer if you have one. */
export function nextOrderNumber() {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `M-${stamp}-${rnd}`;
}