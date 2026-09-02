/**
 * Phase 14 — Server function wrapper for invoice PDF generation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { renderInvoicePdf } = await import("@/lib/invoicing-pdf.server");
    return renderInvoicePdf(context.supabase, data.invoiceId);
  });
