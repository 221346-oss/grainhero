/**
 * Phase 5 — Unified notification emitter.
 *
 * All server code that creates rows in `public.notifications` must go through
 * these helpers. Direct `.from('notifications').insert(...)` calls are flagged
 * by scripts/audit-server-fns.ts (allow-listed only for this file).
 *
 * The helpers accept the supabase client used by the caller so they honour
 * the caller's RLS context. Pass `supabaseAdmin` when fan-out crosses tenants
 * (super-admin broadcasts, webhook-driven notifications).
 */

export type NotifSeverity = "info" | "success" | "warning" | "critical";
export type NotifCategory =
  | "billing"
  | "plan"
  | "order"
  | "install"
  | "security"
  | "system"
  | "ops"
  | "insurance"
  | "webhook"
  | "incident";

export type NotifInput = {
  recipientId: string;
  tenantAdminId: string;
  category: NotifCategory;
  severity?: NotifSeverity;
  title: string;
  body: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

// Loose typing: this module is imported by both authed and admin clients.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

function row(input: NotifInput) {
  return {
    admin_id: input.tenantAdminId,
    user_id: input.recipientId,
    type: input.severity ?? "info",
    category: input.category,
    title: input.title.slice(0, 200),
    message: input.body.slice(0, 2000),
    action_url: input.link ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as never,
  };
}

/** Emit a single notification. Never throws — logs and swallows. */
export async function emitNotification(sb: SB, input: NotifInput): Promise<void> {
  try {
    const { data, error } = await sb
      .from("notifications")
      .insert(row(input) as never)
      .select("id")
      .maybeSingle();
    if (error) console.warn("[notify] insert failed", error.message);
    const id = (data as { id?: string } | null)?.id;
    if (id) void fanOut([id]);
  } catch (err) {
    console.warn("[notify] exception", err);
  }
}

/** Emit the same notification to many recipients within a tenant. */
export async function emitBulk(
  sb: SB,
  recipients: string[],
  base: Omit<NotifInput, "recipientId">,
): Promise<void> {
  const unique = Array.from(new Set(recipients.filter(Boolean)));
  if (!unique.length) return;
  try {
    const rows = unique.map((r) => row({ ...base, recipientId: r }));
    const { data, error } = await sb
      .from("notifications")
      .insert(rows as never)
      .select("id");
    if (error) console.warn("[notify] bulk insert failed", error.message);
    const ids = (data as Array<{ id: string }> | null)?.map((r) => r.id) ?? [];
    if (ids.length) void fanOut(ids);
  } catch (err) {
    console.warn("[notify] bulk exception", err);
  }
}

/**
 * Fan-out to every user with `role` inside the given tenant.
 * Uses `sb` to look up recipients (RLS applies).
 *
 * `profiles` and `user_roles` both independently reference `auth.users` —
 * there's no direct FK between the two — so PostgREST can't auto-embed
 * `user_roles(role)` under a `profiles` select (it silently returns no
 * embedded rows rather than throwing). Query them separately and intersect
 * in application code instead of relying on that embed.
 */
export async function emitToRole(
  sb: SB,
  tenantAdminId: string,
  role: "admin" | "manager" | "technician",
  base: Omit<NotifInput, "recipientId" | "tenantAdminId">,
): Promise<void> {
  const { data: tenantProfiles, error: profilesErr } = await sb
    .from("profiles")
    .select("id")
    .or(`admin_id.eq.${tenantAdminId},id.eq.${tenantAdminId}`);
  if (profilesErr) {
    console.warn("[notify] emitToRole: tenant profile lookup failed", profilesErr.message);
    return;
  }
  const tenantIds = (tenantProfiles ?? []).map((p: { id: string }) => p.id);
  if (!tenantIds.length) return;

  const { data: roleRows, error: rolesErr } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("role", role)
    .in("user_id", tenantIds);
  if (rolesErr) {
    console.warn("[notify] emitToRole: role lookup failed", rolesErr.message);
    return;
  }
  const ids = (roleRows ?? []).map((r: { user_id: string }) => r.user_id);
  await emitBulk(sb, ids, { ...base, tenantAdminId });
}

/**
 * Broadcast to every super_admin. Requires a supabase client that can read
 * `user_roles` across tenants — pass `supabaseAdmin` from client.server.
 */
export async function emitToSuperAdmins(
  sb: SB,
  base: Omit<NotifInput, "recipientId" | "tenantAdminId">,
): Promise<void> {
  const { data } = await sb.from("user_roles").select("user_id").eq("role", "super_admin");
  const ids = (data ?? []).map((r: { user_id: string }) => r.user_id);
  if (!ids.length) return;
  // Each super-admin is their own tenant for admin_id purposes.
  const rows = ids.map((id: string) => row({ ...base, recipientId: id, tenantAdminId: id }));
  try {
    const { data, error } = await sb
      .from("notifications")
      .insert(rows as never)
      .select("id");
    if (error) console.warn("[notify] super-admin fan-out failed", error.message);
    const ids = (data as Array<{ id: string }> | null)?.map((r) => r.id) ?? [];
    if (ids.length) void fanOut(ids);
  } catch (err) {
    console.warn("[notify] super-admin exception", err);
  }
}

/**
 * Fire-and-forget delivery fan-out. Loads server-only modules lazily so this
 * file remains safe to import from client-reachable server-fn modules.
 */
async function fanOut(ids: string[]) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { dispatchNotification } = await import("@/lib/notify-dispatch.server");
    await Promise.all(
      ids.map((id) =>
        dispatchNotification(supabaseAdmin, id).catch((e) => {
          console.warn("[notify] dispatch failed", id, (e as Error).message);
        }),
      ),
    );
  } catch (e) {
    console.warn("[notify] fanOut init failed", (e as Error).message);
  }
}
