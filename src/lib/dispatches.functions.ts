/**
 * Grain dispatches — outbound sales from a silo, drawing FIFO across
 * remaining batches. Cost is the weighted average across drawn batches.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** FIFO-allocate `qtyKg` of `grainType` out of `siloId`'s available batches, oldest first. */
async function computeFifoAllocation(sb: Row, siloId: string, grainType: string, qtyKg: number) {
  const { data: batchesRaw, error: bErr } = await sb
    .from("grain_batches")
    .select("id, batch_id, quantity_kg, dispatched_quantity_kg, remaining_kg, purchase_price_per_kg, grain_type")
    .eq("silo_id", siloId)
    .eq("grain_type", grainType as never)
    .order("harvest_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (bErr) throw bErr;
  // remaining_kg is only backfilled once a batch has been through the
  // dispatch-allocation trigger — a batch that's never been dispatched from
  // still has remaining_kg = NULL even though it clearly has stock.
  const batches: Row[] = ((batchesRaw ?? []) as Row[])
    .map((b) => ({
      ...b,
      remaining_kg: b.remaining_kg ?? Math.max(0, Number(b.quantity_kg ?? 0) - Number(b.dispatched_quantity_kg ?? 0)),
    }))
    .filter((b) => Number(b.remaining_kg) > 0);
  const totalAvailable = batches.reduce((s, b) => s + Number(b.remaining_kg ?? 0), 0);
  if (totalAvailable < qtyKg) {
    throw new Error(`Not enough ${grainType} in silo (have ${totalAvailable} kg, need ${qtyKg} kg)`);
  }

  const allocs: { batch_id: string; qty_kg: number; unit_cost: number | null }[] = [];
  let need = qtyKg;
  let totalCost = 0;
  let costedQty = 0;
  for (const b of batches) {
    if (need <= 0) break;
    const take = Math.min(need, Number(b.remaining_kg));
    const unit = b.purchase_price_per_kg == null ? null : Number(b.purchase_price_per_kg);
    allocs.push({ batch_id: b.id, qty_kg: take, unit_cost: unit });
    if (unit != null) {
      totalCost += unit * take;
      costedQty += take;
    }
    need -= take;
  }
  const avgCost = costedQty > 0 ? totalCost / costedQty : null;
  return { allocs, avgCost };
}

const createInput = z.object({
  siloId: z.string().uuid(),
  buyerId: z.string().uuid().nullable().optional(),
  invoiceId: z.string().uuid().nullable().optional(),
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
  expectedDate: z.string().optional().nullable(),
  vehicleNumber: z.string().max(50).optional().nullable(),
  driverName: z.string().max(200).optional().nullable(),
  driverContact: z.string().max(50).optional().nullable(),
  driverCnic: z.string().max(20).optional().nullable(),
  dispatchPhotoPath: z.string().max(2000).optional().nullable(),
  destination: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  priceBasis: z.enum(["cost_margin", "market", "manual"]).optional().nullable(),
  marketPriceSnapshot: z.number().nonnegative().optional().nullable(),
  stage: z.enum(["staged", "in_transit", "delivered"]).default("staged"),
});

export const listSiloAvailableBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ siloId: z.string().uuid(), grainType: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("grain_batches")
      .select("id, batch_id, grain_type, quantity_kg, dispatched_quantity_kg, remaining_kg, purchase_price_per_kg, harvest_date, created_at, supplier_name, farmer_name")
      .eq("silo_id", data.siloId)
      .order("harvest_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (data.grainType) q = q.eq("grain_type", data.grainType as never);
    const { data: rows, error } = await q;
    if (error) throw error;
    // remaining_kg is only backfilled once a batch has been through the
    // dispatch-allocation trigger — a batch that's never been dispatched
    // from still has remaining_kg = NULL even though it clearly has stock,
    // so fall back to quantity_kg - dispatched_quantity_kg like the silo
    // detail page's own batches table already does.
    const batches: Row[] = ((rows ?? []) as Row[])
      .map((b) => ({
        ...b,
        remaining_kg: b.remaining_kg ?? Math.max(0, Number(b.quantity_kg ?? 0) - Number(b.dispatched_quantity_kg ?? 0)),
      }))
      .filter((b) => Number(b.remaining_kg) > 0);
    return { batches };
  });

