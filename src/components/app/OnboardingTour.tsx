import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * A game-style guided tour that plays the first time a signed-in user lands
 * on the app (and can be replayed from Settings). Each step points to a real
 * UI element via `data-tour="…"`, highlights it with a spotlight, and shows
 * a friendly tooltip with next/back/skip controls.
 * 
 * Tour completion is stored per-user in Supabase profiles.preferences.onboarding_completed
 */

const STORAGE_KEY = "gh_onboarding_v1_done"; // Fallback for local storage
const RESTART_EVENT = "gh:restart-tour";

type Step = {
  id: string;
  title: string;
  body: string;
  /** CSS selector for the element to highlight; null = centered welcome card. */
  target?: string;
  /** Preferred tooltip side. */
  placement?: "right" | "bottom" | "left" | "top" | "center";
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to GrainHero 👋",
    body: "Let's take a 60-second tour so you know where everything lives. You can skip anytime and replay it later from Settings.",
    placement: "center",
  },
  {
    id: "sidebar",
    title: "This is your control center",
    body: "Use the sidebar to jump between silos, batches, sensors, orders, and reports. Everything you manage lives here.",
    target: '[data-tour="sidebar"]',
    placement: "right",
  },
  {
    id: "dashboard",
    title: "Live dashboard",
    body: "The dashboard shows real-time temperature, humidity, and alerts across all your silos. Green means safe, amber = watch, red = act now.",
    target: '[data-tour="nav-dashboard"]',
    placement: "right",
  },
  {
    id: "orders",
    title: "Hardware & install orders",
    body: "Track your sensor purchase and technician visit here. When your install goes live, this is where you'll confirm it.",
    target: '[data-tour="nav-orders"]',
    placement: "right",
  },
  {
    id: "notifications",
    title: "Alerts land here",
    body: "Spoilage warnings, subscription notices, and order updates pop into the bell — and we also email you when it's urgent.",
    target: '[data-tour="topbar-notifications"]',
    placement: "bottom",
  },
  {
    id: "profile",
    title: "Your account & settings",
    body: "Click your avatar to update your profile, replay this tour, or manage your subscription.",
    target: '[data-tour="topbar-profile"]',
    placement: "bottom",
  },
  {
    id: "done",
    title: "You're all set! 🎉",
    body: "That's the whirlwind tour. If you get stuck, hit the ❓ button on the sidebar to replay this or reach support.",
    placement: "center",
  },
];

