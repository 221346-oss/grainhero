/**
 * Buyer Approval Workflow
 * 
 * Manager creates buyer → Status: pending_approval → Admin approves/rejects
 * If admin doesn't approve within 6 hours → Buyer auto-approved → Status: active
 * 
 * Similar to batch QC workflow but simpler (no multi-step QC process)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";
import { logActivity, logManagerAction } from "@/lib/activity";
import { assertPlanAllows } from "@/lib/plan-gate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function resolveTenantAdminId(supabase: Row, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("admin_id")
    .eq("id", userId)
    .maybeSingle();
  return (profile as { admin_id?: string | null } | null)?.admin_id ?? userId;
}

async function loadBuyerForTransition(supabase: Row, buyerId: string) {
  const { data, error } = await supabase
    .from("buyers")
    .select("id, admin_id, name, status, created_at, created_by, pending_approval_at, auto_approved_at")
    .eq("id", buyerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Buyer not found");
  return data as Row;
}

const buyerInput = z.object({
  name: z.string().min(1, "Buyer name is required").max(200),
  contact_name: z.string().min(1, "Contact name is required").max(200),
  contact_email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_designation: z.string().max(120).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  buyer_type: z
    .enum(["local_mill", "exporter", "wholesaler", "retailer", "government"])
    .optional()
    .nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  preferred_grain_types: z
    .array(z.enum(["Wheat", "Rice", "Maize", "Barley", "Sorghum"]))
    .optional()
    .nullable(),
  preferred_payment_terms: z.string().max(120).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Manager creates a new buyer (status: pending_approval)
 * Admin receives notification to approve
 */
export const createBuyerForApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => buyerInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["manager"]);
    
    // Check plan limits
    await assertPlanAllows({
      feature: "max_buyers",
      sb: context.supabase,
      userId: context.userId,
    });

    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    const payload = {
      name: data.name,
      contact_name: data.contact_name,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone ?? null,
      contact_designation: data.contact_designation ?? null,
      company_name: data.company_name ?? null,
      buyer_type: data.buyer_type ?? null,
      status: "pending_approval" as const,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      preferred_grain_types: data.preferred_grain_types ?? null,
      preferred_payment_terms: data.preferred_payment_terms ?? null,
      rating: data.rating ?? null,
      tags: data.tags ?? null,
      notes: data.notes ?? null,
      admin_id: tenantAdminId,
      created_by: context.userId,
      pending_approval_at: new Date().toISOString(),
    };

    const { data: buyer, error } = await context.supabase
      .from("buyers")
      .insert(payload as any)
      .select("*")
      .single();

    if (error) throw error;

    // Notify admin
    await context.supabase.from("notifications").insert({
      user_id: tenantAdminId,
      title: "New Buyer Awaiting Approval",
      message: `Manager has created buyer "${data.name}". Please review and approve within 6 hours.`,
      category: "buyer",
      severity: "info",
      entity_type: "buyer",
      entity_id: buyer.id,
      entity_ref: data.name,
    } as never);

    await logManagerAction({
      actorId: context.userId,
      managerId: context.userId,
      tenantAdminId,
      action: "buyer.created_pending_approval",
      targetType: "buyer",
      targetId: buyer.id,
      meta: {
        buyerName: data.name,
        companyName: data.company_name,
        requiresAdminApproval: true,
      },
    });

    return { ok: true, buyer };
  });

const adminReviewInput = z.object({
  buyerId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

/**
 * Admin reviews and approves/rejects buyer
 * approve → status: active
 * reject → status: rejected (can be deleted by manager)
 */
export const adminReviewBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => adminReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBuyerForTransition(context.supabase, data.buyerId);

    if (b.status !== "pending_approval")
      throw new Error(`Buyer isn't awaiting approval (currently ${b.status})`);

    const toStatus = data.decision === "approve" ? "active" : "rejected";

    const { error } = await context.supabase
      .from("buyers")
      .update({
        status: toStatus as never,
        ...(data.decision === "reject" && data.rejectionReason
          ? { notes: `REJECTED: ${data.rejectionReason}\n\n${b.notes || ""}` }
          : {}),
        updated_by: context.userId,
      } as never)
      .eq("id", data.buyerId);

    if (error) throw error;

    // Notify the manager who created the buyer
    if (b.created_by) {
      const notificationMessage =
        data.decision === "approve"
          ? `Buyer "${b.name}" has been approved by admin and is now active.`
          : `Buyer "${b.name}" was rejected by admin. Reason: ${data.rejectionReason || "None provided"}`;

      await context.supabase.from("notifications").insert({
        user_id: b.created_by,
        title: data.decision === "approve" ? "Buyer Approved" : "Buyer Rejected",
        message: notificationMessage,
        category: "buyer",
        severity: data.decision === "approve" ? "success" : "warning",
        entity_type: "buyer",
        entity_id: data.buyerId,
        entity_ref: b.name,
      } as never);
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: data.decision === "approve" ? "buyer.approved" : "buyer.rejected",
      targetType: "buyer",
      targetId: data.buyerId,
      meta: {
        buyerName: b.name,
        decision: data.decision,
        rejectionReason: data.rejectionReason ?? null,
      },
    });

    return { ok: true, status: toStatus };
  });

