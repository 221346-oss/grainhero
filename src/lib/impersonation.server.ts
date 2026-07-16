import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

export const IMPERSONATION_COOKIE = "gh_impersonate";
const MAX_AGE = 60 * 60 * 8; // 8h

export function readImpersonationCookie(): string | null {
  const header = getRequestHeader("cookie") ?? "";
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split("=");
    if (k === IMPERSONATION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function writeImpersonationCookie(value: string | null) {
  if (value == null) {
    setResponseHeader(
      "set-cookie",
      `${IMPERSONATION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
    );
  } else {
    setResponseHeader(
      "set-cookie",
      `${IMPERSONATION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`,
    );
  }
}