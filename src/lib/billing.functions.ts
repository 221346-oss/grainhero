import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getEffectiveRole } from "./rbac.server";

async function role(supabase: any, userId: string) {
  return getEffectiveRole(supabase, userId);
}

async function tenantAdminId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.rpc("get_tenant_admin_id", { _user_id: userId });
  if (!data) throw new Error("No tenant admin");
  return data as string;
}

// ---------- Subscription ----------

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const adminId = await tenantAdminId(context.supabase, context.userId);
    const r = await role(context.supabase, context.userId);

    const { data: subs } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("admin_id", adminId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const sub = subs?.[0] ?? null;

    // Live usage (tenant-scoped via RLS-safe counts on admin_id)
    const [batches, warehouses, silos, sensors, team] = await Promise.all([
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }).eq("admin_id", adminId).is("deleted_at", null),
      context.supabase.from("warehouses").select("id", { count: "exact", head: true }).eq("admin_id", adminId),
      context.supabase.from("silos").select("id", { count: "exact", head: true }).eq("admin_id", adminId),
      context.supabase.from("sensor_devices").select("id", { count: "exact", head: true }).eq("admin_id", adminId),
      context.supabase.from("profiles").select("id", { count: "exact", head: true }).or(`id.eq.${adminId},admin_id.eq.${adminId}`),
    ]);

    const { data: invoices } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("admin_id", adminId)
      .order("billing_date", { ascending: false })
      .limit(20);

    return {
      role: r,
      subscription: sub,
      usage: {
        batches: batches.count ?? 0,
        warehouses: warehouses.count ?? 0,
        silos: silos.count ?? 0,
        devices: sensors.count ?? 0,
        users: team.count ?? 0,
      },
      invoices: invoices ?? [],
    };
  });

const cancelInput = z.object({ reason: z.string().max(500).optional() });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    if (!["super_admin", "admin"].includes(r)) throw new Error("Forbidden");
    const adminId = await tenantAdminId(context.supabase, context.userId);

    const { data: sub, error: e1 } = await context.supabase
      .from("subscriptions")
      .select("id")
      .eq("admin_id", adminId)
      .in("status", ["active", "trial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (e1) throw e1;
    if (!sub) throw new Error("No active subscription to cancel");

    const { error } = await context.supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        auto_renew: false,
        cancellation_date: new Date().toISOString(),
        cancellation_reason: data.reason ?? null,
      })
      .eq("id", sub.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Revenue (buyer invoices & payments) ----------

export const getRevenueOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context.supabase, context.userId);
    if (!["super_admin", "admin", "manager"].includes(r)) throw new Error("Forbidden");

    let adminId: string | null = null;
    try {
      adminId = await tenantAdminId(context.supabase, context.userId);
    } catch (e) {
      if (r !== "super_admin") throw e;
    }

    let invQuery = context.supabase
      .from("buyer_invoices")
      .select("id, invoice_number, buyer_name, buyer_company, batch_ref, subtotal, total_amount, amount_paid, currency, payment_status, due_date, paid_at, created_at");

    let payQuery = context.supabase
      .from("buyer_payments")
      .select("id, amount, currency, payment_method, payment_reference, status, payment_date, buyer_id, invoice_id, created_at");

    if (adminId) {
      invQuery = invQuery.eq("admin_id", adminId);
      payQuery = payQuery.eq("admin_id", adminId);
    }

    const [invRes, payRes] = await Promise.all([
      invQuery.order("created_at", { ascending: false }).limit(200),
      payQuery.order("payment_date", { ascending: false }).limit(200),
    ]);

    const invoices = (invRes.data ?? []) as any[];
    const payments = (payRes.data ?? []) as any[];

    const totals = {
      invoiced: invoices.reduce((s, x) => s + Number(x.total_amount ?? 0), 0),
      paid: invoices.reduce((s, x) => s + Number(x.amount_paid ?? 0), 0),
      outstanding: invoices.reduce((s, x) => s + Math.max(0, Number(x.total_amount ?? 0) - Number(x.amount_paid ?? 0)), 0),
      overdue: invoices.filter((x) => x.due_date && new Date(x.due_date) < new Date() && x.payment_status !== "paid").length,
      countInvoices: invoices.length,
      countPayments: payments.length,
      collected: payments.filter((p) => (p.status ?? "completed") !== "failed").reduce((s, p) => s + Number(p.amount ?? 0), 0),
    };

    const byStatus: Record<string, number> = {};
    for (const i of invoices) {
      const k = i.payment_status ?? "pending";
      byStatus[k] = (byStatus[k] ?? 0) + 1;
    }

    return { invoices, payments, totals, byStatus };
  });

const markPaidInput = z.object({ id: z.string().uuid(), amount: z.number().nonnegative().optional() });

export const markInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => markPaidInput.parse(d))
  .handler(async ({ data, context }) => {
    const r = await role(context.supabase, context.userId);
    if (!["super_admin", "admin", "manager"].includes(r)) throw new Error("Forbidden");

    const { data: inv, error: e1 } = await context.supabase
      .from("buyer_invoices")
      .select("id, total_amount")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!inv) throw new Error("Invoice not found");

    const paid = data.amount ?? Number(inv.total_amount);
    const status = paid >= Number(inv.total_amount) ? "paid" : "partial";

    const { error } = await context.supabase
      .from("buyer_invoices")
      .update({
        amount_paid: paid,
        payment_status: status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });