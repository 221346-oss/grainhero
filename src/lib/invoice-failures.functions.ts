/**
 * Phase 15.5 — Invoice email failure queue for super/admin staff.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendInvoiceEmailAndTrack } from "./invoicing.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function requireStaff(sb: unknown, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = sb as any;
  const { data } = await c.rpc("get_my_role", { _user_id: userId });
  if (!["super_admin", "admin", "manager"].includes(data as string)) {
    throw new Error("Forbidden");
  }
}

export const listInvoiceEmailFailures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    scope: z.enum(["failed", "attempted", "all"]).default("failed"),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_invoices")
      .select("id, invoice_number, order_id, admin_id, buyer_name, buyer_company, total_amount, currency, email_status, email_error, email_attempts, email_last_attempt_at, emailed_at, created_at, buyer_orders(order_number, status)")
      .order("email_last_attempt_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.scope === "failed") q = q.eq("email_status", "failed");
    else if (data.scope === "attempted") q = q.gt("email_attempts", 0);
    const { data: rows, error } = await q;
    if (error) throw error;

    const list = (rows ?? []) as Row[];
    const sellerIds = Array.from(new Set(list.map((r) => r.admin_id).filter(Boolean))) as string[];
    const { data: profiles } = sellerIds.length
      ? await sb.from("profiles").select("id, name, email").in("id", sellerIds)
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((p: Row) => [p.id, p.name ?? p.email ?? p.id]));
    const invoices = list.map((r) => ({
      ...r,
      sellerName: (nameOf.get(r.admin_id as string) as string | undefined) ?? "—",
    })) as Row[];
    return { invoices };
  });

export const getInvoiceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [inv, events] = await Promise.all([
      sb.from("buyer_invoices").select("*").eq("order_id", data.orderId).maybeSingle(),
      sb.from("buyer_order_events").select("*").eq("order_id", data.orderId).order("created_at", { ascending: true }),
    ]);
    return { invoice: inv.data ?? null, events: events.data ?? [] };
  });

/**
 * Per-invoice email retry history (email_send_log rows related to the invoice
 * plus the invoice's own attempt counters).
 */
export const getInvoiceRetryHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: inv } = await sb
      .from("buyer_invoices")
      .select("id, invoice_number, order_id, buyer_email, email_status, email_error, email_attempts, email_last_attempt_at, emailed_at")
      .eq("id", data.invoiceId).maybeSingle();
    const { data: log } = await sb
      .from("email_send_log")
      .select("id, template_key, recipient, status, error, created_at, metadata")
      .contains("metadata", { invoice_id: data.invoiceId })
      .order("created_at", { ascending: false })
      .limit(50);
    return { invoice: inv ?? null, history: log ?? [] };
  });

/**
 * Bulk-retry a set of invoice IDs. Reports per-invoice outcome so the UI can
 * show partial success.
 */
export const bulkRetryInvoiceEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    invoiceIds: z.array(z.string().uuid()).min(1).max(50),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("buyer_invoices")
      .select("id, order_id")
      .in("id", data.invoiceIds);
    const results: Array<{ invoiceId: string; ok: boolean; error?: string }> = [];
    for (const r of ((rows ?? []) as Row[])) {
      if (!r.order_id) { results.push({ invoiceId: r.id, ok: false, error: "no order" }); continue; }
      try {
        const out = await sendInvoiceEmailAndTrack(context.supabase, r.id, r.order_id);
        results.push({ invoiceId: r.id, ok: !!out?.ok, error: out?.ok ? undefined : (out?.error ?? "failed") });
      } catch (e) {
        results.push({ invoiceId: r.id, ok: false, error: (e as Error).message });
      }
    }
    const succeeded = results.filter((r) => r.ok).length;
    return { results, succeeded, failed: results.length - succeeded };
  });

/**
 * Export current failure/attempt list to CSV.
 */
export const exportInvoiceFailuresCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    scope: z.enum(["failed", "attempted", "all"]).default("failed"),
    limit: z.number().int().min(1).max(1000).default(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_invoices")
      .select("invoice_number, order_id, buyer_name, buyer_company, buyer_email, total_amount, currency, email_status, email_error, email_attempts, email_last_attempt_at, emailed_at, created_at, buyer_orders(order_number, status)")
      .order("email_last_attempt_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.scope === "failed") q = q.eq("email_status", "failed");
    else if (data.scope === "attempted") q = q.gt("email_attempts", 0);
    const { data: rows } = await q;
    const header = [
      "invoice_number", "order_number", "order_status", "buyer_name", "buyer_company",
      "buyer_email", "total_amount", "currency", "email_status", "attempts",
      "last_attempt_at", "emailed_at", "created_at", "last_error",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of ((rows ?? []) as Row[])) {
      lines.push([
        r.invoice_number, r.buyer_orders?.order_number ?? "", r.buyer_orders?.status ?? "",
        r.buyer_name ?? "", r.buyer_company ?? "", r.buyer_email ?? "",
        r.total_amount ?? "", r.currency ?? "",
        r.email_status ?? "", r.email_attempts ?? 0,
        r.email_last_attempt_at ?? "", r.emailed_at ?? "", r.created_at,
        r.email_error ?? "",
      ].map(escape).join(","));
    }
    return { csv: lines.join("\n"), rows: (rows ?? []).length };
  });

/**
 * Export current failure/attempt list to a printable PDF summary.
 */
export const exportInvoiceFailuresPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    scope: z.enum(["failed", "attempted", "all"]).default("failed"),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_invoices")
      .select("invoice_number, buyer_name, buyer_company, total_amount, currency, email_status, email_attempts, email_last_attempt_at, email_error, buyer_orders(order_number)")
      .order("email_last_attempt_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.scope === "failed") q = q.eq("email_status", "failed");
    else if (data.scope === "attempted") q = q.gt("email_attempts", 0);
    const { data: rows } = await q;
    const items = (rows ?? []) as Row[];

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const primary = rgb(0.22, 0.51, 0.34);
    const muted = rgb(0.45, 0.45, 0.45);
    let page = pdf.addPage([595, 842]);
    let y = 800;
    page.drawText("GrainHero", { x: 40, y, font: bold, size: 12, color: primary });
    y -= 24;
    page.drawText(`Invoice email failures — ${data.scope}`, { x: 40, y, font: bold, size: 18 });
    y -= 14;
    page.drawText(`Generated ${new Date().toLocaleString()} · ${items.length} rows`,
      { x: 40, y, font, size: 9, color: muted });
    y -= 18;
    page.drawText("Invoice   Order   Buyer   Attempts   Last attempt   Status   Error",
      { x: 40, y, font: bold, size: 9 });
    y -= 12;
    for (const r of items) {
      if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
      const attempts = String(r.email_attempts ?? 0);
      const last = r.email_last_attempt_at ? new Date(r.email_last_attempt_at).toLocaleString() : "—";
      const line = `${r.invoice_number}  ${r.buyer_orders?.order_number ?? "—"}  ${(r.buyer_name ?? r.buyer_company ?? "—").slice(0, 22)}  ${attempts}  ${last}  ${r.email_status ?? "—"}  ${(r.email_error ?? "").slice(0, 40)}`;
      page.drawText(line, { x: 40, y, font, size: 8 });
      y -= 11;
    }
    const bytes = await pdf.save();
    // Return base64 so the client can trigger a download.
    const b64 = Buffer.from(bytes).toString("base64");
    return { pdfBase64: b64, rows: items.length };
  });