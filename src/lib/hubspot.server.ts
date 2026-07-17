// Server-only HubSpot helper via Lovable connector gateway.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";

export const HUBSPOT_STAGES = {
  trialStarted: "appointmentscheduled",
  trialActive: "qualifiedtobuy",
  trialEngaged: "presentationscheduled",
  demoRequested: "decisionmakerboughtin",
  quoteSent: "contractsent",
  negotiation: "3963478776",
  closedWon: "closedwon",
  closedLost: "closedlost",
} as const;

function headers() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const hubspotKey = process.env.HUBSPOT_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!hubspotKey) throw new Error("HUBSPOT_API_KEY is not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": hubspotKey,
  };
}

async function req<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot request failed [${res.status}] ${path}: ${body}`);
  }
  return (await res.json()) as T;
}

export type HubspotContactProps = {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
};

export async function hubspotCreateContact(props: HubspotContactProps) {
  return req<{ id: string }>("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties: props }),
  });
}

export async function hubspotCreateDeal(companyName: string, contactId?: string) {
  const associations = contactId
    ? [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
      }]
    : [];
  return req<{ id: string }>("/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        dealname: `${companyName} - GrainHero Trial`,
        dealstage: HUBSPOT_STAGES.trialStarted,
        amount: "0",
        closedate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      associations,
    }),
  });
}

export async function hubspotUpdateDealStage(dealId: string, stage: string) {
  return req<{ id: string }>(`/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { dealstage: stage } }),
  });
}

export async function hubspotListDeals(limit = 100) {
  return req<{ results: Array<{ id: string; properties: Record<string, string> }> }>(
    `/crm/v3/objects/deals?limit=${limit}&properties=dealname,dealstage,amount,closedate,createdate`,
  );
}

export async function hubspotListContacts(limit = 100) {
  return req<{ results: Array<{ id: string; properties: Record<string, string> }> }>(
    `/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,phone,company,createdate,lastmodifieddate`,
  );
}