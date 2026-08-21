/**
 * Phase 14 — Server-only invoice PDF generator.
 * Uses pdf-lib (worker-compatible) and uploads to the `invoices` bucket.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

type Row = Record<string, any>;

export async function renderInvoicePdf(
  sb: SupabaseClient<Database>,
  invoiceId: string,
): Promise<{ path: string; signedUrl: string }> {
  const settings = await loadMarketplaceSettings(sb);

  const client = sb as any;
  const { data: inv } = await client
    .from("buyer_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  const i = inv as Row | null;
  if (!i) throw new Error("Invoice not found");

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.05, 0.05, 0.05);
  const gray = rgb(0.45, 0.45, 0.45);

  const draw = (t: string, x: number, y: number, size = 10, f = font, color = black) =>
    page.drawText(t, { x, y, size, font: f, color });

  draw(settings.brandName, 40, 790, 18, bold);
  draw(settings.tagline, 40, 772, 9, font, gray);

  draw(`INVOICE ${i.invoice_number}`, 400, 790, 12, bold);
  draw(`Issued: ${new Date(i.created_at).toLocaleDateString()}`, 400, 772, 9, font, gray);
  if (i.due_date)
    draw(`Due: ${new Date(i.due_date).toLocaleDateString()}`, 400, 758, 9, font, gray);

  draw("Bill to", 40, 730, 9, bold, gray);
  draw(String(i.buyer_company ?? i.buyer_name ?? "—"), 40, 715, 11, bold);
  const contact = (i.buyer_contact ?? {}) as Row;
  const lines = [
    contact.email,
    contact.phone,
    contact.address,
    [contact.city, contact.country].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];
  lines.forEach((l, idx) => draw(String(l), 40, 700 - idx * 12, 9, font, gray));

  // Items table
  const tableY = 640;
  draw("Description", 40, tableY, 10, bold);
  draw("Qty (kg)", 320, tableY, 10, bold);
  draw("Unit", 400, tableY, 10, bold);
  draw("Total", 500, tableY, 10, bold);
  page.drawLine({
    start: { x: 40, y: tableY - 4 },
    end: { x: 555, y: tableY - 4 },
    thickness: 0.5,
    color: gray,
  });
  const items = Array.isArray(i.items) ? (i.items as Row[]) : [];
  items.forEach((it, idx) => {
    const y = tableY - 22 - idx * 18;
    draw(String(it.description ?? "").slice(0, 60), 40, y);
    draw(Number(it.quantity_kg ?? 0).toLocaleString(), 320, y);
    draw(`${i.currency} ${Number(it.unit_price ?? 0).toFixed(2)}`, 400, y);
    draw(`${i.currency} ${Number(it.total ?? 0).toFixed(2)}`, 500, y);
  });

  const totalsY = 480;
  draw("Subtotal", 400, totalsY, 10, bold);
  draw(`${i.currency} ${Number(i.subtotal ?? 0).toFixed(2)}`, 500, totalsY);
  draw("Total", 400, totalsY - 18, 12, bold);
  draw(`${i.currency} ${Number(i.total_amount ?? 0).toFixed(2)}`, 500, totalsY - 18, 12, bold);
  draw(
    `Status: ${String(i.payment_status ?? "").toUpperCase()}`,
    400,
    totalsY - 36,
    10,
    font,
    gray,
  );

  draw(settings.invoicing.footerNote, 40, 60, 9, font, gray);
  draw(`${settings.brandName} · ${settings.supportEmail}`, 40, 46, 8, font, gray);

  const bytes = await doc.save();
  const path = `${i.admin_id}/${i.invoice_number}.pdf`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from("invoices").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  const { data: signed } = await supabaseAdmin.storage
    .from("invoices")
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  const signedUrl = signed?.signedUrl ?? "";
  await client
    .from("buyer_invoices")
    .update({ pdf_url: signedUrl } as never)
    .eq("id", i.id);
  if (i.order_id) {
    await client
      .from("buyer_orders")
      .update({ invoice_pdf_url: signedUrl } as never)
      .eq("id", i.order_id);
  }
  return { path, signedUrl };
}
