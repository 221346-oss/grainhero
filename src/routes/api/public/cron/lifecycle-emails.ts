import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily lifecycle emails cron.
 *
 * Auth: pass `?apikey=<SUPABASE_ANON_KEY>` or `apikey` header — matches the
 * pattern used by pg_cron + pg_net. Also accepts `x-cron-secret` for manual
 * runs (matches the existing `CRON_SECRET`).
 *
 * Sends: day3, day10, trial_ending (3 days before trial_ends_at),
 * reengagement (30 days after last_login).
 */
export const Route = createFileRoute("/api/public/cron/lifecycle-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => runLifecycleCron(request),
      GET: async ({ request }) => runLifecycleCron(request),
    },
  },
});

async function runLifecycleCron(request: Request) {
  const url = new URL(request.url);
  const apiKey =
    request.headers.get("apikey") ??
    url.searchParams.get("apikey") ??
    "";
  const cronSecret = request.headers.get("x-cron-secret") ?? "";

  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  const expected = process.env.CRON_SECRET ?? "";

  const authorized =
    (anon && apiKey && apiKey === anon) ||
    (expected && cronSecret && cronSecret === expected);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendLifecycleEmail } = await import("@/lib/email-automation.functions");

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const results: Record<string, number> = { day3: 0, day10: 0, trial_ending: 0, reengagement: 0, errors: 0 };

  // Fetch a reasonable batch of candidate profiles.
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, created_at, last_login, trial_ends_at")
    .limit(1000);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  for (const p of profiles ?? []) {
    try {
      const created = p.created_at ? new Date(p.created_at).getTime() : null;
      const lastLogin = p.last_login ? new Date(p.last_login).getTime() : null;
      const trialEnds = p.trial_ends_at ? new Date(p.trial_ends_at).getTime() : null;

      // Day 3 window (day 3-4 after signup).
      if (created && now - created >= 3 * day && now - created < 5 * day) {
        const r = await sendLifecycleEmail(p.id, "day3");
        if ("sent" in r && r.sent) results.day3++;
      }
      // Day 10 window (day 10-11).
      if (created && now - created >= 10 * day && now - created < 12 * day) {
        const r = await sendLifecycleEmail(p.id, "day10");
        if ("sent" in r && r.sent) results.day10++;
      }
      // Trial ending — 3 days before trial_ends_at.
      if (trialEnds && trialEnds - now > 0 && trialEnds - now <= 3 * day) {
        const r = await sendLifecycleEmail(p.id, "trial_ending");
        if ("sent" in r && r.sent) results.trial_ending++;
      }
      // Re-engagement — 30 days since last login.
      if (lastLogin && now - lastLogin >= 30 * day) {
        const r = await sendLifecycleEmail(p.id, "reengagement");
        if ("sent" in r && r.sent) results.reengagement++;
      }
    } catch {
      results.errors++;
    }
  }

  return Response.json({ ok: true, processed: profiles?.length ?? 0, results });
}