/** Public helper — call to replay the tour from anywhere. */
export async function restartOnboardingTour() {
  if (typeof window === "undefined") return;
  
  // Clear local storage fallback
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  
  // Clear Supabase preference
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();
      
      const preferences = (profile?.preferences as any) || {};
      await supabase
        .from("profiles")
        .update({
          preferences: {
            ...preferences,
            onboarding_completed: false,
          },
        })
        .eq("id", user.id);
    }
  } catch (error) {
    console.error("Failed to reset onboarding in database:", error);
  }
  
  window.dispatchEvent(new Event(RESTART_EVENT));
}

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user has completed onboarding (Supabase + localStorage fallback)
  const checkOnboardingStatus = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return true; // Not logged in, don't show tour
      
      setUserId(user.id);
      
      // Check Supabase first (source of truth)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        // Fallback to localStorage on database error
        try {
          return window.localStorage.getItem(STORAGE_KEY) === "1";
        } catch {
          return false;
        }
      }
      
      const preferences = (profile?.preferences as any) || {};
      
      // If onboarding_completed is explicitly set in database, use that
      if (preferences.onboarding_completed !== undefined) {
        return preferences.onboarding_completed;
      }
      
      // For existing users without the flag, check localStorage as migration path
      try {
        const localDone = window.localStorage.getItem(STORAGE_KEY) === "1";
        if (localDone) {
          // Migrate localStorage flag to database
          await supabase
            .from("profiles")
            .update({
              preferences: {
                ...preferences,
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
              },
            })
            .eq("id", user.id);
          return true;
        }
      } catch {
        /* ignore localStorage errors */
      }
      
      // New user - show the tour
      return false;
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // Fallback to localStorage on any error
      try {
        return window.localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    }
  }, []);

  // Kick off on first visit + listen for manual restarts.
  useEffect(() => {
    let mounted = true;
    
    checkOnboardingStatus().then((done) => {
      if (mounted && !done) {
        // Small delay so the sidebar & layout have mounted.
        const t = setTimeout(() => {
          if (mounted) setActive(true);
        }, 450);
        return () => clearTimeout(t);
      }
    });

    const onRestart = () => {
      if (mounted) {
        setStepIdx(0);
        setActive(true);
      }
    };
    window.addEventListener(RESTART_EVENT, onRestart);
    return () => {
      mounted = false;
      window.removeEventListener(RESTART_EVENT, onRestart);
    };
  }, [checkOnboardingStatus]);

  const step = STEPS[stepIdx];

  // Track the target element's on-screen rect (updates on resize/scroll).
  const measure = useCallback(() => {
    if (!active || !step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    (el as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const interval = window.setInterval(measure, 500); // handle late-mounting UI
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(interval);
    };
  }, [active, measure]);

  const finish = useCallback(async () => {
    // Save to localStorage as fallback
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    
    // Save to Supabase (source of truth)
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", userId)
          .single();
        
        const preferences = (profile?.preferences as any) || {};
        await supabase
          .from("profiles")
          .update({
            preferences: {
              ...preferences,
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
            },
          })
          .eq("id", userId);
        
        console.log("✅ Onboarding tour completed and saved to database");
      } catch (error) {
        console.error("Failed to save onboarding completion to database:", error);
        // Tour still closes, localStorage is the fallback
      }
    }
    
    setActive(false);
  }, [userId]);

  const next = () => {
    if (stepIdx >= STEPS.length - 1) return finish();
    setStepIdx((i) => i + 1);
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  // Position tooltip based on target rect + placement.
  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    const pad = 14;
    if (!step) return { display: "none" };
    if (!rect || step.placement === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = Math.min(340, vw - 24);
    const tipH = 200; // approximate

    let top = 0;
    let left = 0;
    switch (step.placement) {
      case "right":
        left = rect.right + pad;
        top = rect.top + rect.height / 2 - tipH / 2;
        break;
      case "left":
        left = rect.left - pad - tipW;
        top = rect.top + rect.height / 2 - tipH / 2;
        break;
      case "top":
        top = rect.top - pad - tipH;
        left = rect.left + rect.width / 2 - tipW / 2;
        break;
      case "bottom":
      default:
        top = rect.bottom + pad;
        left = rect.left + rect.width / 2 - tipW / 2;
        break;
    }
    // Clamp inside viewport with 12px margin.
    left = Math.min(Math.max(12, left), vw - tipW - 12);
    top = Math.min(Math.max(12, top), vh - tipH - 12);
    return { top, left, width: tipW };
  }, [rect, step]);

  if (!active || !step) return null;
  if (typeof document === "undefined") return null;

  const isCentered = !rect || step.placement === "center";
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
        <defs>
          <mask id="gh-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && !isCentered && (
              <rect
                x={rect.left - 8}
                y={rect.top - 8}
                width={rect.width + 16}
                height={rect.height + 16}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.62)"
          mask="url(#gh-tour-mask)"
          style={{ transition: "all 0.25s ease" }}
        />
      </svg>

      {/* Animated ring around the target */}
      {rect && !isCentered && (
        <div
          className="absolute pointer-events-none rounded-xl ring-2 ring-emerald-400 animate-pulse"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.25)",
            transition: "all 0.25s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute pointer-events-auto animate-scale-in"
        style={tooltipStyle}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-w-sm">
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                {stepIdx === STEPS.length - 1 ? (
                  <PartyPopper className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                  Step {stepIdx + 1} of {STEPS.length}
                </p>
                <h3 className="font-semibold text-slate-900 leading-tight">{step.title}</h3>
              </div>
              <button
                onClick={finish}
                aria-label="Skip tour"
                className="text-slate-400 hover:text-slate-700 transition p-1 -mr-1 -mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={finish}
                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {stepIdx > 0 && (
                  <Button size="sm" variant="outline" onClick={back}>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-[#00a63e] hover:bg-[#029238] text-white"
                  onClick={next}
                >
                  {stepIdx === STEPS.length - 1 ? (
                    "Let's go"
                  ) : (
                    <>
                      Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}