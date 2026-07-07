import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 20 minutes of inactivity → force sign-out
const IDLE_MS = 20 * 60 * 1000;
// 12h absolute session cap
const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
// Warn 2 min before idle timeout
const WARN_MS = 2 * 60 * 1000;

const SESSION_START_KEY = "gh_session_started_at";

/**
 * Enforces idle timeout, absolute session cap, cross-tab sign-out,
 * and revalidates the session when the tab becomes visible again.
 * Mount once inside the authenticated layout.
 */
export function SessionGuard() {
  const navigate = useNavigate();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const signOutAndRedirect = useCallback(
    async (reason: "idle" | "expired" | "external") => {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      try {
        bcRef.current?.postMessage({ type: "signed-out" });
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem(SESSION_START_KEY);
      } catch {
        /* ignore */
      }
      navigate({ to: "/auth/login", search: { reason } as never, replace: true });
    },
    [navigate],
  );

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => {
      toast("You'll be signed out in 2 minutes for inactivity.", {
        action: {
          label: "Stay signed in",
          onClick: () => {
            supabase.auth.refreshSession().catch(() => {});
            resetIdle();
          },
        },
      });
    }, IDLE_MS - WARN_MS);
    idleTimer.current = setTimeout(() => {
      void signOutAndRedirect("idle");
    }, IDLE_MS);
  }, [signOutAndRedirect]);

  useEffect(() => {
    // Record session start (persist across reloads within the absolute cap window)
    try {
      const existing = localStorage.getItem(SESSION_START_KEY);
      if (!existing) localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }

    // Absolute cap
    let started = Date.now();
    try {
      const v = Number(localStorage.getItem(SESSION_START_KEY));
      if (Number.isFinite(v) && v > 0) started = v;
    } catch {
      /* ignore */
    }
    const remaining = Math.max(0, ABSOLUTE_MS - (Date.now() - started));
    absoluteTimer.current = setTimeout(() => {
      void signOutAndRedirect("expired");
    }, remaining);

    // Cross-tab broadcast
    try {
      bcRef.current = new BroadcastChannel("gh_auth");
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === "signed-out") {
          void signOutAndRedirect("external");
        }
      };
    } catch {
      /* ignore */
    }

    // Activity listeners
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    const onActivity = () => resetIdle();
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    resetIdle();

    // Revalidate on tab focus
    const onVis = async () => {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) void signOutAndRedirect("expired");
    };
    document.addEventListener("visibilitychange", onVis);

    // Supabase-driven sign-out
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try {
          localStorage.removeItem(SESSION_START_KEY);
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVis);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (absoluteTimer.current) clearTimeout(absoluteTimer.current);
      sub.subscription.unsubscribe();
      try {
        bcRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [resetIdle, signOutAndRedirect]);

  return null;
}