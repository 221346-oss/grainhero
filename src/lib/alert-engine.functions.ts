/**
 * alert-engine.functions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Task 3.2 — AlertEngine Service
 *
 * THE CONCEPT:
 * This is the "Rule Engine" for the entire GrainHero alert system.
 * Instead of scattering alert creation across 20 different routes,
 * every dangerous event passes through this engine, which checks:
 *   "Does this event match any of my rules? → Yes → Create a GrainAlert record."
 *
 * ARCHITECTURE:
 *   1. createAlert()          — Base internal function. Writes to `notifications` table.
 *   2. Event Triggers         — Named functions called by routes after a mutation.
 *   3. Scheduled Checkers     — Background functions that run on a cron (daily/hourly).
 *
 * WHY notifications TABLE?
 * The project uses the `notifications` table (confirmed in Supabase types) as the
 * central alert store. GrainAlerts are user-scoped notifications with rich metadata.
 * We write there and the frontend reads from the same table — no new table needed.
 *
 * ALERT PRIORITY LEVELS:
 *   critical  → 🔴 Immediate action required (batch deleted, sensor offline >1h, policy expires in 7d)
 *   high      → 🟠 Urgent attention needed (claim filed, claim rejected, policy expires in 30d)
 *   medium    → 🟡 Monitor closely (claim approved, payment overdue)
 *   low       → 🔵 For information only
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type AlertPriority = "critical" | "high" | "medium" | "low";

export type AlertType =
  // Batch & grain events
  | "batch_deleted"
  | "batch_quantity_modified"
  | "spoilage_detected"
  | "ml_high_risk"
  // Insurance events
  | "insurance_claim_filed"
  | "insurance_claim_approved"
  | "insurance_claim_rejected"
  | "insurance_policy_expiring"
  | "insurance_payment_overdue"
  // Subscription events
  | "subscription_expiring"
  | "subscription_expired"
  // Sensor/system events
  | "sensor_offline"
  // Spoilage trend (from Task 2.5)
  | "spoilage_trend"
  | (string & {});

interface CreateAlertParams {
  adminId: string;               // Tenant admin — used for RLS scoping
  userId?: string;               // Who receives the alert (null = all admins of tenant)
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  entityId?: string;             // e.g., batch UUID, claim UUID
  entityRef?: string;            // e.g., "CLM-001", "SILO-3"
  metadata?: Record<string, unknown>;
}

// ─── BASE ALERT CREATOR ───────────────────────────────────────────────────────
/**
 * Internal base function — writes one alert record to the `notifications` table.
 * All named trigger functions below call this. Never call this directly from routes.
 *
 * WHY: Centralising the write here means we can later add:
 *   - Push notifications (FCM/APNs)
 *   - Email digests
 *   - SMS (for critical alerts)
 * ...in ONE place, and every alert in the system gets it for free.
 */
async function createAlert(params: CreateAlertParams): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: params.userId ?? params.adminId,
        title: params.title,
        body: params.message,
        category: params.type,
        read: false,
        metadata: {
          priority: params.priority,
          type: params.type,
          entity_id: params.entityId ?? null,
          entity_ref: params.entityRef ?? null,
          admin_id: params.adminId,
          ...(params.metadata ?? {}),
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[AlertEngine] Failed to create alert:", error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error("[AlertEngine] Unexpected error:", err);
    return null;
  }
}

// ─── DEDUPLICATION HELPER ─────────────────────────────────────────────────────
/**
 * Checks if an unread alert of the given type already exists for a user
 * within the last `withinMinutes` window.
 *
 * WHY: Without this, a rising-temperature condition that triggers every 5 minutes
 * would spam the admin with 288 alerts per day for the same silo. One alert per
 * time window is enough.
 */
