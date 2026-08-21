import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LAST_ACTIVE_KEY = "gh_last_active_ts";
const INACTIVITY_MS = 2 * 60 * 1000; // 2 minutes

const RETURN_MESSAGES = [
  "Ready to dive back in",
  "Let's pick up where you left off",
  "Back at it",
  "Ready when you are",
  "Good to see you again",
];

function pickReturnMessage(name?: string) {
  const base = RETURN_MESSAGES[Math.floor(Math.random() * RETURN_MESSAGES.length)];
  return name ? `${base}, ${name}` : base;
}

export function WelcomeBanner({ name }: { name?: string }) {
  const [greeting, setGreeting] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(false);
  const [typed, setTyped] = useState("");
  const playingRef = useRef(false);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const markActive = useCallback(() => {
    try {
      sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const trigger = useCallback(
    (mode: "welcome" | "return") => {
      if (playingRef.current) return;
      playingRef.current = true;
      setGreeting(
        mode === "welcome" ? `Welcome back${name ? `, ${name}` : ""}` : pickReturnMessage(name),
      );
      setTyped("");
      setVisible(true);
    },
    [name],
  );

  // Initial mount: first visit of session → welcome; otherwise check inactivity.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = Number(sessionStorage.getItem(LAST_ACTIVE_KEY) || 0);
    if (!last) {
      trigger("welcome");
    } else if (Date.now() - last > INACTIVITY_MS) {
      trigger("return");
    }
    markActive();
  }, [trigger, markActive]);

  // Detect return from inactivity via visibility + user activity.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInactivity = () => {
      const last = Number(sessionStorage.getItem(LAST_ACTIVE_KEY) || 0);
      if (last && Date.now() - last > INACTIVITY_MS) {
        trigger("return");
      }
      markActive();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkInactivity();
      else markActive();
    };
    const onActivity = () => {
      checkInactivity();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    // Throttled activity heartbeat so idle timer resets while user is scrolling/moving.
    let last = 0;
    const throttled = () => {
      const now = Date.now();
      if (now - last > 15_000) {
        last = now;
        markActive();
      }
    };
    window.addEventListener("mousemove", throttled, { passive: true });
    window.addEventListener("scroll", throttled, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousemove", throttled);
      window.removeEventListener("scroll", throttled);
    };
  }, [trigger, markActive]);

  // Typewriter effect.
  useEffect(() => {
    if (!visible || !greeting) return;
    if (reduced) {
      setTyped(greeting);
      const t = setTimeout(finish, 1000);
      return () => clearTimeout(t);
    }
    let i = 0;
    setTyped("");
    const iv = setInterval(() => {
      i += 1;
      setTyped(greeting.slice(0, i));
      if (i >= greeting.length) {
        clearInterval(iv);
        setTimeout(finish, 1600);
      }
    }, 45);
    return () => clearInterval(iv);
  }, [visible, greeting, reduced]);

  function finish() {
    setVisible(false);
    // Allow re-trigger after collapse animation completes.
    setTimeout(() => {
      playingRef.current = false;
    }, 600);
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="py-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {typed}
              <span className="inline-block w-[2px] h-6 sm:h-7 align-middle bg-emerald-500 ml-1 animate-pulse" />
            </h1>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
