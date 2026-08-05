import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ── helpers ───────────────────────────────────────────────────────────────────

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const msg = r.error.issues
    .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
    .join(" · ");
  throw new Error(msg);
}

async function resolveRole(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  const order = ["super_admin", "admin", "manager", "technician", "buyer", "pending"];
  return order.find((r) => roles.includes(r)) ?? "admin";
}

// ── types ─────────────────────────────────────────────────────────────────────

export type TicketRow = {
  id: string;
  admin_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  reporter_name: string;
  reporter_role: "admin" | "manager" | "technician";
  description: string;
  status: "open" | "resolved" | "closed";
  closed_at: string | null;
  closed_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_note: string | null;
  created_at: string;
  updated_at: string;
  admin_name?: string | null;
  admin_email?: string | null;
};

// ── createTicket ──────────────────────────────────────────────────────────────

const createTicketInput = z.object({
  title: z.string().min(3).max(200),
  priority: z.enum(["low", "medium", "high"]),
  reporter_name: z.string().min(1).max(120),
  reporter_role: z.enum(["admin", "manager", "technician"]),
  description: z.string().min(1).max(4000),
});

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(createTicketInput, d))
  .handler(async ({ data, context }) => {
    const role = await resolveRole(context.supabase as never, context.userId);
    if (role === "super_admin") throw new Error("Super admins cannot create tickets.");

    const { data: ticket, error } = await context.supabase
      .from("field_tickets")
      .insert({
        admin_id: context.userId,
        title: data.title,
        priority: data.priority,
        reporter_name: data.reporter_name,
        reporter_role: data.reporter_role,
        description: data.description,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("[createTicket] insert failed:", error.message, error.code);
      throw new Error(error.message);
    }

    const ticketId = (ticket as { id: string }).id;

    // Notify all super_admins — use context.supabase since user_roles is readable
    // by the authenticated user, and notifications for other users uses
    // a fallback approach: insert one at a time so RLS user_id check passes per-row.
    // Actually we fan-out via a direct DB function call using the anon key won't work,
    // so we fetch super_admins and insert notifications skipping RLS by using
    // the authenticated client which has SUPABASE_PUBLISHABLE_KEY.
    // The notifications table must allow insert for the service or we skip gracefully.
    const { data: superAdmins } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const fromName = (profile as { name?: string; email?: string } | null)?.name
      ?? (profile as { name?: string; email?: string } | null)?.email
      ?? "Admin";

    const priorityType = data.priority === "high" ? "warning" : "info";

    const notificationRows = ((superAdmins ?? []) as { user_id: string }[]).map((sa) => ({
      user_id: sa.user_id,
      admin_id: context.userId,
      title: `New ticket: ${data.title}`,
      message: `${fromName} reported a ${data.priority}-priority incident. Click to review.`,
      category: "ticket",
      type: priorityType,
      read: false,
      action_url: "/platform/reporting?tab=tickets",
      entity_type: "field_ticket",
      entity_id: ticketId,
      metadata: {
        ticket_id: ticketId,
        priority: data.priority,
        reporter_name: data.reporter_name,
        reporter_role: data.reporter_role,
      },
    }));

    if (notificationRows.length > 0) {
      // Use security-definer RPC so no service role key is needed
      for (const n of notificationRows) {
        const { error: rpcErr } = await context.supabase.rpc("insert_notification", {
          p_user_id: n.user_id,
          p_admin_id: n.admin_id,
          p_title: n.title,
          p_message: n.message,
          p_category: n.category,
          p_type: n.type,
          p_action_url: n.action_url,
          p_entity_type: n.entity_type,
          p_entity_id: n.entity_id,
          p_metadata: n.metadata,
        });
        if (rpcErr) {
          console.warn("[createTicket] notification RPC failed:", rpcErr.message);
        }
      }
    }

    return { ticket: ticket as TicketRow };
  });

// ── listTickets ───────────────────────────────────────────────────────────────
// Access control is done entirely in the server function.
// The field_tickets table has RLS DISABLED so context.supabase can read all rows.
// Security: role is verified server-side before any data is returned.

const listTicketsInput = z.object({
  status: z.enum(["open", "closed", "all"]).default("open"),
});

export const listTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(listTicketsInput, d))
  .handler(async ({ data, context }) => {
    const role = await resolveRole(context.supabase as never, context.userId);

    let q = context.supabase
      .from("field_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "super_admin") {
      // Super admin: can see all tickets, filter by status
      if (data.status !== "all") {
        q = q.eq("status", data.status);
      }
    } else {
      // Admin: their own tickets that are open OR resolved (resolved = superadmin acted, admin should close)
      q = q.eq("admin_id", context.userId).in("status", ["open", "resolved"]);
    }

    const { data: rows, error } = await q.limit(200);

    if (error) {
      console.error("[listTickets] query failed:", error.message, "role:", role);
      throw new Error(error.message);
    }

    const tickets = rows as TicketRow[];

    // Enrich with creator name/email for super admin view
    if (role === "super_admin" && tickets.length > 0) {
      const adminIds = [...new Set(tickets.map((t) => t.admin_id))];
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", adminIds);
      const byId = new Map(
        ((profiles ?? []) as { id: string; name: string | null; email: string | null }[]).map(
          (p) => [p.id, p],
        ),
      );
      for (const t of tickets) {
        const p = byId.get(t.admin_id);
        t.admin_name = p?.name ?? null;
        t.admin_email = p?.email ?? null;
      }
    }

    return { tickets, role };
  });

