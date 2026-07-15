export const APP_ORIGIN = "https://grainheroo.lovable.app";

export function getAuthRedirectOrigin() {
  if (typeof window === "undefined") {
    // Server-side: use env var if set, otherwise fall back to production URL.
    return process.env.APP_ORIGIN || APP_ORIGIN;
  }
  // Client-side: always use the actual origin so localhost redirects stay local.
  return window.location.origin;
}