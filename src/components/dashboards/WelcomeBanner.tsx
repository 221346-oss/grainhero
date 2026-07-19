import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "gh_welcome_shown";

export function WelcomeBanner({ name }: { name?: string }) {
  const greeting = `Welcome back${name ? `, ${name}` : ""}`;
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) !== "1";
  });
  const [typed, setTyped] = useState("");
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      setTyped(greeting);
      const t = setTimeout(() => finish(), 1000);
      return () => clearTimeout(t);
    }
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(greeting.slice(0, i));
      if (i >= greeting.length) {
        clearInterval(iv);
        setTimeout(finish, 1600);
      }
    }, 45);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, greeting]);

  function finish() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
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