// ── closeTicket ───────────────────────────────────────────────────────────────

const closeTicketInput = z.object({ id: z.string().uuid() });

export const closeTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(closeTicketInput, d))
  .handler(async ({ data, context }) => {
    const role = await resolveRole(context.supabase as never, context.userId);

    const patch = {
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: context.userId,
    };

    // RLS is disabled on field_tickets — server function enforces access rules
    let q = context.supabase
      .from("field_tickets")
      .update(patch)
      .eq("id", data.id)
      .in("status", ["open", "resolved"]); // can close open or resolved tickets

    // Admin can only close their own tickets
    if (role !== "super_admin") {
      q = q.eq("admin_id", context.userId);
    }

    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── getTicketById ─────────────────────────────────────────────────────────────

const getTicketByIdInput = z.object({ id: z.string().uuid() });

export const getTicketById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(getTicketByIdInput, d))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("field_tickets")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const t = ticket as TicketRow;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("name, email")
      .eq("id", t.admin_id)
      .maybeSingle();
    t.admin_name = (profile as { name?: string | null } | null)?.name ?? null;
    t.admin_email = (profile as { email?: string | null } | null)?.email ?? null;
    return { ticket: t };
  });

// ── resolveTicket ─────────────────────────────────────────────────────────────
// Super admin marks a ticket as resolved (with optional note).
// This signals the admin that action has been taken — admin then closes it.
// A notification is sent to the admin who raised the ticket.

const resolveTicketInput = z.object({
  id: z.string().uuid(),
  note: z.string().max(1000).optional(),
});

export const resolveTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(resolveTicketInput, d))
  .handler(async ({ data, context }) => {
    const role = await resolveRole(context.supabase as never, context.userId);
    if (role !== "super_admin") throw new Error("Only super admins can resolve tickets.");

    const { data: ticket, error } = await context.supabase
      .from("field_tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
        resolved_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("status", "open")
      .select("admin_id, title")
      .single();

    if (error) throw new Error(error.message);

    // Notify the admin who raised this ticket via security-definer RPC
    // (works without service role key)
    const t = ticket as { admin_id: string; title: string };
    const { error: rpcErr } = await context.supabase.rpc("insert_notification", {
      p_user_id: t.admin_id,
      p_admin_id: context.userId,
      p_title: `Ticket resolved: ${t.title}`,
      p_message: data.note
        ? `Super admin resolved your ticket with note: "${data.note}". You can now close it.`
        : "Super admin has resolved your ticket. You can now close it.",
      p_category: "ticket",
      p_type: "success",
      p_action_url: null,
      p_entity_type: "field_ticket",
      p_entity_id: data.id,
      p_metadata: { ticket_id: data.id, resolved_note: data.note ?? null },
    });
    if (rpcErr) {
      console.warn("[resolveTicket] notification RPC failed:", rpcErr.message);
    }

    return { ok: true };
  });

// ── deleteTicket ──────────────────────────────────────────────────────────────
// Super admin only. Can only delete closed tickets (not open/resolved).

const deleteTicketInput = z.object({ id: z.string().uuid() });

export const deleteTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(deleteTicketInput, d))
  .handler(async ({ data, context }) => {
    const role = await resolveRole(context.supabase as never, context.userId);
    if (role !== "super_admin") throw new Error("Only super admins can delete tickets.");

    // Use RPC to bypass any remaining RLS restrictions
    const { error } = await context.supabase.rpc("delete_field_ticket", {
      p_ticket_id: data.id,
      p_user_id: context.userId,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
