export const APP_ORIGIN = "https://grainheroo.lovable.app";

export function getAuthRedirectOrigin() {
  if (typeof window === "undefined") return APP_ORIGIN;
  const origin = window.location.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return APP_ORIGIN;
  return origin;
}