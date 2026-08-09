/**
 * activity-log.functions.ts
 * ──────────────────────────
 * Server functions for auditing and tracking user activity.
 * Includes both internal utility functions for logging events
 * and exposed server functions for fetching logs in the dashboard.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type LogSeverity = "info" | "warning" | "error" | "critical";

// ─── Expanded category enum (Task 3.1) ───────────────────────────────────────
export type LogCategory =
  | "system"
  | "user"
  | "sensor"
  | "billing"
  | "security"
  | "hardware"
  | "silo"
  | "subscription"
  | "threshold"
  | "actuator"
  | "alert"
  | "export";

// ─── Typed action enum (Task 3.1) ─────────────────────────────────────────────
export type LogAction =
  // Insurance policy actions
  | "insurance_policy_created"
  | "insurance_policy_renewed"
  | "insurance_policy_cancelled"
  | "insurance_policy_deleted"
  // Insurance claim actions
  | "insurance_claim_filed"
  | "insurance_claim_reviewed"
  | "insurance_claim_approved"
  | "insurance_claim_rejected"
  | "insurance_claim_payment_processed"
  | "insurance_claim_document_uploaded"
  | "insurance_claim_escalated"
  | "insurance_claim_closed"
  // Silo actions
  | "silo_created"
  | "silo_updated"
  | "silo_deleted"
  // Sensor actions
  | "sensor_configured"
  | "sensor_calibrated"
  // User management actions
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_role_changed"
  // Subscription actions
  | "subscription_created"
  | "subscription_renewed"
  | "subscription_expired"
  | "subscription_cancelled"
  // Threshold & actuator actions
  | "threshold_updated"
  | "actuator_triggered"
  // Alert actions
  | "alert_acknowledged"
  | "alert_resolved"
  | "alert_escalated"
  // Export actions
  | "report_exported"
  | "data_exported"
  // Allow arbitrary strings for future actions without breaking the system
  | (string & {});

// ─── Typed entity type enum (Task 3.1) ────────────────────────────────────────
export type LogEntityType =
  | "InsurancePolicy"
  | "InsuranceClaim"
  | "GrainBatch"
  | "Silo"
  | "SensorDevice"
  | "Tenant"
  | "Subscription"
  | "Threshold"
  | "Actuator"
  | "GrainAlert"
  | "User"
  | (string & {});

export interface LogActivityParams {
  userId?: string;
  adminId: string;
  action: LogAction;
  category?: LogCategory;
  entityType?: LogEntityType;
  entityId?: string;
  entityRef?: string;
  description: string;
  metadata?: Record<string, unknown>;
  severity?: LogSeverity;
  ipAddress?: string;
}

// ─── INTERNAL UTILS ──────────────────────────────────────────────────────────

/**
 * Internal utility to log an activity from other server-side functions.
 */
export async function logActivity(params: LogActivityParams) {
  try {
    // Attempt to enrich with user details if userId is provided
    let userName = "System";
    let userRole = "system";

    if (params.userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", params.userId)
        .maybeSingle();
      if (profile?.name) userName = profile.name;
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", params.userId)
        .maybeSingle();
      if (roleRow?.role) userRole = roleRow.role;
    }

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      admin_id: params.adminId,
      user_id: params.userId ?? null,
      user_name: userName,
      user_role: userRole,
      action: params.action,
      category: params.category ?? "system",
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_ref: params.entityRef ?? null,
      description: params.description,
      metadata: (params.metadata ?? {}) as never,
      severity: params.severity ?? "info",
      ip_address: params.ipAddress ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[ActivityLog] Failed to insert log:", error);
    }
  } catch (err) {
    console.error("[ActivityLog] Unexpected error during logging:", err);
  }
}

// ─── SERVER FUNCTIONS (Exposed to Frontend) ──────────────────────────────────

/**
 * listActivityLogs
 * Fetches paginated activity logs for the tenant's dashboard.
 */