/**
 * Tenant-wide map of silos that currently have an active (not yet
 * delivered/cancelled) dispatch against them — lets any "Sell"/dispatch
 * entry point (DispatchDialog, DispatchSaleWizard's silo picker) show
 * "Dispatch pending approval" up front instead of letting the admin fill
 * out a whole form only to hit createDispatchFromSilo's server-side guard.
 */
export const listSilosWithActiveDispatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_dispatches")
      .select("silo_id, dispatch_number, status")
      .not("status", "in", "(delivered,cancelled)");
    if (error) throw error;
    return { active: (data ?? []) as Array<{ silo_id: string; dispatch_number: string; status: string }> };
  });

/**
 * Creates a dispatch (sale) request as a "draft" — this only records what's
 * being requested and a cost/profit *preview*. It does NOT touch batch
 * remaining_kg or silo occupancy yet: grain must not leave the books until an
 * Admin approves it (see approveDispatch below), mirroring how the intake QC
 * pipeline gates stock on adminReviewBatch rather than on batch creation.
 */
export const createDispatchFromSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    // Mirrors upsertGrainBatch's create-time gate — the UI only ever exposes
    // "Outgoing batch" to admin/manager, but that's a client-side hide only.
    await requireRole(context.supabase, context.userId, ["admin", "manager"]);
    const sb = context.supabase;
    const { data: silo, error: sErr } = await sb
      .from("silos")
      .select("id, name, admin_id, warehouse_id, current_occupancy_kg")
      .eq("id", data.siloId)
      .single();
    if (sErr || !silo) throw new Error("Silo not found");
    const adminId = (silo as Row).admin_id as string;

    // Exactly one dispatch may be in flight against a silo at a time — a
    // second draft/confirmed/in_transit dispatch against the same silo is
    // how the same stock ends up requested twice with no visible warning.
    // Only delivered/cancelled dispatches free the silo up again.
    const { data: existingDispatch, error: existingErr } = await sb
      .from("grain_dispatches")
      .select("id, dispatch_number, status")
      .eq("silo_id", data.siloId)
      .not("status", "in", "(delivered,cancelled)")
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingDispatch) {
      const ed = existingDispatch as Row;
      throw new Error(`This silo already has a pending dispatch (${ed.dispatch_number}, status: ${ed.status}) — resolve it before starting a new one.`);
    }

    // If this dispatch is fulfilling a Step-1 invoice/quote, pull the buyer off
    // it and make sure it's a real, unlinked, same-tenant invoice.
    let invoiceBuyerId: string | null = null;
    if (data.invoiceId) {
      const { data: inv, error: invErr } = await sb
        .from("buyer_invoices")
        .select("id, admin_id, buyer_id, dispatch_id")
        .eq("id", data.invoiceId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!inv) throw new Error("Invoice not found");
      const invoiceRow = inv as Row;
      if (invoiceRow.admin_id !== adminId) throw new Error("Invoice belongs to a different tenant");
      if (invoiceRow.dispatch_id) throw new Error("Invoice is already linked to a dispatch");
      invoiceBuyerId = invoiceRow.buyer_id as string | null;
    }

    // Preview-only FIFO simulation, purely for the cost/profit estimate shown
    // to whoever is creating the request — the real allocation is redone at
    // approval time against then-current stock.
    const { allocs, avgCost } = await computeFifoAllocation(sb, data.siloId, data.grainType, data.qtyKg);
    const totalCostVal = avgCost != null ? Number((avgCost * data.qtyKg).toFixed(2)) : null;
    const totalAmount = Number((data.pricePerKg * data.qtyKg).toFixed(2));
    const profit = totalCostVal != null ? Number((totalAmount - totalCostVal).toFixed(2)) : null;

    let buyerId = data.buyerId ?? invoiceBuyerId ?? null;
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
        .select("id")
        .single();
      if (nErr) throw nErr;
      buyerId = (nb as Row).id as string;
    }

    const dispatchNumber = `DSP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const { data: disp, error: dErr } = await sb
      .from("grain_dispatches")
      .insert({
        admin_id: adminId,
        silo_id: data.siloId,
        warehouse_id: (silo as Row).warehouse_id ?? null,
        buyer_id: buyerId,
        dispatch_number: dispatchNumber,
        grain_type: data.grainType,
        total_qty_kg: data.qtyKg,
        price_per_kg: data.pricePerKg,
        currency: data.currency,
        total_amount: totalAmount,
        avg_unit_cost: avgCost,
        total_cost: totalCostVal,
        profit,
        status: "draft",
        expected_date: data.expectedDate ?? null,
        dispatched_at: null,
        stage: data.stage,
        price_basis: data.priceBasis ?? "manual",
        market_price_snapshot: data.marketPriceSnapshot ?? null,
        avg_cost_snapshot: avgCost,
        vehicle_number: data.vehicleNumber ?? null,
        driver_name: data.driverName ?? null,
        driver_contact: data.driverContact ?? null,
        driver_cnic: data.driverCnic ?? null,
        dispatch_photo_url: data.dispatchPhotoPath ?? null,
        destination: data.destination ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (dErr) throw dErr;
    const dispatchId = (disp as Row).id as string;

    if (data.invoiceId) {
      const { error: linkErr } = await sb
        .from("buyer_invoices")
        .update({ dispatch_id: dispatchId } as never)
        .eq("id", data.invoiceId);
      if (linkErr) throw linkErr;
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId: adminId,
      action: "dispatch.requested",
      targetType: "grain_dispatch",
      targetId: dispatchId,
      meta: { siloId: data.siloId, qtyKg: data.qtyKg, pricePerKg: data.pricePerKg, totalAmount, profit },
    });

    // Notify tenant admins — this was missing entirely, regardless of which
    // of the several entry points (Business wizard, per-silo "Sell") created
    // the dispatch. Never blocks/fails dispatch creation on notify errors.
    try {
      const { emitToRole } = await import("./notify");
      await emitToRole(sb, adminId, "admin", {
        category: "ops",
        severity: "info",
        title: "New dispatch awaiting approval",
        body: `${dispatchNumber} — ${(silo as Row).name ?? "a silo"}, ${data.qtyKg.toLocaleString()} kg ${data.grainType}, ${data.currency} ${totalAmount.toLocaleString()}. Needs your approval before stock leaves.`,
        link: "/grain-operations?tab=silos",
        entityType: "grain_dispatch",
        entityId: dispatchId,
      });
    } catch (e) {
      console.warn("[createDispatchFromSilo] Failed to emit admin notification:", e);
    }

    return { id: dispatchId, dispatchNumber, totalAmount, avgCost, profit, allocations: allocs.length, status: "draft" as const };
  });

/**
 * Admin/manager: records that the buyer has confirmed the sale. Buyers are
 * external parties with no account/login in this system, so there's no way
 * for them to click a "confirm" button themselves — this lets whoever is
 * handling the sale record that confirmation happened (a call, a signed
 * note, a WhatsApp message) on the buyer's behalf. Required before
 * approveDispatch will release stock (see the gate below), mirroring how
 * the manager-batch QC pipeline gates on adminReviewBatch rather than on
 * batch creation.
 */
export const confirmDispatchBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin", "manager"]);
    const sb = context.supabase;

    const { data: full, error: fullErr } = await sb
      .from("grain_dispatches")
      .select("id, admin_id, status, buyer_confirmed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (fullErr) throw fullErr;
    if (!full) throw new Error("Dispatch not found");
    const disp = full as Row;
    if (disp.status !== "draft") throw new Error(`Dispatch isn't awaiting confirmation (currently ${disp.status})`);
    if (disp.buyer_confirmed_at) throw new Error("Buyer confirmation is already recorded for this dispatch");

    const confirmedAt = new Date().toISOString();
    const { error: updErr } = await sb.from("grain_dispatches").update({
      buyer_confirmed_at: confirmedAt,
      buyer_confirmed_by: context.userId,
    } as never).eq("id", data.id);
    if (updErr) throw updErr;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: disp.admin_id,
      action: "dispatch.buyer_confirmed",
      targetType: "grain_dispatch",
      targetId: data.id,
      severity: "warning",
      meta: { confirmedOnBehalfOfBuyer: true },
    });

    // Security event — an admin/manager is recording an action on behalf of
    // an external party with no account in this system, same audit-trail
    // treatment as batch_approval_override in batch-qc.functions.ts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      tenant_id: disp.admin_id,
      event: "buyer_confirmation_recorded_by_admin",
      meta: { dispatchId: data.id } as never,
    });

    return { ok: true, buyerConfirmedAt: confirmedAt };
  });

