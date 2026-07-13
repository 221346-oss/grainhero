export const APP_ORIGIN = "https://grainheroo.lovable.app";

export function getAuthRedirectOrigin() {
  if (typeof window === "undefined") {
    // Server side — use APP_ORIGIN env var if set, fallback to Lovable
    return process.env.APP_ORIGIN || APP_ORIGIN;
  }
  // Client side — always use the actual window origin
  // This ensures forgot password links work on localhost AND production
  return window.location.origin;
}