/**
 * Auto-approve buyers after 6 hours if admin hasn't responded
 * This should be called by a cron job or checked when loading buyers
 */
export const checkAndAutoApproveBuyers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Only managers and admins can trigger this check
    await requireRole(context.supabase, context.userId, ["admin", "manager"]);

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    // Find buyers pending approval for more than 6 hours
    const { data: pendingBuyers, error: fetchError } = await context.supabase
      .from("buyers")
      .select("*")
      .eq("status", "active")
      .lt("pending_approval_at", sixHoursAgo);

    if (fetchError) throw fetchError;

    const autoApproved: string[] = [];

    for (const buyer of pendingBuyers ?? []) {
      // Auto-approve the buyer
      const { error: updateError } = await context.supabase
        .from("buyers")
        .update({
          status: "active" as never,
          auto_approved_at: new Date().toISOString(),
        } as never)
        .eq("id", buyer.id);

      if (updateError) {
        console.error(`Failed to auto-approve buyer ${buyer.id}:`, updateError);
        continue;
      }

      // Notify admin that buyer was auto-approved
      await context.supabase.from("notifications").insert({
        user_id: buyer.admin_id,
        title: "Buyer Auto-Approved",
        message: `Buyer "${buyer.name}" was automatically approved after 6-hour timeout.`,
        category: "buyer",
        severity: "info",
        entity_type: "buyer",
        entity_id: buyer.id,
        entity_ref: buyer.name,
      } as never);

      // Notify the manager who created the buyer
      if (buyer.created_by) {
        await context.supabase.from("notifications").insert({
          user_id: buyer.created_by,
          title: "Buyer Auto-Approved",
          message: `Your buyer "${buyer.name}" has been automatically approved (admin approval timeout).`,
          category: "buyer",
          severity: "success",
          entity_type: "buyer",
          entity_id: buyer.id,
          entity_ref: buyer.name,
        } as never);
      }

      await logActivity({
        actorId: "system",
        tenantAdminId: buyer.admin_id,
        action: "buyer.auto_approved",
        targetType: "buyer",
        targetId: buyer.id,
        meta: {
          buyerName: buyer.name,
          reason: "Admin approval timeout exceeded (6 hours)",
          pendingSince: buyer.pending_approval_at,
        },
      });

      autoApproved.push(buyer.id);
    }

    return {
      ok: true,
      autoApprovedCount: autoApproved.length,
      autoApprovedIds: autoApproved,
    };
  });

/**
 * List buyers pending admin approval
 */
export const listPendingApprovalBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("buyers")
      .select(
        `
        *,
        created_by_profile:profiles!buyers_created_by_fkey(id, name, email)
      `,
      )
      .eq("admin_id", tenantAdminId)
      .eq("status", "pending_approval")
      .order("pending_approval_at", { ascending: true });

    if (error) throw error;

    // Calculate time remaining for each buyer
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    const now = Date.now();

    const buyersWithTimeRemaining = (data ?? []).map((buyer: Row) => {
      const pendingAt = new Date(buyer.pending_approval_at).getTime();
      const elapsed = now - pendingAt;
      const remaining = Math.max(0, sixHoursInMs - elapsed);
      const canAutoApprove = elapsed >= sixHoursInMs;

      return {
        ...buyer,
        hoursWaiting: (elapsed / (60 * 60 * 1000)).toFixed(1),
        minutesRemaining: Math.ceil(remaining / (60 * 1000)),
        canAutoApprove,
      };
    });

    return { buyers: buyersWithTimeRemaining };
  });

/**
 * Get time remaining until auto-approval for a specific buyer
 */
export const getBuyerApprovalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { buyerId: string }) => d)
  .handler(async ({ data, context }) => {
    const buyer = await loadBuyerForTransition(context.supabase, data.buyerId);

    if (buyer.status !== "pending_approval") {
      return {
        status: buyer.status,
        needsApproval: false,
        canAutoApprove: false,
      };
    }

    const sixHoursInMs = 6 * 60 * 60 * 1000;
    const pendingAt = new Date(buyer.pending_approval_at).getTime();
    const elapsed = Date.now() - pendingAt;
    const remaining = Math.max(0, sixHoursInMs - elapsed);
    const canAutoApprove = elapsed >= sixHoursInMs;

    return {
      status: buyer.status,
      needsApproval: true,
      canAutoApprove,
      hoursWaiting: (elapsed / (60 * 60 * 1000)).toFixed(1),
      minutesRemaining: Math.ceil(remaining / (60 * 1000)),
      pendingAt: buyer.pending_approval_at,
    };
  });
