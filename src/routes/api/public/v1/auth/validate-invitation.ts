import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ok } from "@/lib/mobile-auth.server";

const BODY = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(4).max(32),
});

// Pre-session check: lets the client show a "valid code" state before asking for a
// password. Same generic failure message either way — never reveals whether the
// email exists. No Authorization header — the caller has no session yet.
export const Route = createFileRoute("/api/public/v1/auth/validate-invitation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BODY>;
        try {
          body = BODY.parse(await request.json());
        } catch (e) {
          return Response.json({ error: "validation_failed", detail: String(e) }, { status: 422 });
        }

        const email = body.email.toLowerCase();
        const code = body.code.trim().toUpperCase();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("invitation_token, invitation_expires")
          .eq("email", email)
          .maybeSingle();

        const invalid = () =>
          Response.json(
            { error: "invalid_invitation", message: "Invalid or expired invitation code." },
            { status: 400 },
          );

        if (!profile?.invitation_token || profile.invitation_token !== code) return invalid();
        if (!profile.invitation_expires || new Date(profile.invitation_expires) < new Date())
          return invalid();

        return ok({ valid: true });
      },
    },
  },
});
