/**
 * Phase 19.6 — Shared insurance webhook payload processor.
 * Runs on the server only. Used by the public webhook route AND by the
 * super-admin replay server-fn so both share identical semantics.
 */

type SB = any;

export type InsuranceWebhookProcessResult = {
  status: "processed" | "error";
  error?: string;
  policyId: string | null;
  claimId: string | null;
};

export async function processInsuranceWebhookPayload(
  sb: SB,
  args: {
    carrierId: string;
    externalId: string | null;
    payload: Record<string, unknown>;
  },
): Promise<InsuranceWebhookProcessResult> {
  const { carrierId, externalId, payload } = args;
  let policyId: string | null = null;
  let claimId: string | null = null;
  try {
    // Policy update
    if (payload.external_ref && payload.policy_status) {
      const { data: pol } = await sb
        .from("insurance_policies")
        .select("id, admin_id")
        .eq("external_ref", String(payload.external_ref))
        .maybeSingle();
      if (pol) {
        policyId = pol.id as string;
        await sb
          .from("insurance_policies")
          .update({ status: payload.policy_status })
          .eq("id", pol.id);
        await sb.from("insurance_audit_log").insert({
          actor_id: null,
          admin_id: pol.admin_id,
          action: `policy.${payload.policy_status}`,
          subject_type: "policy",
          subject_id: pol.id,
          carrier_id: carrierId,
          policy_id: pol.id,
          payload: { via: "webhook", event_id: externalId },
          source: "webhook",
        });
      }
    }

    // Claim update
    if (payload.claim_external_ref && payload.claim_status) {
      const { data: cl } = await sb
        .from("insurance_claims")
        .select("id, admin_id, policy_id")
        .eq("external_ref", String(payload.claim_external_ref))
        .maybeSingle();
      if (cl) {
        claimId = cl.id as string;
        const patch: Record<string, unknown> = { status: payload.claim_status };
        if (payload.claim_status === "approved" || payload.claim_status === "rejected") {
          patch.decided_at = new Date().toISOString();
        }
        if (payload.claim_status === "paid") patch.paid_at = new Date().toISOString();
        if (typeof payload.approved_payout_cents === "number") {
          patch.approved_payout_cents = payload.approved_payout_cents;
          patch.amount_approved = payload.approved_payout_cents / 100;
        }
        if (payload.decision_reason) patch.decision_reason = String(payload.decision_reason);
        await sb.from("insurance_claims").update(patch).eq("id", cl.id);
        await sb.from("insurance_claim_events").insert({
          claim_id: cl.id,
          actor_id: null,
          event_type: `webhook_${payload.claim_status}`,
          payload: { event_id: externalId, ...patch },
        });
        await sb.from("insurance_audit_log").insert({
          actor_id: null,
          admin_id: cl.admin_id,
          action: `claim.${payload.claim_status}`,
          subject_type: "claim",
          subject_id: cl.id,
          carrier_id: carrierId,
          policy_id: cl.policy_id,
          claim_id: cl.id,
          payload: {
            via: "webhook",
            event_id: externalId,
            approved_payout_cents: payload.approved_payout_cents ?? null,
          },
          source: "webhook",
        });

        // Fan-out in-app notifications to the tenant + super-admins.
        try {
          const { emitBulk, emitToSuperAdmins } = await import("@/lib/notify");
          const title = `Claim ${payload.claim_status}`;
          const body = `Insurance claim update received from carrier webhook.`;
          if (cl.admin_id) {
            await emitBulk(sb, [cl.admin_id as string], {
              tenantAdminId: cl.admin_id as string,
              category: "insurance" as never,
              severity: payload.claim_status === "rejected" ? "warning" : "info",
              title,
              body,
              link: `/insurance-claims/${cl.id}`,
              entityType: "insurance_claim",
              entityId: cl.id as string,
              metadata: { event_id: externalId, status: payload.claim_status },
            });
          }
          await emitToSuperAdmins(sb, {
            category: "insurance" as never,
            severity: "info",
            title,
            body: `Carrier webhook updated claim ${cl.id}.`,
            link: `/platform/insurance/claims/${cl.id}`,
            entityType: "insurance_claim",
            entityId: cl.id as string,
          });
        } catch (e) {
          console.warn("[insurance-webhook] notify failed", (e as Error).message);
        }
      }
    }
    return { status: "processed", policyId, claimId };
  } catch (e) {
    return { status: "error", error: (e as Error).message, policyId, claimId };
  }
}