export const listActivityLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
    category: z.string().optional(),
    severity: z.string().optional(),
    userId: z.string().optional(),
    entityType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }).optional())
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const args = data ?? { page: 1, limit: 50 };
    const page = args.page ?? 1;
    const limit = args.limit ?? 50;

    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" });

    if (args.category) query = query.eq("category", args.category);
    if (args.severity) query = query.eq("severity", args.severity);
    if (args.userId) query = query.eq("user_id", args.userId);
    if (args.entityType) query = query.eq("entity_type", args.entityType);
    if (args.startDate) query = query.gte("created_at", args.startDate);
    if (args.endDate) query = query.lte("created_at", args.endDate);
    
    if (args.search) {
      query = query.or(`action.ilike.%${args.search}%,description.ilike.%${args.search}%,entity_ref.ilike.%${args.search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: logs, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      success: true,
      logs: logs ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      }
    };
  });

/**
 * getActivityLogsSummary
 * Returns aggregated stats for charts/widgets on the dashboard.
 */
export const getActivityLogsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    days: z.number().default(7),
  }).optional())
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = data?.days ?? 7;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const { data: logs, error } = await supabase
      .from("activity_logs")
      .select("category, severity, created_at")
      .gte("created_at", cutoff);

    if (error) throw new Error(error.message);

    const summary = {
      total: logs.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      timeline: {} as Record<string, number>,
    };

    logs.forEach(log => {
      // Category count
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
      
      // Severity count
      summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1;

      // Timeline (by day)
      const dayStr = log.created_at.split("T")[0];
      summary.timeline[dayStr] = (summary.timeline[dayStr] || 0) + 1;
    });

    return { success: true, summary };
  });


// ─── DOMAIN-SPECIFIC LOGGING HELPERS (Task 3.1) ───────────────────────────────
// One-liner helpers so every feature area logs consistently. Each pre-fills the
// correct action / category / severity — caller only supplies the "who" and "what".

/** Log when an insurance policy is created. */
export async function logInsurancePolicyCreated(
  adminId: string, userId: string, policyId: string, policyRef: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "insurance_policy_created",
    category: "billing",
    entityType: "InsurancePolicy",
    entityId: policyId,
    entityRef: policyRef,
    description: `Insurance policy ${policyRef} created.`,
    severity: "info",
    ipAddress: ip,
  });
}

/** Log when an insurance policy is renewed. */
export async function logInsurancePolicyRenewed(
  adminId: string, userId: string, policyId: string, policyRef: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "insurance_policy_renewed",
    category: "billing",
    entityType: "InsurancePolicy",
    entityId: policyId,
    entityRef: policyRef,
    description: `Insurance policy ${policyRef} renewed.`,
    severity: "info",
    ipAddress: ip,
  });
}

/** Log when an insurance claim is approved. */
export async function logInsuranceClaimApproved(
  adminId: string, userId: string, claimId: string, claimRef: string, amount: number, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "insurance_claim_approved",
    category: "billing",
    entityType: "InsuranceClaim",
    entityId: claimId,
    entityRef: claimRef,
    description: `Claim ${claimRef} approved. Settlement: PKR ${amount.toLocaleString()}.`,
    severity: "info",
    metadata: { settlement_amount: amount },
    ipAddress: ip,
  });
}

/** Log when an insurance claim is rejected. */
export async function logInsuranceClaimRejected(
  adminId: string, userId: string, claimId: string, claimRef: string, reason: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "insurance_claim_rejected",
    category: "billing",
    entityType: "InsuranceClaim",
    entityId: claimId,
    entityRef: claimRef,
    description: `Claim ${claimRef} rejected. Reason: ${reason}`,
    severity: "warning",
    metadata: { rejection_reason: reason },
    ipAddress: ip,
  });
}

/** Log when a payment is processed for an insurance claim. */
export async function logInsuranceClaimPaymentProcessed(
  adminId: string, userId: string, claimId: string, claimRef: string,
  paymentRef: string, amount: number, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "insurance_claim_payment_processed",
    category: "billing",
    entityType: "InsuranceClaim",
    entityId: claimId,
    entityRef: claimRef,
    description: `Payment ${paymentRef} of PKR ${amount.toLocaleString()} processed for claim ${claimRef}.`,
    severity: "info",
    metadata: { payment_ref: paymentRef, amount },
    ipAddress: ip,
  });
}

/** Log when an alert is acknowledged by a user. */
export async function logAlertAcknowledged(
  adminId: string, userId: string, alertId: string, alertTitle: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "alert_acknowledged",
    category: "alert",
    entityType: "GrainAlert",
    entityId: alertId,
    entityRef: alertTitle,
    description: `Alert "${alertTitle}" acknowledged.`,
    severity: "info",
    ipAddress: ip,
  });
}

/** Log when an alert is resolved. */
export async function logAlertResolved(
  adminId: string, userId: string, alertId: string, alertTitle: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "alert_resolved",
    category: "alert",
    entityType: "GrainAlert",
    entityId: alertId,
    entityRef: alertTitle,
    description: `Alert "${alertTitle}" marked as resolved.`,
    severity: "info",
    ipAddress: ip,
  });
}

/** Log when an alert is escalated to a higher role. */
export async function logAlertEscalated(
  adminId: string, userId: string, alertId: string, alertTitle: string,
  escalatedTo: string, ip?: string
) {
  await logActivity({
    adminId, userId,
    action: "alert_escalated",
    category: "alert",
    entityType: "GrainAlert",
    entityId: alertId,
    entityRef: alertTitle,
    description: `Alert "${alertTitle}" escalated to ${escalatedTo}.`,
    severity: "warning",
    metadata: { escalated_to: escalatedTo },
    ipAddress: ip,
  });
}

/** Log a subscription lifecycle event (created / renewed / expired / cancelled). */
export async function logSubscriptionEvent(
  adminId: string, userId: string,
  event: "subscription_created" | "subscription_renewed" | "subscription_expired" | "subscription_cancelled",
  tenantId: string, planName: string, ip?: string
) {
  const severityMap = {
    subscription_created: "info",
    subscription_renewed: "info",
    subscription_expired: "warning",
    subscription_cancelled: "warning",
  } as const;

  await logActivity({
    adminId, userId,
    action: event,
    category: "subscription",
    entityType: "Subscription",
    entityId: tenantId,
    entityRef: planName,
    description: `Subscription ${event.replace("subscription_", "").replace("_", " ")} — Plan: ${planName}.`,
    severity: severityMap[event],
    metadata: { tenant_id: tenantId, plan: planName },
    ipAddress: ip,
  });
}

/** Log a user management action (create / update / delete / role change). */
export async function logUserManagement(
  adminId: string, actorId: string,
  action: "user_created" | "user_updated" | "user_deleted" | "user_role_changed",
  targetUserId: string, targetUserName: string, meta?: Record<string, unknown>, ip?: string
) {
  const descMap = {
    user_created: `User "${targetUserName}" created.`,
    user_updated: `User "${targetUserName}" profile updated.`,
    user_deleted: `User "${targetUserName}" deleted.`,
    user_role_changed: `User "${targetUserName}" role changed.`,
  };

  await logActivity({
    adminId, userId: actorId,
    action,
    category: "user",
    entityType: "User",
    entityId: targetUserId,
    entityRef: targetUserName,
    description: descMap[action],
    severity: action === "user_deleted" ? "warning" : "info",
    metadata: meta,
    ipAddress: ip,
  });
}

