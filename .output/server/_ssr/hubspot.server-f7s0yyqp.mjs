import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/hubspot.server-f7s0yyqp.js
var GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";
var HUBSPOT_STAGES = {
	trialStarted: "appointmentscheduled",
	trialActive: "qualifiedtobuy",
	trialEngaged: "presentationscheduled",
	demoRequested: "decisionmakerboughtin",
	quoteSent: "contractsent",
	negotiation: "3963478776",
	closedWon: "closedwon",
	closedLost: "closedlost"
};
function headers() {
	const lovableKey = processModule.env.LOVABLE_API_KEY;
	const hubspotKey = processModule.env.HUBSPOT_API_KEY;
	if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
	if (!hubspotKey) throw new Error("HUBSPOT_API_KEY is not configured");
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${lovableKey}`,
		"X-Connection-Api-Key": hubspotKey
	};
}
async function req(path, init = {}) {
	const res = await fetch(`${GATEWAY_URL}${path}`, {
		...init,
		headers: {
			...headers(),
			...init.headers
		}
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`HubSpot request failed [${res.status}] ${path}: ${body}`);
	}
	return await res.json();
}
async function hubspotCreateContact(props) {
	return req("/crm/v3/objects/contacts", {
		method: "POST",
		body: JSON.stringify({ properties: props })
	});
}
async function hubspotCreateDeal(companyName, contactId) {
	const associations = contactId ? [{
		to: { id: contactId },
		types: [{
			associationCategory: "HUBSPOT_DEFINED",
			associationTypeId: 3
		}]
	}] : [];
	return req("/crm/v3/objects/deals", {
		method: "POST",
		body: JSON.stringify({
			properties: {
				dealname: `${companyName} - GrainHero Trial`,
				dealstage: HUBSPOT_STAGES.trialStarted,
				amount: "0",
				closedate: new Date(Date.now() + 336 * 60 * 60 * 1e3).toISOString()
			},
			associations
		})
	});
}
async function hubspotUpdateDealStage(dealId, stage) {
	return req(`/crm/v3/objects/deals/${dealId}`, {
		method: "PATCH",
		body: JSON.stringify({ properties: { dealstage: stage } })
	});
}
async function hubspotListDeals(limit = 100) {
	return req(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,dealstage,amount,closedate,createdate`);
}
async function hubspotListContacts(limit = 100) {
	return req(`/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,phone,company,createdate,lastmodifieddate`);
}
//#endregion
export { HUBSPOT_STAGES, hubspotCreateContact, hubspotCreateDeal, hubspotListContacts, hubspotListDeals, hubspotUpdateDealStage };
