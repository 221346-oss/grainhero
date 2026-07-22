import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 14.5 — SLA digest.
 * Sends super-admins a daily digest of overdue shipments + delivery trends.
 * Dedupes via public.platform_email_digest_log using digest_key = "sla_daily".
 */
export const Route = createFileRoute("/api/public/cron/sla-digest")({
  server: { handlers: {
    POST: async ({ request }) => {
      const cronSecret = process.env.CRON_SECRET;
      const auth = request.headers.get("authorization") ?? "";
      if (cronSecret && auth !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendEmailViaResend } = await import("@/lib/resend.server");
      const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabaseAdmin as any;
      const now = new Date();
      const windowStart = new Date(now.getTime() - 24 * 3_600_000);

      // Dedupe: only send once per 20-hour window
      const { data: recent } = await sb.from("platform_email_digest_log")
        .select("id").eq("digest_key", "sla_daily")
        .gte("created_at", new Date(now.getTime() - 20 * 3_600_000).toISOString())
        .maybeSingle();
      if (recent) return Response.json({ ok: true, skipped: "already sent" });

      const settings = await loadMarketplaceSettings(sb);
      const slaCutoff = new Date(now.getTime() - settings.dispatch.slaHours.inTransit * 3_600_000).toISOString();

      const [{ data: overdue }, { data: recentShip }] = await Promise.all([
        sb.from("buyer_shipments")
          .select("id, order_id, status, courier_label, dispatched_at, expected_delivery_at, buyer_orders(order_number)")
          .in("status", ["in_transit","out_for_delivery","exception"])
          .lt("dispatched_at", slaCutoff)
          .order("dispatched_at", { ascending: true })
          .limit(50),
        sb.from("buyer_shipments")
          .select("status, dispatched_at, delivered_at")
          .gte("dispatched_at", windowStart.toISOString()),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipRows = (recentShip ?? []) as any[];
      const total = shipRows.length;
      const delivered = shipRows.filter((s) => s.status === "delivered").length;
      const rate = total ? Math.round((delivered / total) * 100) : 0;
      const overdueList = (overdue ?? []) as Array<{
        buyer_orders: { order_number?: string } | null;
        courier_label: string | null; dispatched_at: string; status: string;
      }>;

      // Fetch super-admin recipients
      const { data: sa } = await sb.from("user_roles")
        .select("user_id, profiles!inner(email, name)").eq("role", "super_admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recipients = ((sa ?? []) as any[])
        .map((r) => r.profiles?.email as string | undefined)
        .filter((e): e is string => !!e);
      if (!recipients.length) return Response.json({ ok: true, skipped: "no super_admins" });

      const rowsHtml = overdueList.length
        ? overdueList.map((s) =>
            `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${s.buyer_orders?.order_number ?? "—"}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${s.courier_label ?? ""}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${s.status}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${new Date(s.dispatched_at).toLocaleString()}</td></tr>`
          ).join("")
        : `<tr><td colspan="4" style="padding:12px;color:#64748b">No overdue shipments 🎉</td></tr>`;

      const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:640px;color:#0f172a">
        <h2 style="margin:0 0 6px">GrainHero SLA digest</h2>
        <div style="color:#475569;font-size:14px;margin-bottom:16px">Window: ${windowStart.toLocaleString()} — ${now.toLocaleString()}</div>
        <div style="display:flex;gap:16px;margin-bottom:16px">
          <div><div style="font-size:12px;color:#64748b">Shipments</div><div style="font-size:22px;font-weight:600">${total}</div></div>
          <div><div style="font-size:12px;color:#64748b">Delivered</div><div style="font-size:22px;font-weight:600;color:#059669">${delivered}</div></div>
          <div><div style="font-size:12px;color:#64748b">Delivery rate</div><div style="font-size:22px;font-weight:600">${rate}%</div></div>
          <div><div style="font-size:12px;color:#64748b">Overdue</div><div style="font-size:22px;font-weight:600;color:#dc2626">${overdueList.length}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;background:#f1f5f9"><th style="padding:6px 8px">Order</th><th style="padding:6px 8px">Courier</th><th style="padding:6px 8px">Status</th><th style="padding:6px 8px">Dispatched</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      </div>`;

      let sent = 0;
      for (const to of recipients) {
        try {
          await sendEmailViaResend({
            to, subject: `[GrainHero] SLA digest — ${overdueList.length} overdue, ${rate}% delivered`,
            html, from: settings.fromEmail,
          });
          sent++;
        } catch (e) { console.warn("[sla-digest] email failed:", (e as Error).message); }
      }

      await sb.from("platform_email_digest_log").insert({
        digest_key: "sla_daily",
        window_start: windowStart.toISOString(),
        window_end: now.toISOString(),
        recipients_count: sent,
        payload: { total, delivered, rate, overdue: overdueList.length },
      } as never);

      return Response.json({ ok: true, sent, overdue: overdueList.length });
    },
  } },
});