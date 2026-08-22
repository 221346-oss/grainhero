/**
 * Phase 11 — Invoice generation & manual payment recording.
 * PDF generation is deferred; this stores a stub `pdf_url` and marks
 * `emailed`. Real PDF/email can be wired via Resend later.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity } from "@/lib/activity";
import { insertInvoiceWithUniqueNumber } from "@/lib/invoice-number";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const generateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("buyer_invoices").select("id").eq("order_id", data.orderId).maybeSingle();
    if (existing) return { id: (existing as Row).id as string, existed: true };

    const { data: order, error } = await context.supabase
      .from("buyer_orders")
      .select("id, admin_id, buyer_id, batch_id, order_number, quantity_kg, unit_price, subtotal, currency, buyers(name, company_name, contact_email, contact_phone, address, city, country), grain_listings(title, grain_batches(batch_number))")
      .eq("id", data.orderId).single();
    if (error || !order) throw new Error("Order not found");
    const o = order as Row;
    if (!o.batch_id) throw new Error("Order has no batch");

    const items = [{
      description: (o.grain_listings as Row)?.title ?? "Grain",
      quantity_kg: Number(o.quantity_kg),
      unit_price: Number(o.unit_price),
      total: Number(o.subtotal),
    }];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const inv = await insertInvoiceWithUniqueNumber<Row>(context.supabase, o.admin_id as string, (invoiceNumber) =>
      context.supabase.from("buyer_invoices").insert({
        admin_id: o.admin_id, invoice_number: invoiceNumber,
        buyer_id: o.buyer_id, batch_id: o.batch_id, order_id: o.id,
        buyer_name: (o.buyers as Row)?.name ?? null,
        buyer_company: (o.buyers as Row)?.company_name ?? null,
        buyer_contact: {
          email: (o.buyers as Row)?.contact_email,
          phone: (o.buyers as Row)?.contact_phone,
          address: (o.buyers as Row)?.address,
          city: (o.buyers as Row)?.city,
          country: (o.buyers as Row)?.country,
        },
        batch_ref: (o.grain_listings as Row)?.grain_batches?.batch_number ?? null,
        items, subtotal: Number(o.subtotal), total_amount: Number(o.subtotal),
        currency: o.currency, payment_status: "pending",
        due_date: dueDate.toISOString().slice(0, 10),
        created_by: context.userId,
      } as never).select("id, invoice_number").single(),
    );
    const invoiceNumber = inv.invoice_number as string;

    // Move order to invoiced if still confirmed
    await context.supabase.from("buyer_orders")
      .update({ status: "invoiced" } as never)
      .eq("id", o.id).eq("status", "confirmed");

    await context.supabase.from("buyer_order_events").insert({
      order_id: o.id, admin_id: o.admin_id, from_state: "confirmed", to_state: "invoiced",
      actor_user_id: context.userId, note: `Invoice ${invoiceNumber} generated`,
    } as never);

    await logActivity({
      actorId: context.userId, tenantAdminId: o.admin_id as string,
      action: "invoice.generated", targetType: "buyer_invoice",
      targetId: (inv as Row).id as string,
      meta: { orderId: o.id, invoiceNumber, total: o.subtotal },
    });
    // Try to render PDF + email — best effort, tolerate failures.
    let pdfUrl: string | null = null;
    try {
      const [{ loadMarketplaceSettings }, { renderInvoicePdf }] = await Promise.all([
        import("@/lib/marketplace-settings.functions"),
        import("@/lib/invoicing-pdf.server"),
      ]);
      const settings = await loadMarketplaceSettings(context.supabase);
      if (settings.invoicing.autoGenerateOnPaid) {
        const rendered = await renderInvoicePdf(context.supabase, (inv as Row).id as string);
        pdfUrl = rendered.signedUrl;
      }
      if (settings.invoicing.emailInvoiceOnPaid) {
        await sendInvoiceEmailAndTrack(context.supabase, (inv as Row).id as string, o.id as string);
      }
    } catch (e) {
      console.warn("[invoice-pdf] generation failed:", (e as Error).message);
    }
    return { id: (inv as Row).id as string, invoiceNumber, existed: false, pdfUrl };
  });

export async function sendInvoiceEmailAndTrack(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any, invoiceId: string, orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const { data: cur } = await sb.from("buyer_invoices")
    .select("email_attempts").eq("id", invoiceId).maybeSingle();
  const nextAttempts = ((cur as { email_attempts?: number } | null)?.email_attempts ?? 0) + 1;
  try {
    const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
    await sendBuyerOrderEmail(sb, orderId, "invoiceReady");
    await sb.from("buyer_invoices").update({
      email_status: "sent", email_error: null, emailed: true, emailed_at: nowIso,
      email_last_attempt_at: nowIso, email_attempts: nextAttempts,
    } as never).eq("id", invoiceId);
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    await sb.from("buyer_invoices").update({
      email_status: "failed", email_error: msg,
      email_attempts: nextAttempts, email_last_attempt_at: nowIso,
    } as never).eq("id", invoiceId);
    return { ok: false, error: msg };
  }
}

export const resendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv } = await context.supabase
      .from("buyer_invoices").select("id, order_id, admin_id").eq("id", data.invoiceId).maybeSingle();
    const i = inv as Row | null;
    if (!i || !i.order_id) throw new Error("Invoice / order not found");
    // Authorize: caller must be the tenant admin, super_admin, or the buyer.
    const { data: role } = await context.supabase.rpc("get_my_role", { _user_id: context.userId });
    const isStaff = role === "super_admin" || role === "admin" || role === "manager";
    if (!isStaff) {
      const { data: order } = await context.supabase
        .from("buyer_orders").select("buyer_account_id").eq("id", i.order_id).maybeSingle();
      const buyerAccountId = (order as Row | null)?.buyer_account_id;
      const { data: acc } = buyerAccountId
        ? await context.supabase.from("buyer_accounts").select("user_id").eq("id", buyerAccountId).maybeSingle()
        : { data: null };
      if ((acc as Row | null)?.user_id !== context.userId) throw new Error("Forbidden");
    }
    return sendInvoiceEmailAndTrack(context.supabase, i.id as string, i.order_id as string);
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMethod: z.string().min(1),
    reference: z.string().max(200).optional(),
    note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv } = await context.supabase
      .from("buyer_invoices")
      .select("id, admin_id, buyer_id, batch_id, order_id, total_amount, amount_paid, currency")
      .eq("id", data.invoiceId).single();
    const i = inv as Row | null;
    if (!i) throw new Error("Invoice not found");

    const { error } = await context.supabase.from("buyer_payments").insert({
      admin_id: i.admin_id, buyer_id: i.buyer_id, invoice_id: i.id, batch_id: i.batch_id,
      amount: data.amount, currency: i.currency,
      payment_method: data.paymentMethod, payment_reference: data.reference ?? null,
      payment_date: new Date().toISOString(), notes: data.note ?? null,
      status: "completed", recorded_by: context.userId,
    } as never);
    if (error) throw error;

    const newPaid = Number(i.amount_paid ?? 0) + data.amount;
    const fullyPaid = newPaid >= Number(i.total_amount) - 0.01;
    await context.supabase.from("buyer_invoices").update({
      amount_paid: newPaid,
      payment_status: fullyPaid ? "paid" : "partial",
      paid_via: data.paymentMethod,
      paid_at: fullyPaid ? new Date().toISOString() : null,
    } as never).eq("id", i.id);

    if (fullyPaid && i.order_id) {
      await context.supabase.from("buyer_orders")
        .update({ status: "paid" } as never).eq("id", i.order_id).eq("status", "invoiced");
      await context.supabase.from("buyer_order_events").insert({
        order_id: i.order_id, admin_id: i.admin_id,
        from_state: "invoiced", to_state: "paid",
        actor_user_id: context.userId, note: `Payment received (${data.paymentMethod})`,
      } as never);
    }

    await logActivity({
      actorId: context.userId, tenantAdminId: i.admin_id as string,
      action: fullyPaid ? "invoice.paid" : "invoice.payment_partial",
      targetType: "buyer_invoice", targetId: i.id as string,
      meta: { amount: data.amount, method: data.paymentMethod, invoiceId: i.id },
    });
    return { ok: true, fullyPaid, amountPaid: newPaid };
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    status: z.enum(["pending", "partial", "paid", "overdue", "all"]).default("all"),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("buyer_invoices")
      .select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("payment_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { invoices: (rows ?? []) as Row[] };
  });

export const getSalesSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [listingsRes, ordersRes, invoicesRes] = await Promise.all([
      context.supabase.from("grain_listings")
        .select("id, status, available_kg, price_per_kg"),
      context.supabase.from("buyer_orders")
        .select("id, status, subtotal, currency, created_at"),
      context.supabase.from("buyer_invoices")
        .select("id, payment_status, total_amount, amount_paid, currency, due_date, created_at"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listings = (listingsRes.data ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = (ordersRes.data ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = (invoicesRes.data ?? []) as any[];

    const activeListings = listings.filter((l) => l.status === "active").length;
    const openOrders = orders.filter((o) => !["completed","cancelled","refunded"].includes(o.status)).length;
    const revenue30d = invoices
      .filter((i) => i.payment_status === "paid" && new Date(i.created_at as string) > new Date(Date.now() - 30*86400000))
      .reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
    const outstanding = invoices
      .filter((i) => i.payment_status !== "paid")
      .reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid ?? 0)), 0);
    return { activeListings, openOrders, revenue30d, outstanding, totalListings: listings.length, totalOrders: orders.length };
  });
