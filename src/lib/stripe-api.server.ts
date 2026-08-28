const STRIPE_API = "https://api.stripe.com/v1";

export function stripeForm(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.append(k, String(v));
  }
  return body;
}

export async function stripeFetch(
  path: string,
  body: URLSearchParams | null,
  method: "GET" | "POST" = "POST",
) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe not configured");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ?? undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[stripe ${res.status}] ${path}: ${text}`);
    throw new Error(`Stripe error ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}