async function hasRecentAlert(
  userId: string,
  type: AlertType,
  withinMinutes: number,
  entityId?: string
): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category", type)
    .eq("read", false)
    .gte("created_at", since);

  // If entityId is given, scope dedup to that specific entity (e.g., one silo)
  if (entityId) {
    query = query.contains("metadata", { entity_id: entityId });
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── SECTION 1: EVENT-TRIGGERED ALERTS ─────────────────────────────────────────
// Called from routes immediately after a mutation occurs.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 CRITICAL — Fires when a grain batch is permanently deleted.
 * Called from: batch delete route handler.
 *
 * WHO IS NOTIFIED: Admin + Super Admin
 * PRIORITY: Critical — deleted grain cannot be recovered; audit trail required.
 */
export async function alertBatchDeleted(
  adminId: string,
  actorName: string,
  batchId: string,
  batchRef: string
): Promise<void> {
  await createAlert({
    adminId,
    type: "batch_deleted",
    priority: "critical",
    title: "🔴 Grain Batch Deleted",
    message: `Batch ${batchRef} was permanently deleted by ${actorName}. Review audit log immediately.`,
    entityId: batchId,
    entityRef: batchRef,
    metadata: { actor_name: actorName },
  });
}

/**
 * 🟠 HIGH — Fires when a batch quantity is significantly modified.
 * Called from: batch update route handler.
 *
 * PRIORITY: High — quantity changes affect insurance valuations and inventory.
 */
export async function alertBatchQuantityModified(
  adminId: string,
  actorName: string,
  batchId: string,
  batchRef: string,
  oldQty: number,
  newQty: number
): Promise<void> {
  await createAlert({
    adminId,
    type: "batch_quantity_modified",
    priority: "high",
    title: "🟠 Batch Quantity Modified",
    message: `Batch ${batchRef} quantity changed from ${oldQty}kg to ${newQty}kg by ${actorName}.`,
    entityId: batchId,
    entityRef: batchRef,
    metadata: { actor_name: actorName, old_qty: oldQty, new_qty: newQty },
  });
}

/**
 * 🔴 CRITICAL — Fires when ML predicts spoilage (risk_score > 80 OR class = "Spoiled").
 * Called from: the backend route that calls the /predict ML API.
 *
 * PRIORITY: Critical — grain spoilage means financial loss.
 */
export async function alertSpoilageDetected(
  adminId: string,
  siloId: string,
  siloName: string,
  riskScore: number,
  prediction: string
): Promise<void> {
  // Deduplicate: max 1 spoilage alert per silo per 2 hours
  const alreadyAlerted = await hasRecentAlert(adminId, "spoilage_detected", 120, siloId);
  if (alreadyAlerted) return;

  await createAlert({
    adminId,
    type: "spoilage_detected",
    priority: "critical",
    title: "🔴 Spoilage Detected",
    message: `Silo "${siloName}" — ML model predicts "${prediction}" with ${riskScore.toFixed(1)}% risk. Inspect immediately.`,
    entityId: siloId,
    entityRef: siloName,
    metadata: { risk_score: riskScore, prediction },
  });
}

/**
 * 🔴 CRITICAL — Fires when ML risk_score > 80% (even if not yet classified as Spoiled).
 * Called from: the backend route that calls the /predict ML API.
 */
export async function alertHighMLRisk(
  adminId: string,
  siloId: string,
  siloName: string,
  riskScore: number
): Promise<void> {
  const alreadyAlerted = await hasRecentAlert(adminId, "ml_high_risk", 120, siloId);
  if (alreadyAlerted) return;

  await createAlert({
    adminId,
    type: "ml_high_risk",
    priority: "critical",
    title: "🔴 High ML Risk Score",
    message: `Silo "${siloName}" risk score is ${riskScore.toFixed(1)}%. Exceeds 80% danger threshold.`,
    entityId: siloId,
    entityRef: siloName,
    metadata: { risk_score: riskScore },
  });
}

/**
 * 🟠 HIGH — Fires when a farmer files a new insurance claim.
 * Called from: insurance claim creation route.
 *
 * WHO IS NOTIFIED: Super Admin (claim review is their responsibility).
 */
export async function alertInsuranceClaimFiled(
  adminId: string,
  claimId: string,
  claimRef: string,
  farmerName: string,
  claimAmount: number
): Promise<void> {
  await createAlert({
    adminId,
    type: "insurance_claim_filed",
    priority: "high",
    title: "🟠 New Insurance Claim Filed",
    message: `${farmerName} filed claim ${claimRef} for PKR ${claimAmount.toLocaleString()}. Awaiting review.`,
    entityId: claimId,
    entityRef: claimRef,
    metadata: { farmer_name: farmerName, claim_amount: claimAmount },
  });
}

/**
 * 🟡 MEDIUM — Fires when a claim is approved.
 * Called from: claim approve route handler.
 */
export async function alertInsuranceClaimApproved(
  adminId: string,
  claimId: string,
  claimRef: string,
  settlementAmount: number
): Promise<void> {
  await createAlert({
    adminId,
    type: "insurance_claim_approved",
    priority: "medium",
    title: "✅ Insurance Claim Approved",
    message: `Claim ${claimRef} approved. Settlement: PKR ${settlementAmount.toLocaleString()}. Proceed to payment.`,
    entityId: claimId,
    entityRef: claimRef,
    metadata: { settlement_amount: settlementAmount },
  });
}

/**
 * 🟠 HIGH — Fires when a claim is rejected.
 * Called from: claim reject route handler.
 */
export async function alertInsuranceClaimRejected(
  adminId: string,
  claimId: string,
  claimRef: string,
  reason: string
): Promise<void> {
  await createAlert({
    adminId,
    type: "insurance_claim_rejected",
    priority: "high",
    title: "❌ Insurance Claim Rejected",
    message: `Claim ${claimRef} was rejected. Reason: ${reason}`,
    entityId: claimId,
    entityRef: claimRef,
    metadata: { rejection_reason: reason },
  });
}

/**
 * 🔴 CRITICAL / 🟠 HIGH — Fires for spoilage trend alerts from Task 2.5.
 * Called from: the backend route after receiving ML /predict response.
 *
 * DEDUPLICATION:
 *   - CRITICAL: max 1 alert per silo per 1 hour
 *   - WORSENING: max 1 alert per silo per 2 hours
 *   - CAUTION: max 1 alert per silo per 4 hours
 */
export async function alertSpoilageTrend(
  adminId: string,
  siloId: string,
  siloName: string,
  trendResult: {
    urgency: "CRITICAL" | "WORSENING" | "CAUTION" | "STABLE";
    earliest_danger_in_hours: number | null;
    action_message: string;
  }
): Promise<void> {
  const { urgency, earliest_danger_in_hours, action_message } = trendResult;

  if (urgency === "STABLE") return; // No alert needed for stable conditions

  const dedupWindowMap = { CRITICAL: 60, WORSENING: 120, CAUTION: 240 } as const;
  const dedupWindow = dedupWindowMap[urgency];

  const alreadyAlerted = await hasRecentAlert(adminId, "spoilage_trend", dedupWindow, siloId);
  if (alreadyAlerted) return;

  const priorityMap = { CRITICAL: "critical", WORSENING: "high", CAUTION: "medium" } as const;
  const titleMap = {
    CRITICAL: "🚨 Spoilage Trend: CRITICAL — Immediate Action Required",
    WORSENING: "⚠️ Spoilage Trend: WORSENING — Prepare Intervention",
    CAUTION: "📈 Spoilage Trend: CAUTION — Monitor Closely",
  };

  await createAlert({
    adminId,
    type: "spoilage_trend",
    priority: priorityMap[urgency],
    title: titleMap[urgency],
    message: action_message,
    entityId: siloId,
    entityRef: siloName,
    metadata: { urgency, earliest_danger_in_hours, silo_name: siloName },
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── SECTION 2: SCHEDULED BACKGROUND CHECKERS ──────────────────────────────────
// These run on a timer (cron), not triggered by a user action.
// Call them from a scheduled server function or a cron API route.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🕐 RUN: Daily at midnight
 * Checks all tenant subscriptions and fires alerts for:
 *   - Expiring in 7 days  → 🔴 Critical
 *   - Expiring in 30 days → 🟠 High
 *   - Already expired     → 🔴 Critical
 *
 * WHY SCHEDULED: Expiry is time-based, not event-based. No user action triggers it —
 * it just happens when the clock ticks past the expiry date. A cron is the only way
 * to catch it reliably.
 */
export async function checkSubscriptionExpirations(): Promise<void> {
  const now = new Date();
  const in7  = new Date(now.getTime() + 7  * 86400000).toISOString();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString();

  // Query subscriptions expiring within 30 days or already expired
  const { data: subs, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, admin_id, plan_name, current_period_end, status")
    .or(`current_period_end.lte.${in30},status.eq.past_due`);

  if (error) {
    console.error("[AlertEngine] checkSubscriptionExpirations failed:", error.message);
    return;
  }

  for (const sub of subs ?? []) {
    const expiresAt = new Date(sub.current_period_end);
    const daysLeft  = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

    if (sub.status === "past_due" || daysLeft <= 0) {
      await createAlert({
        adminId: sub.admin_id,
        type: "subscription_expired",
        priority: "critical",
        title: "🔴 Subscription Expired",
        message: `Your "${sub.plan_name}" subscription has expired. Platform access will be limited. Renew now.`,
        entityId: sub.id,
        entityRef: sub.plan_name,
      });
    } else if (daysLeft <= 7) {
      const alreadyAlerted = await hasRecentAlert(sub.admin_id, "subscription_expiring", 60 * 24, sub.id);
      if (!alreadyAlerted) {
        await createAlert({
          adminId: sub.admin_id,
          type: "subscription_expiring",
          priority: "critical",
          title: "🔴 Subscription Expiring in 7 Days",
          message: `Your "${sub.plan_name}" plan expires in ${daysLeft} day(s). Renew to avoid service interruption.`,
          entityId: sub.id,
          entityRef: sub.plan_name,
          metadata: { days_remaining: daysLeft },
        });
      }
    } else if (daysLeft <= 30) {
      const alreadyAlerted = await hasRecentAlert(sub.admin_id, "subscription_expiring", 60 * 24 * 7, sub.id);
      if (!alreadyAlerted) {
        await createAlert({
          adminId: sub.admin_id,
          type: "subscription_expiring",
          priority: "high",
          title: "🟠 Subscription Expiring in 30 Days",
          message: `Your "${sub.plan_name}" plan expires in ${daysLeft} days. Plan your renewal.`,
          entityId: sub.id,
          entityRef: sub.plan_name,
          metadata: { days_remaining: daysLeft },
        });
      }
    }
  }
}

/**
 * 🕐 RUN: Daily
 * Checks all insurance policies expiring in 7 or 30 days.
 */
export async function checkInsuranceRenewals(): Promise<void> {
  const now  = new Date();
  const in7  = new Date(now.getTime() + 7  * 86400000).toISOString();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString();

  const { data: policies, error } = await supabaseAdmin
    .from("insurance_policies")
    .select("id, admin_id, policy_number, expiry_date")
    .lte("expiry_date", in30)
    .gte("expiry_date", now.toISOString())
    .eq("status", "active");

  if (error) {
    console.error("[AlertEngine] checkInsuranceRenewals failed:", error.message);
    return;
  }

  for (const policy of policies ?? []) {
    const expiresAt = new Date(policy.expiry_date);
    const daysLeft  = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
    const isUrgent  = daysLeft <= 7;

    const alreadyAlerted = await hasRecentAlert(
      policy.admin_id,
      "insurance_policy_expiring",
      isUrgent ? 60 * 24 : 60 * 24 * 7,
      policy.id
    );
    if (alreadyAlerted) continue;

    await createAlert({
      adminId: policy.admin_id,
      type: "insurance_policy_expiring",
      priority: isUrgent ? "critical" : "high",
      title: isUrgent
        ? `🔴 Insurance Policy Expiring in ${daysLeft} Day(s)`
        : `🟠 Insurance Policy Expiring in ${daysLeft} Days`,
      message: `Policy ${policy.policy_number} expires on ${expiresAt.toLocaleDateString("en-PK")}. Renew to maintain coverage.`,
      entityId: policy.id,
      entityRef: policy.policy_number,
      metadata: { days_remaining: daysLeft },
    });
  }
}

/**
 * 🕐 RUN: Every hour
 * Checks all sensors for last_seen timestamp.
 * If a sensor hasn't reported in > 1 hour, fire a 🟠 HIGH alert.
 *
 * WHY THIS IS TRICKY: A sensor going offline is NOT an event that any user triggers.
 * The absence of data IS the event. Only a scheduled check can catch it.
 */
export async function checkSensorOffline(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: sensors, error } = await supabaseAdmin
    .from("sensor_devices")
    .select("id, admin_id, name, silo_id, last_seen_at")
    .eq("status", "active")
    .lt("last_seen_at", oneHourAgo);

  if (error) {
    console.error("[AlertEngine] checkSensorOffline failed:", error.message);
    return;
  }

  for (const sensor of sensors ?? []) {
    // Deduplicate: max 1 offline alert per sensor per 2 hours
    const alreadyAlerted = await hasRecentAlert(sensor.admin_id, "sensor_offline", 120, sensor.id);
    if (alreadyAlerted) continue;

    const lastSeen = sensor.last_seen_at
      ? new Date(sensor.last_seen_at).toLocaleString("en-PK")
      : "unknown";

    await createAlert({
      adminId: sensor.admin_id,
      type: "sensor_offline",
      priority: "high",
      title: "🟠 Sensor Offline",
      message: `Sensor "${sensor.name}" has not reported since ${lastSeen}. Check connectivity and power.`,
      entityId: sensor.id,
      entityRef: sensor.name,
      metadata: { silo_id: sensor.silo_id, last_seen_at: sensor.last_seen_at },
    });
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── SECTION 3: TREND EVALUATION FACADE (Task 3.2.5) ───────────────────────────
// The single entry point that the ML prediction route calls after every
// /predict response. Reads Task 2.5's output and fires the right alert.
//
// FACADE PATTERN:
//   The caller (prediction route) doesn't know about alert priorities, dedup
//   windows, or internal logic. It just calls evaluateTrend() with the ML
//   output and the engine handles everything else.
//
// DATA FLOW (end-to-end):
//   ESP32 → POST /predict (app.py)
//     → _fetch_sensor_history()     [Task 2.4]
//       → _spoilage_trend()         [Task 2.5] returns { urgency, earliest_danger_in_hours, action_message }
//         → evaluateTrend()         [Task 3.2.5] ← THIS FUNCTION
//           → alertSpoilageTrend()  [Task 3.2]
//             → createAlert()       writes notification to DB
//               → Frontend reads notification → shows 🚨 alert card
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * evaluateTrend()
 * ─────────────────────────────────────────────────────────────────────────────
 * Called after every ML /predict response that contains spoilage_trend data.
 * This is the ONLY function the prediction route needs to call — it handles
 * all internal routing to the right alert level automatically.
 *
 * @param adminId   - Tenant admin UUID (for RLS scoping)
 * @param siloId    - UUID of the silo being monitored
 * @param siloName  - Human-readable silo name (e.g. "Silo 3 — Block B")
 * @param trendResult - The full spoilage_trend object from Task 2.5's _spoilage_trend()
 *
 * WHAT HAPPENS INTERNALLY:
 *   CRITICAL  → 🔴 Critical alert, dedup 1hr/silo. Notes aeration should trigger.
 *   WORSENING → 🟠 High alert, dedup 2hr/silo.
 *   CAUTION   → 🟡 Medium alert, dedup 4hr/silo.
 *   STABLE    → Nothing. No alert, no DB write, no noise.
 */
export async function evaluateTrend(
  adminId: string,
  siloId: string,
  siloName: string,
  trendResult: {
    urgency: string;                       // "CRITICAL" | "WORSENING" | "CAUTION" | "STABLE"
    earliest_danger_in_hours: number | null;
    action_message: string;
    temperature_trend?: string;
    humidity_trend?: string;
    moisture_trend?: string;
  }
): Promise<void> {
  const urgency = trendResult.urgency as "CRITICAL" | "WORSENING" | "CAUTION" | "STABLE";

  // STABLE → no alert needed, return immediately (hot path — exits fast)
  if (urgency === "STABLE" || !["CRITICAL", "WORSENING", "CAUTION"].includes(urgency)) {
    return;
  }

  // Delegate to the existing alertSpoilageTrend trigger with enriched metadata
  await alertSpoilageTrend(adminId, siloId, siloName, {
    urgency,
    earliest_danger_in_hours: trendResult.earliest_danger_in_hours,
    action_message: trendResult.action_message,
  });
}

// ─── HOW TO WIRE THIS INTO THE BACKEND (for reference) ────────────────────────
//
// In the Python ML server (app.py) the /predict endpoint already returns
// spoilage_trend. On the Node/TypeScript side, wherever you call the ML API
// (e.g. a server function that proxies /predict), add this AFTER you receive
// the response:
//
//   import { evaluateTrend } from "@/lib/alert-engine.functions";
//
//   const mlResponse = await fetch("http://ml-server/predict", { ... });
//   const data = await mlResponse.json();
//
//   // Fire trend alert if urgency is not STABLE (non-blocking)
//   if (data.spoilage_trend) {
//     evaluateTrend(
//       currentUser.admin_id,
//       silo.id,
//       silo.name,
//       data.spoilage_trend
//     ).catch(console.error); // fire-and-forget, never block the response
//   }
//
//   return data; // return ML result to frontend immediately
