import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSuperAdmin } from "./rbac.server";

const COOKIE_NAME = "gh_impersonate";
const MAX_AGE = 60 * 60 * 8; // 8h

function readCookie(name: string): string | null {
  const header = getRequestHeader("cookie") ?? "";
  for (const part of header.split(/;\s*/)) {
    const [k, ...rest] = part.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function writeCookie(value: string | null) {
  if (value == null) {
    setResponseHeader(
      "set-cookie",
      `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`,
    );
  } else {
    setResponseHeader(
      "set-cookie",
      `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`,
    );
  }
}

/** Super-admin only: start viewing the app as the given tenant admin. */
export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ targetAdminId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isSuperAdmin(supabase, userId))) throw new Error("Forbidden");
    const { data: target, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", data.targetAdminId)
      .maybeSingle();
    if (error) throw error;
    if (!target) throw new Error("Tenant not found");
    writeCookie(target.id);
    return { adminId: target.id, tenantName: target.name ?? target.email ?? target.id };
  });

export const stopImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    writeCookie(null);
    return { ok: true };
  });

/** Returns current impersonation target, or null. */
export const getImpersonation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isSuperAdmin(supabase, userId))) return null;
    const adminId = readCookie(COOKIE_NAME);
    if (!adminId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", adminId)
      .maybeSingle();
    if (!data) return null;
    return { adminId: data.id, tenantName: data.name ?? data.email ?? data.id };
  });

/** Server-side helper: read active impersonation target (super_admin only). */
export function readImpersonationCookie(): string | null {
  return readCookie(COOKIE_NAME);
}

export const IMPERSONATION_COOKIE = COOKIE_NAME;