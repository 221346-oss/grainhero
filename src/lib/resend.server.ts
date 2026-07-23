// Server-only Resend helper via Lovable connector gateway.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  const from =
    params.from ??
    process.env.RESEND_FROM_EMAIL ??
    "GrainHero <onboarding@resend.dev>";

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend request failed [${response.status}]: ${errorBody}`);
  }
  return (await response.json()) as { id?: string };
}