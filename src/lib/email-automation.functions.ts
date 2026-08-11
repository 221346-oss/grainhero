import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  welcomeEmailHTML,
  day3EmailHTML,
  day10EmailHTML,
  trialEndingEmailHTML,
  reengagementEmailHTML,
} from "./email-templates";

function firstNameOf(name?: string | null, email?: string | null) {
  if (name) return name.trim().split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "there";
}

function appOrigin() {
  return (
    process.env.APP_ORIGIN ??
    process.env.PUBLIC_APP_URL ??
    process.env.VITE_APP_URL ??
    "https://grainhero.app"
  );
}

/** Send the welcome email immediately on signup. */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, name").eq("id", context.userId).maybeSingle();
    if (!profile?.email) return { skipped: true };

    // Idempotent guard.
    const { data: existing } = await supabaseAdmin
      .from("email_send_log")
      .select("id")
      .eq("user_id", context.userId)
      .eq("email_type", "welcome")
      .maybeSingle();
    if (existing) return { skipped: true };

    const { sendEmailViaResend } = await import("./resend.server");
    try {
      const res = await sendEmailViaResend({
        to: profile.email,
        subject: "Welcome to GrainHero 🌾",
        html: welcomeEmailHTML(firstNameOf(profile.name, profile.email), `${appOrigin()}/dashboard`),
      });
      await supabaseAdmin.from("email_send_log").insert({
        user_id: context.userId,
        email_type: "welcome",
        recipient_email: profile.email,
        status: "sent",
        provider_message_id: res.id ?? null,
      });
      return { sent: true };
    } catch (e) {
      await supabaseAdmin.from("email_send_log").insert({
        user_id: context.userId,
        email_type: "welcome",
        recipient_email: profile.email,
        status: "error",
        error_message: (e as Error).message,
      });
      return { sent: false, error: (e as Error).message };
    }
  });

export type LifecycleStage = "day3" | "day10" | "trial_ending" | "reengagement";

/** Internal helper the cron uses. Uses admin client + skips duplicates. */
export async function sendLifecycleEmail(userId: string, stage: LifecycleStage) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("email, name, trial_ends_at").eq("id", userId).maybeSingle();
  if (!profile?.email) return { skipped: true };

  const { data: existing } = await supabaseAdmin
    .from("email_send_log").select("id")
    .eq("user_id", userId).eq("email_type", stage).maybeSingle();
  if (existing) return { skipped: true };

  const firstName = firstNameOf(profile.name, profile.email);
  const origin = appOrigin();

  // Silo count (best-effort).
  const { count: siloCountRaw } = await supabaseAdmin
    .from("silos").select("id", { count: "exact", head: true }).eq("admin_id", userId);
  const siloCount = siloCountRaw ?? 0;
  const storageGB = Math.max(1, siloCount * 2);

  let subject = "";
  let html = "";
  switch (stage) {
    case "day3":
      subject = "Maximize your GrainHero trial 🚀";
      html = day3EmailHTML(firstName, siloCount, `${origin}/analytics`);
      break;
    case "day10":
      subject = "Unlock hidden features 💎";
      html = day10EmailHTML(firstName, siloCount, storageGB, `${origin}/analytics`);
      break;
    case "trial_ending": {
      const daysLeft = profile.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : 3;
      subject = `Your GrainHero trial ends in ${daysLeft} days`;
      html = trialEndingEmailHTML(firstName, daysLeft, `${origin}/plans`);
      break;
    }
    case "reengagement":
      subject = "We miss you at GrainHero 👋";
      html = reengagementEmailHTML(firstName, siloCount, storageGB, `${origin}/auth/login`);
      break;
  }

  const { sendEmailViaResend } = await import("./resend.server");
  try {
    const res = await sendEmailViaResend({ to: profile.email, subject, html });
    await supabaseAdmin.from("email_send_log").insert({
      user_id: userId,
      email_type: stage,
      recipient_email: profile.email,
      status: "sent",
      provider_message_id: res.id ?? null,
    });
    return { sent: true };
  } catch (e) {
    await supabaseAdmin.from("email_send_log").insert({
      user_id: userId,
      email_type: stage,
      recipient_email: profile.email,
      status: "error",
      error_message: (e as Error).message,
    });
    return { sent: false, error: (e as Error).message };
  }
}