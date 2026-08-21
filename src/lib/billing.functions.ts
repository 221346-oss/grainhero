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

    // Merge plan_thresholds limits into the subscription row so usePlanLimits
    // always reflects super admin's latest values even when max_* cols are null.
    let mergedSub = sub;
    if (sub?.plan_name) {
      // Map subscription plan_name (e.g. "Grain Enterprise") to plan_thresholds plan_id (e.g. "enterprise")
      const planNameToId: Record<string, string> = {
        "grain starter": "basic",
        "starter": "basic",
        "basic": "basic",
        "grain professional": "intermediate",
        "professional": "intermediate",
        "intermediate": "intermediate",
        "growth": "intermediate",
        "grain enterprise": "pro",
        "enterprise": "pro",
        "pro": "pro",
        "scale": "pro",
      };
      const planKey = planNameToId[sub.plan_name.toLowerCase()] ?? sub.plan_name.toLowerCase();
      console.log("[getMySubscription] plan_name:", sub.plan_name, "→ planKey:", planKey);
      console.log("[getMySubscription] Querying plan_thresholds with plan_id:", planKey);
      const { data: threshold } = await context.supabase
        .from("plan_thresholds")
        .select("max_silos, max_warehouses, max_users, max_batches, max_sensors, max_actuators")
        .eq("plan_id", planKey)
        .maybeSingle();
      if (threshold) {
        // Always prefer threshold values — subscription row may have stale 999999 defaults
        mergedSub = {
          ...sub,
          max_silos:       threshold.max_silos       ?? sub.max_silos,
          max_warehouses:  threshold.max_warehouses  ?? sub.max_warehouses,
          max_users:       threshold.max_users       ?? sub.max_users,
          max_batches:     threshold.max_batches     ?? sub.max_batches,
          max_sensors:     threshold.max_sensors     ?? sub.max_sensors,
          max_actuators:   threshold.max_actuators   ?? sub.max_actuators,
        };
        console.log("[getMySubscription] Merged threshold:", JSON.stringify(threshold));
        console.log("[getMySubscription] Final max_batches:", mergedSub.max_batches, "max_users:", mergedSub.max_users);
      } else {
        console.log("[getMySubscription] No threshold found for planKey:", planKey);
      }
    }

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
      subscription: mergedSub,
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
      .select("id, invoice_number, buyer_name, buyer_company, batch_ref, items, subtotal, total_amount, amount_paid, currency, payment_status, due_date, paid_at, created_at, dispatch_id, grain_dispatches:dispatch_id(dispatch_number, total_qty_kg, vehicle_number, driver_name, grain_type), grain_batches:batch_id(grain_type)");

    let payQuery = context.supabase
      .from("buyer_payments")
      .select("id, amount, currency, payment_method, payment_reference, status, payment_date, buyer_id, invoice_id, dispatch_id, receipt_url, created_at, grain_dispatches:dispatch_id(dispatch_number, grain_type)");

    // Approved-and-beyond dispatches — regardless of whether they ever went
    // through the invoice step (the wizard's "Skip invoice -> Dispatch" path
    // means a dispatch can exist with no buyer_invoices row at all), so this
    // can't be derived from `invoices` above. Used for the Outstanding
    // payments table: a dispatch the admin approved but then closed the
    // wizard before finishing the payment step has nowhere else to surface.
    let dispQuery = context.supabase
      .from("grain_dispatches")
      .select("id, dispatch_number, grain_type, total_amount, currency, status, dispatched_at, created_at, buyers:buyer_id(name, company_name)")
      .in("status", ["confirmed", "in_transit", "delivered"]);

    if (adminId) {
      invQuery = invQuery.eq("admin_id", adminId);
      payQuery = payQuery.eq("admin_id", adminId);
      dispQuery = dispQuery.eq("admin_id", adminId);
    }

    const [invRes, payRes, dispRes] = await Promise.all([
      invQuery.order("created_at", { ascending: false }).limit(200),
      payQuery.order("payment_date", { ascending: false }).limit(200),
      dispQuery.order("created_at", { ascending: false }).limit(200),
    ]);

    const invoices = (invRes.data ?? []) as any[];
    const payments = (payRes.data ?? []) as any[];
    const dispatchesForPayment = (dispRes.data ?? []) as any[];

    const paidByDispatch = new Map<string, number>();
    for (const p of payments) {
      if (!p.dispatch_id) continue;
      if ((p.status ?? "completed") !== "completed") continue;
      paidByDispatch.set(p.dispatch_id, (paidByDispatch.get(p.dispatch_id) ?? 0) + Number(p.amount ?? 0));
    }
    const outstandingDispatches = dispatchesForPayment
      .map((d) => {
        const paid = paidByDispatch.get(d.id) ?? 0;
        const total = Number(d.total_amount ?? 0);
        return { ...d, paid, remaining: Math.max(0, total - paid) };
      })
      .filter((d) => d.remaining > 0);

    const invoiced = invoices.reduce((s, x) => s + Number(x.total_amount ?? 0), 0);
    const collected = payments.filter((p) => (p.status ?? "completed") === "completed").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const overdueInvoices = invoices.filter((x) => x.due_date && new Date(x.due_date) < new Date() && x.payment_status !== "paid");
    const totals = {
      invoiced,
      // "paid" kept for back-compat with any older callers; Collected/Outstanding
      // tiles use `collected` (actual recorded payments) per the spec.
      paid: invoices.reduce((s, x) => s + Number(x.amount_paid ?? 0), 0),
      collected,
      outstanding: Math.max(0, invoiced - collected),
      // "Due" tile — amount currently past-due (a subset of Outstanding, not
      // all of it), distinct from the count used for its caption.
      due: overdueInvoices.reduce((s, x) => s + Math.max(0, Number(x.total_amount ?? 0) - Number(x.amount_paid ?? 0)), 0),
      overdue: overdueInvoices.length,
      countInvoices: invoices.length,
      countPayments: payments.length,
    };

    const byStatus: Record<string, number> = {};
    for (const i of invoices) {
      const k = i.payment_status ?? "pending";
      byStatus[k] = (byStatus[k] ?? 0) + 1;
    }

    return { invoices, payments, totals, byStatus, outstandingDispatches };
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