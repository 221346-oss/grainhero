import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ok } from "@/lib/mobile-auth.server";

const BODY = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(4).max(32),
  name: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(32).optional(),
});

// Every role logs in via email OTP only — nothing in this app ever checks a
// password — so there's no signUp()/password step before this call. This endpoint
// is the entire acceptance: validates the code, confirms the email directly via the
// service role (no client-side auth action needed first), optionally updates
// name/phone if the invitee wants to correct what the inviter entered, and consumes
// the code. Role/admin_id/warehouse_id were already assigned at invite-issue time by
// inviteTeamMember and are intentionally left alone.
export const Route = createFileRoute("/api/public/v1/auth/accept-invite")({
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
          .select("id, invitation_token, invitation_expires")
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

        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          email_confirm: true,
        });
        if (confirmError) {
          return Response.json(
            { error: "internal_error", detail: confirmError.message },
            { status: 500 },
          );
        }

        await supabaseAdmin
          .from("profiles")
          .update({
            invitation_token: null,
            invitation_expires: null,
            email_verified: true,
            ...(body.name ? { name: body.name } : {}),
            ...(body.phone ? { phone: body.phone } : {}),
          } as never)
          .eq("id", profile.id);

        return ok({ accepted: true });
      },
    },
  },
});
