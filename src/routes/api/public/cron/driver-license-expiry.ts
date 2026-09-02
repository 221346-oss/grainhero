import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 17 — Driver licence expiry watcher.
 * Emits a super-admin notification when a driver's licence hits one of the
 * configured warn-day thresholds. Dedupes via activity_logs.
 */
export const Route = createFileRoute("/api/public/cron/driver-license-expiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        void request;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadMarketplaceSettings } = await import("@/lib/marketplace-settings.functions");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;
        const settings = await loadMarketplaceSettings(sb);
        const warnDays = settings.logistics.licenseExpiryWarnDays;

        const { data: drivers } = await sb
          .from("drivers")
          .select("id, full_name, license_expiry, carrier_id")
          .eq("active", true)
          .not("license_expiry", "is", null);

        const { data: supers } = await sb
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");
        const superIds = (supers ?? []).map((r: { user_id: string }) => r.user_id);

        let notified = 0;
        const now = new Date();
        for (const d of (drivers ?? []) as Array<Record<string, unknown>>) {
          const exp = new Date(d.license_expiry as string);
          const days = Math.floor((exp.getTime() - now.getTime()) / 86_400_000);
          if (!warnDays.includes(days)) continue;
          // dedupe key on activity_logs
          const dedupKey = `driver_license.warn.${d.id}.${days}`;
          const { data: dup } = await sb
            .from("activity_logs")
            .select("id")
            .eq("action", dedupKey)
            .limit(1)
            .maybeSingle();
          if (dup) continue;
          for (const uid of superIds) {
            await sb.from("notifications").insert({
              admin_id: uid,
              category: "logistics",
              severity: days <= 1 ? "error" : "warning",
              title: `Driver licence expiring in ${days}d`,
              body: `${d.full_name} — expires ${exp.toISOString().slice(0, 10)}`,
              link: "/platform/logistics/fleet",
            });
          }
          await sb.from("activity_logs").insert({
            admin_id: superIds[0] ?? "",
            user_id: null,
            action: dedupKey,
            description: `licence warn ${days}d for ${d.full_name}`,
            entity_type: "driver",
            entity_id: d.id,
            severity: "warning",
            metadata: { days_remaining: days },
          });
          notified++;
        }

        return Response.json({ ok: true, notified });
      },
    },
  },
});
