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
export function SessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate({ to: "/auth/login", replace: true });
      }
      if (event === "SIGNED_IN") {
        // Increment login count and, at 3+ logins, advance HubSpot deal.
        void trackLoginAndAdvance().catch(() => {});
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
