import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { trackLoginAndAdvance } from "@/lib/hubspot.functions";

/**
 * Lightweight session listener. During this testing/onboarding phase we
 * intentionally do NOT enforce idle timeouts, absolute session caps, or
 * revalidate-on-focus — those caused a redirect loop for beta interns.
 *
 * We only react to an explicit SIGNED_OUT event (user clicks "Sign out"
 * or their token is revoked server-side) and send them to the login page.
 */
const SESSION_KEY = "gh_session_started_at";
const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function SessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Absolute 24h session cap.
    const enforceMaxSession = async () => {
      const started = Number(localStorage.getItem(SESSION_KEY) || 0);
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      if (!started) {
        localStorage.setItem(SESSION_KEY, String(Date.now()));
        return;
      }
      if (Date.now() - started > MAX_SESSION_MS) {
        localStorage.removeItem(SESSION_KEY);
        await supabase.auth.signOut();
        navigate({ to: "/auth/login", search: { reason: "expired" } as never, replace: true });
      }
    };
    void enforceMaxSession();
    const t = window.setInterval(enforceMaxSession, 60_000);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem(SESSION_KEY);
        navigate({ to: "/auth/login", replace: true });
      }
      if (event === "SIGNED_IN") {
        localStorage.setItem(SESSION_KEY, String(Date.now()));
        // Increment login count and, at 3+ logins, advance HubSpot deal.
        void trackLoginAndAdvance().catch(() => {});
      }
    });
    return () => {
      window.clearInterval(t);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
