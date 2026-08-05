// Server-only expiry reminder engine. Import lazily.
const RESEND_URL = "https://api.resend.com/emails";

export async function runExpiryReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const thresholds = [7, 3, 1];
  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * 86400_000);

  const { data: subs, error } = await supabaseAdmin
    .from("subscriptions")
    .select("id, admin_id, plan_name, end_date, status, notified_expiry_thresholds")
    .in("status", ["active", "trial"])
    .gte("end_date", now.toISOString())
    .lte("end_date", horizon.toISOString());
  if (error) throw error;

  const sent: Array<{ subscriptionId: string; email: string; days: number }> = [];
  const failed: Array<{ subscriptionId: string; error: string }> = [];

  for (const s of subs ?? []) {
    if (!s.end_date || !s.admin_id) continue;
    const daysLeft = Math.ceil((new Date(s.end_date).getTime() - now.getTime()) / 86400_000);
    const threshold = thresholds.find((t) => daysLeft <= t);
    if (!threshold) continue;
    const already = (s.notified_expiry_thresholds ?? []) as number[];
    if (already.includes(threshold)) continue;

    // Fetch admin email + prefs
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, name, preferences")
      .eq("id", s.admin_id)
      .maybeSingle();
    if (!profile?.email) continue;
    const prefs = (profile.preferences ?? {}) as any;
    const wantsEmail = prefs.expiry_email_alerts !== false; // default on
    const wantsPush = prefs.expiry_push_alerts !== false;

    try {
      if (wantsEmail && process.env.RESEND_API_KEY) {
        const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        const html = `
          <div style="font-family:Inter,sans-serif;color:#0f172a;">
            <h2>Your GrainHero ${s.plan_name ?? "plan"} expires in ${threshold} day${threshold === 1 ? "" : "s"}</h2>
            <p>Hi ${profile.name ?? "there"},</p>
            <p>Your subscription ends on <b>${new Date(s.end_date).toLocaleDateString()}</b>. Renew or manage your plan to avoid interruption.</p>
            <p><a href="${(process.env.PUBLIC_APP_URL ?? "https://grainhero.app").replace(/\/$/, "")}/subscription" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Manage subscription</a></p>
            <p style="color:#64748b;font-size:12px;margin-top:24px;">You can disable expiry alerts in Settings → Notifications.</p>
          </div>`;
        const res = await fetch(RESEND_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `GrainHero <${from}>`,
            to: [profile.email],
            subject: `Your GrainHero plan expires in ${threshold} day${threshold === 1 ? "" : "s"}`,
            html,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Resend ${res.status}: ${t.slice(0, 200)}`);
        }
      }

      if (wantsPush) {
        const { emitNotification } = await import("@/lib/notify");
        await emitNotification(supabaseAdmin, {
          recipientId: s.admin_id,
          tenantAdminId: s.admin_id,
          category: "billing",
          severity: "warning",
          title: `Plan expires in ${threshold} day${threshold === 1 ? "" : "s"}`,
          body: `Your ${s.plan_name ?? "subscription"} ends on ${new Date(s.end_date).toLocaleDateString()}. Renew to avoid interruption.`,
          link: "/subscription",
          entityType: "subscription",
          entityId: s.id,
        });
      }

      await supabaseAdmin
        .from("subscriptions")
        .update({ notified_expiry_thresholds: [...already, threshold] })
        .eq("id", s.id);

      sent.push({ subscriptionId: s.id, email: profile.email, days: threshold });
    } catch (e: any) {
      console.error("[expiry-reminder]", s.id, e?.message);
      failed.push({ subscriptionId: s.id, error: String(e?.message ?? e) });
    }
  }

  return { checked: subs?.length ?? 0, sent, failed };
}
