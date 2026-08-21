/**
 * Business page workflow: Invoice (optional) -> Dispatch -> Payment, for
 * outgoing silo sales. This layers on top of the existing dispatch-approval
 * gate in dispatches.functions.ts (createDispatchFromSilo / approveDispatch)
 * rather than replacing it — Step 1 here only ever creates a quote in
 * buyer_invoices; the actual stock-effective dispatch still goes through
 * createDispatchFromSilo (draft) and approveDispatch (admin approval).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getEffectiveRole } from "./rbac.server";
import { insertInvoiceWithUniqueNumber } from "./invoice-number";

type Row = Record<string, any>;

async function tenantAdminId(supabase: unknown, userId: string): Promise<string> {
  const { data } = await (supabase as any).rpc("get_tenant_admin_id", { _user_id: userId });
  if (!data) throw new Error("No tenant admin");
  return data as string;
}

/**
 * Step 1 (optional): create a quote/invoice for a buyer before any grain has
 * moved. No batch_id / dispatch_id yet — those attach once the sale actually
 * goes through createDispatchFromSilo (see linkInvoiceId in that function).
 */
const createInvoiceInput = z.object({
  buyerId: z.string().uuid().nullable().optional(),
  newBuyer: z
    .object({
      name: z.string().min(1).max(200),
      contact_phone: z.string().max(50).optional().nullable(),
      contact_email: z.string().max(200).optional().nullable(),
    })
    .nullable()
    .optional(),
  grainType: z.string().min(1).max(50),
  qtyKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  currency: z.string().min(3).max(3).default("PKR"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createDispatchInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => createInvoiceInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["super_admin", "admin", "manager"].includes(role)) throw new Error("Forbidden");
    const sb = context.supabase;
    const adminId = await tenantAdminId(sb, context.userId);

    let buyerId = data.buyerId ?? null;
    let buyerRow: Row | null = null;
    if (!buyerId && data.newBuyer?.name) {
      const { data: nb, error: nErr } = await sb
        .from("buyers")
        .insert({
          admin_id: adminId,
          name: data.newBuyer.name,
          contact_name: data.newBuyer.name,
          contact_phone: data.newBuyer.contact_phone ?? null,
          contact_email: data.newBuyer.contact_email ?? null,
          buyer_type: "retailer",
          status: "active",
        } as never)
        .select("id, name, company_name, contact_phone, contact_email")
        .single();
      if (nErr) throw nErr;
      buyerRow = nb as Row;
      buyerId = buyerRow.id as string;
    } else if (buyerId) {
      const { data: b } = await sb
        .from("buyers")
        .select("id, name, company_name, contact_phone, contact_email")
        .eq("id", buyerId)
        .maybeSingle();
      buyerRow = b as Row | null;
    }
    if (!buyerId) throw new Error("Buyer required");

    const totalAmount = Number((data.pricePerKg * data.qtyKg).toFixed(2));
    const items = [
      {
        description: `${data.grainType} (dispatch quote)`,
        quantity_kg: data.qtyKg,
        unit_price: data.pricePerKg,
        total: totalAmount,
      },
    ];

    const invRow = await insertInvoiceWithUniqueNumber<Row>(sb, adminId, (invoiceNumber) =>
      sb
        .from("buyer_invoices")
        .insert({
          admin_id: adminId,
          invoice_number: invoiceNumber,
          buyer_id: buyerId,
          batch_id: null,
          dispatch_id: null,
          buyer_name: buyerRow?.name ?? null,
          buyer_company: buyerRow?.company_name ?? null,
          buyer_contact: buyerRow
            ? { phone: buyerRow.contact_phone, email: buyerRow.contact_email }
            : null,
          items,
          subtotal: totalAmount,
          total_amount: totalAmount,
          currency: data.currency,
          payment_status: "unpaid",
          due_date: data.dueDate ?? null,
          notes: data.notes ?? null,
          created_by: context.userId,
        } as never)
        .select("id, invoice_number")
        .single(),
    );

    await logActivity({
      actorId: context.userId,
      tenantAdminId: adminId,
      action: "invoice.quote_generated",
      targetType: "buyer_invoice",
      targetId: invRow.id as string,
      meta: { buyerId, grainType: data.grainType, qtyKg: data.qtyKg, totalAmount },
    });

    return {
      id: invRow.id as string,
      invoiceNumber: invRow.invoice_number as string,
      buyerId,
      totalAmount,
    };
  });

/**
 * Step 3: record a payment against a confirmed dispatch (and its invoice, if
 * any), pre-filled from OCR-extracted receipt details (see ocr-service.ts).
 * The dispatch must already be confirmed — payment only makes sense once
 * grain has actually left (approveDispatch has run).
 */
