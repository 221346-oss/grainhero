/**
 * Grain dispatches — outbound sales from a silo, drawing FIFO across
 * remaining batches. Cost is the weighted average across drawn batches.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const createInput = z.object({
  siloId: z.string().uuid(),
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
  expectedDate: z.string().optional().nullable(),
  vehicleNumber: z.string().max(50).optional().nullable(),
  driverName: z.string().max(200).optional().nullable(),
  driverContact: z.string().max(50).optional().nullable(),
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
      .select("id, batch_id, grain_type, quantity_kg, remaining_kg, purchase_price_per_kg, harvest_date, created_at, supplier_name, farmer_name")
      .eq("silo_id", data.siloId)
      .gt("remaining_kg", 0)
      .order("harvest_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (data.grainType) q = q.eq("grain_type", data.grainType as never);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { batches: (rows ?? []) as Row[] };
  });

export const createDispatchFromSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    // 1. Silo + tenant
    const { data: silo, error: sErr } = await sb
      .from("silos")
      .select("id, admin_id, warehouse_id, current_occupancy_kg")
      .eq("id", data.siloId)
      .single();
    if (sErr || !silo) throw new Error("Silo not found");
    const adminId = (silo as Row).admin_id as string;

    // 2. FIFO batches (oldest first)
    const { data: batchesRaw, error: bErr } = await sb
      .from("grain_batches")
      .select("id, batch_id, quantity_kg, remaining_kg, purchase_price_per_kg, grain_type")
      .eq("silo_id", data.siloId)
      .eq("grain_type", data.grainType as never)
      .gt("remaining_kg", 0)
      .order("harvest_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (bErr) throw bErr;
    const batches = (batchesRaw ?? []) as Row[];
    const totalAvailable = batches.reduce((s, b) => s + Number(b.remaining_kg ?? 0), 0);
    if (totalAvailable < data.qtyKg) {
      throw new Error(`Not enough ${data.grainType} in silo (have ${totalAvailable} kg, need ${data.qtyKg} kg)`);
    }

    // 3. Allocate FIFO
    const allocs: { batch_id: string; qty_kg: number; unit_cost: number | null }[] = [];
    let need = data.qtyKg;
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
    const totalCostVal = avgCost != null ? Number((avgCost * data.qtyKg).toFixed(2)) : null;
    const totalAmount = Number((data.pricePerKg * data.qtyKg).toFixed(2));
    const profit = totalCostVal != null ? Number((totalAmount - totalCostVal).toFixed(2)) : null;

    // 4. Resolve or create buyer
    let buyerId = data.buyerId ?? null;
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

    // 5. Insert dispatch
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
        status: "confirmed",
        expected_date: data.expectedDate ?? null,
        dispatched_at: data.stage === "staged" ? null : new Date().toISOString(),
        stage: data.stage,
        price_basis: data.priceBasis ?? "manual",
        market_price_snapshot: data.marketPriceSnapshot ?? null,
        avg_cost_snapshot: avgCost,
        vehicle_number: data.vehicleNumber ?? null,
        driver_name: data.driverName ?? null,
        driver_contact: data.driverContact ?? null,
        destination: data.destination ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (dErr) throw dErr;
    const dispatchId = (disp as Row).id as string;

    // 6. Allocations (trigger will recompute remaining_kg + status per batch)
    const { error: aErr } = await sb.from("grain_dispatch_allocations").insert(
      allocs.map((a) => ({ ...a, dispatch_id: dispatchId })) as never,
    );
    if (aErr) throw aErr;

    // 7. Update silo occupancy
    const newOcc = Math.max(0, Number((silo as Row).current_occupancy_kg ?? 0) - data.qtyKg);
    await sb.from("silos").update({ current_occupancy_kg: newOcc, updated_by: context.userId } as never).eq("id", data.siloId);

    await logActivity({
      actorId: context.userId,
      tenantAdminId: adminId,
      action: "dispatch.created",
      targetType: "grain_dispatch",
      targetId: dispatchId,
      meta: { siloId: data.siloId, qtyKg: data.qtyKg, pricePerKg: data.pricePerKg, totalAmount, profit },
    });

    return { id: dispatchId, dispatchNumber, totalAmount, avgCost, profit, allocations: allocs.length };
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