import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Aggregated go-live checklist for super-admins. Each check returns
// { key, label, ok, detail } so the UI can render ticks/crosses.
export const getLaunchReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: syncErr },
      { count: syncTotal },
      { count: webhookFailures },
      { count: invoiceFailures },
      { count: pendingRefunds },
      { count: openDisputes },
      { count: activeSubs },
      { count: signups },
    ] = await Promise.all([
      supabaseAdmin.from("mobile_sync_runs").select("*", { count: "exact", head: true }).eq("status", "error").gte("started_at", dayAgo),
      supabaseAdmin.from("mobile_sync_runs").select("*", { count: "exact", head: true }).gte("started_at", dayAgo),
      supabaseAdmin.from("insurance_webhook_events").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("email_send_log").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", weekAgo),
      supabaseAdmin.from("buyer_refunds").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("buyer_disputes").select("*", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    ]);

    const checks = [
      { key: "sync", label: "Mobile sync healthy (24h)", ok: (syncErr ?? 0) === 0, detail: `${syncErr ?? 0} errors / ${syncTotal ?? 0} runs` },
      { key: "webhooks", label: "Insurance webhooks clean", ok: (webhookFailures ?? 0) === 0, detail: `${webhookFailures ?? 0} failed events` },
      { key: "invoices", label: "Invoice emails delivering (7d)", ok: (invoiceFailures ?? 0) === 0, detail: `${invoiceFailures ?? 0} failed` },
      { key: "refunds", label: "No stuck refunds", ok: (pendingRefunds ?? 0) === 0, detail: `${pendingRefunds ?? 0} pending` },
      { key: "disputes", label: "Disputes triaged", ok: (openDisputes ?? 0) < 5, detail: `${openDisputes ?? 0} open` },
      { key: "subs", label: "Paying subscribers present", ok: (activeSubs ?? 0) > 0, detail: `${activeSubs ?? 0} active` },
      { key: "growth", label: "Signups this week", ok: (signups ?? 0) > 0, detail: `${signups ?? 0} new profiles` },
    ];
    const passing = checks.filter((c) => c.ok).length;
    return {
      generated_at: new Date().toISOString(),
      passing,
      total: checks.length,
      score: Math.round((passing / checks.length) * 100),
      checks,
    };
  });