const recordPaymentInput = z.object({
  dispatchId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1).default("bank_transfer"),
  paymentReference: z.string().max(255).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  receiptUrl: z.string().max(2000).optional().nullable(),
  ocrExtracted: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const recordDispatchPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => recordPaymentInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["super_admin", "admin", "manager"].includes(role)) throw new Error("Forbidden");
    const sb = context.supabase;

    const { data: disp, error: dErr } = await sb
      .from("grain_dispatches")
      .select("id, admin_id, buyer_id, status, dispatch_number, total_amount, currency")
      .eq("id", data.dispatchId)
      .maybeSingle();
    if (dErr) throw dErr;
    if (!disp) throw new Error("Dispatch not found");
    const dispatch = disp as Row;
    if (dispatch.status === "draft")
      throw new Error(
        "Dispatch is still awaiting admin approval — payment can only be recorded after it's confirmed",
      );
    if (dispatch.status === "cancelled") throw new Error("Dispatch was cancelled");
    if (!dispatch.buyer_id) throw new Error("Dispatch has no buyer on record");

    const { data: inv } = await sb
      .from("buyer_invoices")
      .select("id, total_amount, amount_paid, currency")
      .eq("dispatch_id" as never, data.dispatchId)
      .maybeSingle();
    const invoice = inv as Row | null;

    const { error: pErr } = await sb.from("buyer_payments").insert({
      admin_id: dispatch.admin_id,
      buyer_id: dispatch.buyer_id,
      invoice_id: invoice?.id ?? null,
      dispatch_id: data.dispatchId,
      batch_id: null,
      amount: data.amount,
      currency: invoice?.currency ?? dispatch.currency ?? "PKR",
      payment_method: data.paymentMethod,
      payment_reference: data.paymentReference ?? null,
      payment_date: data.paymentDate ?? new Date().toISOString(),
      notes: data.notes ?? null,
      status: "completed",
      receipt_url: data.receiptUrl ?? null,
      ocr_extracted: data.ocrExtracted ?? null,
      recorded_by: context.userId,
    } as never);
    if (pErr) throw pErr;

    if (invoice) {
      const newPaid = Number(invoice.amount_paid ?? 0) + data.amount;
      const fullyPaid = newPaid >= Number(invoice.total_amount) - 0.01;
      const { error: uErr } = await sb
        .from("buyer_invoices")
        .update({
          amount_paid: newPaid,
          payment_status: fullyPaid ? "paid" : "partial",
          payment_method: data.paymentMethod,
          paid_at: fullyPaid ? new Date().toISOString() : null,
        } as never)
        .eq("id", invoice.id);
      if (uErr) throw uErr;
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId: dispatch.admin_id as string,
      action: "dispatch.payment_recorded",
      targetType: "grain_dispatch",
      targetId: data.dispatchId,
      meta: { amount: data.amount, method: data.paymentMethod, invoiceId: invoice?.id ?? null },
    });

    return { ok: true, invoiceId: invoice?.id ?? null };
  });

/** Issues a signed upload URL for a payment receipt screenshot (tenant-scoped path), used before OCR runs client-side. */
export const createReceiptUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ dispatchId: z.string().uuid(), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const adminId = await tenantAdminId(sb, context.userId);
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${adminId}/${data.dispatchId}/${Date.now()}-${safe}`;

    const { data: signed, error } = await (sb as any).storage
      .from("payment-receipts")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed?.token as string };
  });

/** Signed read URL for a stored receipt, used to display it back in the payments list. */
export const getReceiptSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await (context.supabase as any).storage
      .from("payment-receipts")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw error;
    return { url: signed?.signedUrl as string };
  });

/** Dispatches that are confirmed+ (i.e. past admin approval) and don't have a payment yet — feeds the wizard's Step 3 picker. */
export const listPayableDispatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const adminId = await tenantAdminId(sb, context.userId);
    const { data: dispatches, error } = await sb
      .from("grain_dispatches")
      .select(
        "id, dispatch_number, buyer_id, grain_type, total_qty_kg, price_per_kg, total_amount, currency, status, dispatched_at, buyers:buyer_id(id, name, company_name)",
      )
      .eq("admin_id", adminId)
      .in("status", ["confirmed", "in_transit", "delivered"])
      .order("dispatched_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const ids = ((dispatches ?? []) as Row[]).map((d) => d.id);
    const { data: paid } = ids.length
      ? await sb.from("buyer_payments").select("dispatch_id").in("dispatch_id", ids)
      : { data: [] };
    const paidIds = new Set(((paid ?? []) as Row[]).map((p) => p.dispatch_id));
    return { dispatches: ((dispatches ?? []) as Row[]).filter((d) => !paidIds.has(d.id)) };
  });
