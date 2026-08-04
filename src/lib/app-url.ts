// Server-only: the canonical origin for building absolute URLs (Stripe
// redirects, email links, auth redirects). Must come from the environment —
// there is no safe hardcoded fallback, since silently defaulting to someone
// else's domain would misdirect real users/payments in any deployment where
// this var is missing.
export function requireAppOrigin(): string {
  const origin = process.env.APP_ORIGIN;
  if (!origin) {
    throw new Error("APP_ORIGIN environment variable is not set — cannot build an absolute redirect URL.");
  }
  return origin;
}

export function getAuthRedirectOrigin() {
  if (typeof window === "undefined") {
    return requireAppOrigin();
  }
  // Client-side: always use the actual origin so localhost redirects stay local.
  return window.location.origin;
}