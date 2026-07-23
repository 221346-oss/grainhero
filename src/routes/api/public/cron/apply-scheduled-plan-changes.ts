/**
 * Cron: apply scheduled plan changes (downgrades and same-price cycle switches)
 * once their `apply_at` timestamp is reached. Auth: Supabase anon key in `apikey`.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/apply-scheduled-plan-changes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { emitToSuperAdmins, emitNotification } = await import("@/lib/notify");
        const { logActivity } = await import("@/lib/activity");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("tenant_plan_change_requests")
          .select("id, tenant_admin_id, requested_plan, current_plan, direction, billing_cycle, apply_at")
          .eq("status", "scheduled")
          .lte("apply_at", nowIso);
        if (error) return new Response(error.message, { status: 500 });

        const rows = (due ?? []) as Array<{
          id: string; tenant_admin_id: string; requested_plan: string;
          current_plan: string | null; direction: string | null;
          billing_cycle: string | null; apply_at: string | null;
        }>;
        let applied = 0;
        for (const r of rows) {
          const cycleDays = r.billing_cycle === "yearly" ? 365 : 30;
          const nextEnd = new Date(Date.now() + cycleDays * 86400_000).toISOString();
          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_plan: r.requested_plan,
              billing_cycle: r.billing_cycle ?? "monthly",
              current_period_end: nextEnd,
            } as never)
            .eq("id", r.tenant_admin_id);
          if (upErr) continue;
          await supabaseAdmin
            .from("tenant_plan_change_requests")
            .update({ status: "approved", decided_at: nowIso } as never)
            .eq("id", r.id);
          await emitNotification(supabaseAdmin, {
            recipientId: r.tenant_admin_id, tenantAdminId: r.tenant_admin_id,
            category: "plan", severity: "info",
            title: "Plan change applied",
            body: `Your plan is now ${r.requested_plan} (${r.billing_cycle ?? "monthly"}).`,
            link: "/plan-management",
            entityType: "plan_change_request", entityId: r.id,
          });
          await emitToSuperAdmins(supabaseAdmin, {
            category: "plan", severity: "info",
            title: "Scheduled plan change applied",
            body: `${r.current_plan ?? "?"} → ${r.requested_plan} (${r.billing_cycle ?? "monthly"}) for tenant ${r.tenant_admin_id}.`,
            link: "/platform/plans",
            entityType: "plan_change_request", entityId: r.id,
          });
          await logActivity({
            sb: supabaseAdmin, tenantAdminId: r.tenant_admin_id, actorId: null,
            action: "billing.plan_change_applied",
            targetType: "plan_change_request", targetId: r.id,
            meta: { direction: r.direction, from: r.current_plan, to: r.requested_plan },
          });
          applied += 1;
        }
        return Response.json({ ok: true, applied });
      },
    },
  },
});