/**
 * Admin-only: approves a draft dispatch. This is the actual stock-effective
 * moment — FIFO allocation is (re)computed against current batch stock (not
 * whatever was available when the draft was requested), allocation rows are
 * inserted (firing the recalc trigger on grain_batches), and silo occupancy
 * is decremented. If stock has moved since the draft was requested and no
 * longer covers it, this throws rather than partially fulfilling.
 */
export const approveDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const sb = context.supabase;

    const { data: full, error: fullErr } = await sb
      .from("grain_dispatches")
      .select("id, admin_id, silo_id, grain_type, total_qty_kg, price_per_kg, stage, status, buyer_confirmed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (fullErr) throw fullErr;
    if (!full) throw new Error("Dispatch not found");
    const disp = full as Row;
    if (disp.status !== "draft") throw new Error(`Dispatch isn't awaiting approval (currently ${disp.status})`);
    if (!disp.buyer_confirmed_at) throw new Error("Buyer confirmation is required before approving this dispatch");

    const { data: silo, error: sErr } = await sb
      .from("silos")
      .select("id, current_occupancy_kg")
      .eq("id", disp.silo_id)
      .single();
    if (sErr || !silo) throw new Error("Silo not found");

    // Re-run FIFO now — this is the real allocation, superseding the preview
    // computed when the draft was created.
    const { allocs, avgCost } = await computeFifoAllocation(sb, disp.silo_id, disp.grain_type, Number(disp.total_qty_kg));
    const totalCostVal = avgCost != null ? Number((avgCost * Number(disp.total_qty_kg)).toFixed(2)) : null;
    const totalAmount = Number((Number(disp.price_per_kg) * Number(disp.total_qty_kg)).toFixed(2));
    const profit = totalCostVal != null ? Number((totalAmount - totalCostVal).toFixed(2)) : null;

    const { error: aErr } = await sb.from("grain_dispatch_allocations").insert(
      allocs.map((a) => ({ ...a, dispatch_id: data.id })) as never,
    );
    if (aErr) throw aErr;

    const newOcc = Math.max(0, Number((silo as Row).current_occupancy_kg ?? 0) - Number(disp.total_qty_kg));
    const { error: occErr } = await sb.from("silos")
      .update({ current_occupancy_kg: newOcc, updated_by: context.userId } as never)
      .eq("id", disp.silo_id);
    if (occErr) throw occErr;

    const { error: updErr } = await sb.from("grain_dispatches").update({
      status: "confirmed",
      avg_unit_cost: avgCost,
      total_cost: totalCostVal,
      profit,
      avg_cost_snapshot: avgCost,
      dispatched_at: disp.stage === "staged" ? null : new Date().toISOString(),
    } as never).eq("id", data.id);
    if (updErr) throw updErr;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: disp.admin_id,
      action: "dispatch.approved",
      targetType: "grain_dispatch",
      targetId: data.id,
      meta: { siloId: disp.silo_id, qtyKg: disp.total_qty_kg, profit },
    });

    return { ok: true, avgCost, profit, allocations: allocs.length };
  });

