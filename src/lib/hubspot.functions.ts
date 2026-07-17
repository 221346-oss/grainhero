import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function logSync(params: {
  userId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  status: "success" | "error";
  errorMessage?: string;
  payload?: unknown;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("hubspot_sync_log").insert({
      user_id: params.userId ?? null,
      action: params.action,
      hubspot_object_type: params.objectType,
      hubspot_object_id: params.objectId ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
      payload: (params.payload ?? null) as never,
    });
  } catch {
    // Swallow logging failures.
  }
}

/** Create a HubSpot contact + trial deal and store IDs on the user's profile. */
export const syncSignupToHubspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    if (!process.env.HUBSPOT_API_KEY || !process.env.LOVABLE_API_KEY) {
      return { skipped: true as const, reason: "HubSpot not configured" };
    }
    const { hubspotCreateContact, hubspotCreateDeal } = await import("./hubspot.server");
    try {
      const contact = await hubspotCreateContact({
        email: data.email,
        firstname: data.firstName,
        lastname: data.lastName,
        phone: data.phone,
        company: data.company,
      });
      await logSync({ userId: context.userId, action: "create", objectType: "contact", objectId: contact.id, status: "success" });
      const deal = await hubspotCreateDeal(data.company ?? data.email, contact.id);
      await logSync({ userId: context.userId, action: "create", objectType: "deal", objectId: deal.id, status: "success" });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("profiles")
        .update({ hubspot_contact_id: contact.id, hubspot_deal_id: deal.id })
        .eq("id", context.userId);

      return { skipped: false as const, contactId: contact.id, dealId: deal.id };
    } catch (e) {
      await logSync({ userId: context.userId, action: "create", objectType: "signup", status: "error", errorMessage: (e as Error).message });
      return { skipped: false as const, error: (e as Error).message };
    }
  });

/** Move the current user's HubSpot deal to a stage. Idempotent. */
export const advanceMyDealStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage: string }) => input)
  .handler(async ({ data, context }) => {
    if (!process.env.HUBSPOT_API_KEY || !process.env.LOVABLE_API_KEY) return { skipped: true };
    const { data: profile } = await context.supabase
      .from("profiles").select("hubspot_deal_id").eq("id", context.userId).maybeSingle();
    const dealId = profile?.hubspot_deal_id;
    if (!dealId) return { skipped: true };
    const { hubspotUpdateDealStage } = await import("./hubspot.server");
    try {
      await hubspotUpdateDealStage(dealId, data.stage);
      await logSync({ userId: context.userId, action: "update_stage", objectType: "deal", objectId: dealId, status: "success", payload: { stage: data.stage } });
      return { ok: true };
    } catch (e) {
      await logSync({ userId: context.userId, action: "update_stage", objectType: "deal", objectId: dealId, status: "error", errorMessage: (e as Error).message });
      return { ok: false, error: (e as Error).message };
    }
  });

/** Increment login count and, on the 3rd login, promote deal to trial-active. */
export const trackLoginAndAdvance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("login_count, hubspot_deal_id")
      .eq("id", context.userId)
      .maybeSingle();
    const newCount = (prof?.login_count ?? 0) + 1;
    await supabaseAdmin
      .from("profiles")
      .update({ login_count: newCount, last_login: new Date().toISOString() })
      .eq("id", context.userId);

    if (newCount === 3 && prof?.hubspot_deal_id && process.env.HUBSPOT_API_KEY) {
      const { hubspotUpdateDealStage, HUBSPOT_STAGES } = await import("./hubspot.server");
      try {
        await hubspotUpdateDealStage(prof.hubspot_deal_id, HUBSPOT_STAGES.trialActive);
        await logSync({ userId: context.userId, action: "update_stage", objectType: "deal", objectId: prof.hubspot_deal_id, status: "success", payload: { stage: "qualifiedtobuy" } });
      } catch (e) {
        await logSync({ userId: context.userId, action: "update_stage", objectType: "deal", status: "error", errorMessage: (e as Error).message });
      }
    }
    return { loginCount: newCount };
  });

function requireSuperAdmin(rows: Array<{ role: string }> | null): boolean {
  return !!rows?.some((r) => r.role === "super_admin");
}

/** Super-admin: list HubSpot deals for pipeline view. */
export const adminListHubspotDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
    if (!process.env.HUBSPOT_API_KEY) return { results: [] as Array<{ id: string; properties: Record<string, string> }> };
    const { hubspotListDeals } = await import("./hubspot.server");
    return hubspotListDeals(100);
  });

/** Super-admin: list HubSpot contacts (leads view). */
export const adminListHubspotContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
    if (!process.env.HUBSPOT_API_KEY) return { results: [] as Array<{ id: string; properties: Record<string, string> }> };
    const { hubspotListContacts } = await import("./hubspot.server");
    return hubspotListContacts(100);
  });

/** Super-admin: manually move a deal to a stage from the pipeline UI. */
export const adminUpdateDealStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { dealId: string; stage: string }) => i)
  .handler(async ({ context, data }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
    const { hubspotUpdateDealStage } = await import("./hubspot.server");
    await hubspotUpdateDealStage(data.dealId, data.stage);
    await logSync({ userId: context.userId, action: "admin_update_stage", objectType: "deal", objectId: data.dealId, status: "success", payload: { stage: data.stage } });
    return { ok: true };
  });