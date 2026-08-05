import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/alerts-escalation")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Escalate open alerts older than 30 minutes to 'escalated'.
        // Field incidents (recipient_id set) are excluded from *this* pass —
        // they never move to 'escalated', only pending -> closed. A separate
        // pass below handles their own 30-min timeout: technician-created
        // field incidents get *reassigned* (recipient_id changes) rather than
        // escalated (see field-incidents.functions.ts).
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
          .from("grain_alerts")
          .update({ status: "escalated", updated_at: new Date().toISOString() })
          .in("status", ["pending", "acknowledged"])
          .is("recipient_id", null)
          .lt("created_at", cutoff)
          .select("id");

        if (error) {
          console.error("alerts-escalation error:", error);
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        // Field incidents: a technician's pick-a-manager report that's still
        // unacknowledged (pending) after 30 minutes gets *reassigned* to the
        // tenant Admin — recipient_id moves, the row isn't duplicated, so the
        // original manager loses visibility (see field-incidents.functions.ts
        // listFieldIncidents' creator/recipient-only filter). Only rows the
        // reporter tagged `custom_fields.escalatable=true` (technician-created)
        // are eligible — manager-created and admin-created field incidents
        // have a single fixed recipient and never time out.
        let reassigned = 0;
        const { data: due, error: dueErr } = await supabaseAdmin
          .from("grain_alerts")
          .select("id, admin_id, recipient_id, custom_fields")
          .eq("source", "field_incident")
          .eq("status", "pending")
          .contains("custom_fields", { escalatable: true })
          .lt("created_at", cutoff);
        if (dueErr) {
          console.error("field-incident reassignment error:", dueErr);
        } else {
          const { emitNotification } = await import("@/lib/notify");
          for (const incident of (due ?? []) as unknown as Array<{ id: string; admin_id: string; recipient_id: string | null; custom_fields: Record<string, unknown> | null }>) {
            const tenantAdminId = incident.admin_id;
            if (!tenantAdminId || incident.recipient_id === tenantAdminId) continue;
            const oldRecipient = incident.recipient_id;
            const { error: reassignErr } = await supabaseAdmin
              .from("grain_alerts")
              .update({
                recipient_id: tenantAdminId,
                custom_fields: {
                  ...(incident.custom_fields ?? {}),
                  escalatable: false,
                  reassignedFrom: oldRecipient,
                  reassignedAt: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              } as never)
              .eq("id", incident.id);
            if (reassignErr) {
              console.error("field-incident reassign failed:", incident.id, reassignErr.message);
              continue;
            }
            reassigned += 1;
            await emitNotification(supabaseAdmin, {
              recipientId: tenantAdminId,
              tenantAdminId,
              category: "incident",
              severity: "warning",
              title: "Field incident reassigned to you",
              body: "Unacknowledged for 30 minutes — reassigned from a manager on your team.",
              link: "/administration",
              entityType: "grain_alert",
              entityId: incident.id,
            });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, escalated: data?.length ?? 0, reassigned, at: new Date().toISOString() }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});