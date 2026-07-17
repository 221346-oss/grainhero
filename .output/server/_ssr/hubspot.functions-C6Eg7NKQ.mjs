import { l as createServerFn } from "./esm-Dova13aH.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-BBZdFWpw.mjs";
import { t as createServerRpc } from "./createServerRpc-WJgk8O8C.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/hubspot.functions-C6Eg7NKQ.js
async function logSync(params) {
	try {
		const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
		await supabaseAdmin.from("hubspot_sync_log").insert({
			user_id: params.userId ?? null,
			action: params.action,
			hubspot_object_type: params.objectType,
			hubspot_object_id: params.objectId ?? null,
			status: params.status,
			error_message: params.errorMessage ?? null,
			payload: params.payload ?? null
		});
	} catch {}
}
/** Create a HubSpot contact + trial deal and store IDs on the user's profile. */
var syncSignupToHubspot_createServerFn_handler = createServerRpc({
	id: "56a98f6f0297a6a1b05dfc767788417c4e47b361157fe7f1969c52ea5e75f538",
	name: "syncSignupToHubspot",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => syncSignupToHubspot.__executeServer(opts));
var syncSignupToHubspot = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(syncSignupToHubspot_createServerFn_handler, async ({ data, context }) => {
	if (!processModule.env.HUBSPOT_API_KEY || !processModule.env.LOVABLE_API_KEY) return {
		skipped: true,
		reason: "HubSpot not configured"
	};
	const { hubspotCreateContact, hubspotCreateDeal } = await import("./hubspot.server-f7s0yyqp.mjs");
	try {
		const contact = await hubspotCreateContact({
			email: data.email,
			firstname: data.firstName,
			lastname: data.lastName,
			phone: data.phone,
			company: data.company
		});
		await logSync({
			userId: context.userId,
			action: "create",
			objectType: "contact",
			objectId: contact.id,
			status: "success"
		});
		const deal = await hubspotCreateDeal(data.company ?? data.email, contact.id);
		await logSync({
			userId: context.userId,
			action: "create",
			objectType: "deal",
			objectId: deal.id,
			status: "success"
		});
		const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
		await supabaseAdmin.from("profiles").update({
			hubspot_contact_id: contact.id,
			hubspot_deal_id: deal.id
		}).eq("id", context.userId);
		return {
			skipped: false,
			contactId: contact.id,
			dealId: deal.id
		};
	} catch (e) {
		await logSync({
			userId: context.userId,
			action: "create",
			objectType: "signup",
			status: "error",
			errorMessage: e.message
		});
		return {
			skipped: false,
			error: e.message
		};
	}
});
var advanceMyDealStage_createServerFn_handler = createServerRpc({
	id: "8d2ed68722129a2c5de970eb1dcefb67389df34cb18a074f0ca7fdceeb0dff73",
	name: "advanceMyDealStage",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => advanceMyDealStage.__executeServer(opts));
var advanceMyDealStage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => input).handler(advanceMyDealStage_createServerFn_handler, async ({ data, context }) => {
	if (!processModule.env.HUBSPOT_API_KEY || !processModule.env.LOVABLE_API_KEY) return { skipped: true };
	const { data: profile } = await context.supabase.from("profiles").select("hubspot_deal_id").eq("id", context.userId).maybeSingle();
	const dealId = profile?.hubspot_deal_id;
	if (!dealId) return { skipped: true };
	const { hubspotUpdateDealStage } = await import("./hubspot.server-f7s0yyqp.mjs");
	try {
		await hubspotUpdateDealStage(dealId, data.stage);
		await logSync({
			userId: context.userId,
			action: "update_stage",
			objectType: "deal",
			objectId: dealId,
			status: "success",
			payload: { stage: data.stage }
		});
		return { ok: true };
	} catch (e) {
		await logSync({
			userId: context.userId,
			action: "update_stage",
			objectType: "deal",
			objectId: dealId,
			status: "error",
			errorMessage: e.message
		});
		return {
			ok: false,
			error: e.message
		};
	}
});
var trackLoginAndAdvance_createServerFn_handler = createServerRpc({
	id: "9bc397fd4f908edaa38a7d4b4c7d16c266aa516ad2ba43dd9bb159ca0b175fb8",
	name: "trackLoginAndAdvance",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => trackLoginAndAdvance.__executeServer(opts));
var trackLoginAndAdvance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(trackLoginAndAdvance_createServerFn_handler, async ({ context }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data: prof } = await supabaseAdmin.from("profiles").select("login_count, hubspot_deal_id").eq("id", context.userId).maybeSingle();
	const newCount = (prof?.login_count ?? 0) + 1;
	await supabaseAdmin.from("profiles").update({
		login_count: newCount,
		last_login: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", context.userId);
	if (newCount === 3 && prof?.hubspot_deal_id && processModule.env.HUBSPOT_API_KEY) {
		const { hubspotUpdateDealStage, HUBSPOT_STAGES } = await import("./hubspot.server-f7s0yyqp.mjs");
		try {
			await hubspotUpdateDealStage(prof.hubspot_deal_id, HUBSPOT_STAGES.trialActive);
			await logSync({
				userId: context.userId,
				action: "update_stage",
				objectType: "deal",
				objectId: prof.hubspot_deal_id,
				status: "success",
				payload: { stage: "qualifiedtobuy" }
			});
		} catch (e) {
			await logSync({
				userId: context.userId,
				action: "update_stage",
				objectType: "deal",
				status: "error",
				errorMessage: e.message
			});
		}
	}
	return { loginCount: newCount };
});
function requireSuperAdmin(rows) {
	return !!rows?.some((r) => r.role === "super_admin");
}
/** Super-admin: list HubSpot deals for pipeline view. */
var adminListHubspotDeals_createServerFn_handler = createServerRpc({
	id: "746d187c11d9f594b1e679542ea6777fde3718ac03f43dffed34b2d3695d6a83",
	name: "adminListHubspotDeals",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => adminListHubspotDeals.__executeServer(opts));
var adminListHubspotDeals = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(adminListHubspotDeals_createServerFn_handler, async ({ context }) => {
	const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
	if (!processModule.env.HUBSPOT_API_KEY) return { results: [] };
	const { hubspotListDeals } = await import("./hubspot.server-f7s0yyqp.mjs");
	return hubspotListDeals(100);
});
var adminListHubspotContacts_createServerFn_handler = createServerRpc({
	id: "997cc05bd40aab1b7f27f44d728661cead1c784b7db63aca44eceb5c9b2cf77d",
	name: "adminListHubspotContacts",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => adminListHubspotContacts.__executeServer(opts));
var adminListHubspotContacts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(adminListHubspotContacts_createServerFn_handler, async ({ context }) => {
	const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
	if (!processModule.env.HUBSPOT_API_KEY) return { results: [] };
	const { hubspotListContacts } = await import("./hubspot.server-f7s0yyqp.mjs");
	return hubspotListContacts(100);
});
var adminUpdateDealStage_createServerFn_handler = createServerRpc({
	id: "f89c68f3a776aca7c0262c1b8e727c32cc7198cb1fd8f43f6f6ed06a7937277e",
	name: "adminUpdateDealStage",
	filename: "src/lib/hubspot.functions.ts"
}, (opts) => adminUpdateDealStage.__executeServer(opts));
var adminUpdateDealStage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i) => i).handler(adminUpdateDealStage_createServerFn_handler, async ({ context, data }) => {
	const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
	if (!requireSuperAdmin(roles)) throw new Error("Forbidden");
	const { hubspotUpdateDealStage } = await import("./hubspot.server-f7s0yyqp.mjs");
	await hubspotUpdateDealStage(data.dealId, data.stage);
	await logSync({
		userId: context.userId,
		action: "admin_update_stage",
		objectType: "deal",
		objectId: data.dealId,
		status: "success",
		payload: { stage: data.stage }
	});
	return { ok: true };
});
//#endregion
export { adminListHubspotContacts_createServerFn_handler, adminListHubspotDeals_createServerFn_handler, adminUpdateDealStage_createServerFn_handler, advanceMyDealStage_createServerFn_handler, syncSignupToHubspot_createServerFn_handler, trackLoginAndAdvance_createServerFn_handler };
