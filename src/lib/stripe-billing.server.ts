/**
 * Stripe-native billing helpers. Stripe is the source of truth for
 * proration, invoicing, and cycle math. We only cache the resolved plan
 * on `profiles` after Stripe webhooks confirm state changes.
 */
import { stripeFetch, stripeForm } from "@/lib/stripe-api.server";

export type Cycle = "monthly" | "yearly";

/** Yearly = 10 × monthly (2 months free). */
export function yearlyFromMonthlyCents(monthlyCents: number) {
  return monthlyCents * 10;
}

type PlanRow = {
  plan_id: string;
  name: string | null;
  price_cents: number;
  currency: string | null;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
};

/**
 * Ensure a Stripe Product + recurring Prices (monthly, yearly) exist for a
 * plan_thresholds row. Idempotent — caches the resulting IDs back onto the
 * row so subsequent calls are free.
 */
export async function ensurePlanStripeIds(
  supabaseAdmin: any,
  planId: string,
): Promise<{ productId: string; monthlyPriceId: string; yearlyPriceId: string; currency: string; monthlyCents: number }> {
  const { data, error } = await supabaseAdmin
    .from("plan_thresholds")
    .select("plan_id, name, price_cents, currency, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Plan not found: ${planId}`);
  const row = data as PlanRow;
  const currency = (row.currency ?? "PKR").toLowerCase();
  const monthlyCents = row.price_cents;

  let productId = row.stripe_product_id;
  let monthlyPriceId = row.stripe_price_monthly_id;
  let yearlyPriceId = row.stripe_price_yearly_id;

  if (!productId) {
    const product = await stripeFetch("/products", stripeForm({
      name: row.name ?? planId,
      "metadata[plan_id]": planId,
    }));
    productId = (product as { id: string }).id;
  }

  if (!monthlyPriceId) {
    const price = await stripeFetch("/prices", stripeForm({
      product: productId,
      currency,
      unit_amount: monthlyCents,
      "recurring[interval]": "month",
      "metadata[plan_id]": planId,
      "metadata[cycle]": "monthly",
    }));
    monthlyPriceId = (price as { id: string }).id;
  }

  if (!yearlyPriceId) {
    const price = await stripeFetch("/prices", stripeForm({
      product: productId,
      currency,
      unit_amount: yearlyFromMonthlyCents(monthlyCents),
      "recurring[interval]": "year",
      "metadata[plan_id]": planId,
      "metadata[cycle]": "yearly",
    }));
    yearlyPriceId = (price as { id: string }).id;
  }

  if (
    productId !== row.stripe_product_id ||
    monthlyPriceId !== row.stripe_price_monthly_id ||
    yearlyPriceId !== row.stripe_price_yearly_id
  ) {
    await supabaseAdmin
      .from("plan_thresholds")
      .update({
        stripe_product_id: productId,
        stripe_price_monthly_id: monthlyPriceId,
        stripe_price_yearly_id: yearlyPriceId,
      } as never)
      .eq("plan_id", planId);
  }

  return { productId, monthlyPriceId, yearlyPriceId, currency, monthlyCents };
}

export function priceIdForCycle(
  ids: { monthlyPriceId: string; yearlyPriceId: string },
  cycle: Cycle,
): string {
  return cycle === "yearly" ? ids.yearlyPriceId : ids.monthlyPriceId;
}

/** Get or create a Stripe customer for a signed-in user and cache it on profiles. */
export async function ensureStripeCustomer(
  supabaseAdmin: any,
  userId: string,
): Promise<string> {
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, email, name")
    .eq("id", userId)
    .maybeSingle();
  const p = prof as { stripe_customer_id?: string | null; email?: string | null; name?: string | null } | null;
  if (p?.stripe_customer_id) return p.stripe_customer_id;
  const customer = await stripeFetch("/customers", stripeForm({
    email: p?.email ?? undefined,
    name: p?.name ?? undefined,
    "metadata[user_id]": userId,
  }));
  const id = (customer as { id: string }).id;
  await supabaseAdmin.from("profiles").update({ stripe_customer_id: id } as never).eq("id", userId);
  return id;
}

/**
 * Preview a plan change through Stripe's upcoming-invoice endpoint so the
 * quoted proration matches exactly what Stripe will bill.
 */
export async function previewUpcomingInvoice(args: {
  customerId: string;
  subscriptionId: string | null;
  subscriptionItemId: string | null;
  newPriceId: string;
}): Promise<{ amountDueCents: number; currency: string; prorationDateSeconds: number }> {
  const prorationDate = Math.floor(Date.now() / 1000);
  const body: Record<string, string | number | undefined> = {
    customer: args.customerId,
    subscription_proration_behavior: "always_invoice",
    subscription_proration_date: prorationDate,
  };
  if (args.subscriptionId && args.subscriptionItemId) {
    body["subscription"] = args.subscriptionId;
    body["subscription_items[0][id]"] = args.subscriptionItemId;
    body["subscription_items[0][price]"] = args.newPriceId;
  } else {
    body["subscription_items[0][price]"] = args.newPriceId;
  }
  const inv = await stripeFetch("/invoices/upcoming", null, "GET").catch(() => null);
  // Stripe requires GET with query string for /invoices/upcoming; fall back manually.
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) if (v !== undefined) qs.append(k, String(v));
  const key = process.env.STRIPE_SECRET_KEY!;
  const res = await fetch(`https://api.stripe.com/v1/invoices/upcoming?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe preview failed: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(text) as { amount_due: number; currency: string };
  void inv;
  return {
    amountDueCents: parsed.amount_due,
    currency: parsed.currency,
    prorationDateSeconds: prorationDate,
  };
}