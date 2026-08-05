// Server-only Resend helper. Prefers the Lovable connector gateway (used in
// production on Lovable Cloud, where LOVABLE_API_KEY is auto-injected at
// runtime); falls back to calling Resend directly with just RESEND_API_KEY
// when LOVABLE_API_KEY isn't set — i.e. local dev.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const RESEND_DIRECT_URL = "https://api.resend.com/emails";

export async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? "GrainHero <onboarding@resend.dev>";

  const body = JSON.stringify({
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });

  const response = lovableKey
    ? await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body,
      })
    : await fetch(RESEND_DIRECT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body,
      });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend request failed [${response.status}]: ${errorBody}`);
  }
  return (await response.json()) as { id?: string };
}
