/**
 * Phase 15.5 — Invoice email failure queue for super/admin staff.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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