/** Admin-only: rejects a draft dispatch. No stock was ever committed, so this is a pure status flip. */
export const rejectDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), reason: z.string().trim().max(500).optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const { data: disp, error: dErr } = await context.supabase
      .from("grain_dispatches").select("id, admin_id, silo_id, status").eq("id", data.id).maybeSingle();
    if (dErr) throw dErr;
    if (!disp) throw new Error("Dispatch not found");
    if ((disp as Row).status !== "draft") throw new Error(`Dispatch isn't awaiting approval (currently ${(disp as Row).status})`);

    const { error } = await context.supabase.from("grain_dispatches")
      .update({ status: "cancelled", notes: data.reason ?? null } as never)
      .eq("id", data.id);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: (disp as Row).admin_id,
      action: "dispatch.rejected",
      targetType: "grain_dispatch",
      targetId: data.id,
      meta: { reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const listDispatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        siloId: z.string().uuid().optional(),
        buyerId: z.string().uuid().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("grain_dispatches")
      .select("*, silos:silo_id(id, silo_id, name), buyers:buyer_id(id, name, company_name)")
      .order("dispatched_at", { ascending: false })
      .limit(data.limit);
    if (data.siloId) q = q.eq("silo_id", data.siloId);
    if (data.buyerId) q = q.eq("buyer_id", data.buyerId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { dispatches: (rows ?? []) as Row[] };
  });

export const updateDispatchStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      id: z.string().uuid(),
      stage: z.enum(["staged", "in_transit", "delivered"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Row = { stage: data.stage };
    if (data.stage === "in_transit") patch.dispatched_at = new Date().toISOString();
    if (data.stage === "delivered") patch.status = "delivered";
    const { error } = await context.supabase
      .from("grain_dispatches").update(patch as never).eq("id", data.id);
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      action: `dispatch.${data.stage}`,
      targetType: "grain_dispatch",
      targetId: data.id,
      meta: { stage: data.stage },
    });
    return { ok: true };
  });

export const getDispatchDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: d1, error: e1 } = await context.supabase
      .from("grain_dispatches")
      .select("*, silos:silo_id(id, silo_id, name), buyers:buyer_id(id, name, company_name, contact_phone)")
      .eq("id", data.id)
      .single();
    if (e1) throw e1;
    const { data: allocs, error: e2 } = await context.supabase
      .from("grain_dispatch_allocations")
      .select("*, grain_batches:batch_id(id, batch_id, grain_type)")
      .eq("dispatch_id", data.id);
    if (e2) throw e2;
    return { dispatch: d1 as Row, allocations: (allocs ?? []) as Row[] };
  });

/**
 * Signed upload URL for a dispatch/truck photo — same signed-upload-then-
 * attach shape as createReceiptUploadUrl in dispatch-sales.functions.ts, just
 * a separate bucket since this is a distinct kind of attachment.
 */
export const createDispatchPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ filename: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adminId } = await (context.supabase as any).rpc("get_tenant_admin_id", { _user_id: context.userId });
    // Falling back to context.userId here (instead of failing loudly like
    // createReceiptUploadUrl's tenantAdminId() helper does) would silently
    // put the upload in a folder the "dispatch photos: tenant insert" RLS
    // policy can never match — get_tenant_admin_id(auth.uid()) is
    // re-evaluated fresh at INSERT time and would never equal a bare
    // userId once a real admin_id exists, so WITH CHECK fails.
    if (!adminId) throw new Error("No tenant admin found for this account — cannot upload a dispatch photo");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${adminId}/${Date.now()}-${safe}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signed, error } = await (context.supabase as any).storage
      .from("dispatch-photos")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed?.token as string };
  });

export const getDispatchPhotoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: signed, error } = await (context.supabase as any).storage
      .from("dispatch-photos")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw error;
    return { url: signed?.signedUrl as string };
  });