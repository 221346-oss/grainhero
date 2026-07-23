import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { NAV_TARGETS } from "@/components/app/AppSearch";

/**
 * SVG gooey filter — makes the pill and the detached icon-circle blend as one
 * fluid blob while the button expands. Scoped id so it never clashes with
 * another gooey filter on the page.
 */
const GooeyFilter = () => (
  <svg aria-hidden="true" className="absolute w-0 h-0 pointer-events-none">
    <defs>
      <filter id="header-goo-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
          result="goo"
        />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
);

const SearchIcon = () => (
  <motion.svg
    initial={{ opacity: 0, scale: 0.8, x: -4, filter: "blur(5px)" }}
    animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.8, x: -4, filter: "blur(5px)" }}
    transition={{ delay: 0.1, duration: 1, type: "spring", bounce: 0.15 }}
    width="18"
    height="18"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-[18px] h-[18px]"
  >
    <path
      d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
      fillRule="evenodd"
      clipRule="evenodd"
      className="fill-current"
    />
  </motion.svg>
);

const buttonVariants = {
  collapsed: { width: 150 },
  expanded: { width: 520 },
};

const iconVariants = {
  hidden: { x: -50, opacity: 0 },
  visible: { x: 12, opacity: 1 },
};

/**
 * Header search that starts as a compact "Search" pill and expands into a text
 * input with a detached, gooey icon-circle on click — the two-step animation
 * from the animated-search reference. The expanded input drives the real app
 * search: it broadcasts the query for page-scoped filtering (see
 * `useAppSearchQuery`) and jumps to the best-matching page on Enter.
 * Keyboard: "/" or ⌘K opens + focuses, Esc collapses.
 */
export function HeaderSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return NAV_TARGETS.filter(
      (t) =>
        t.label.toLowerCase().includes(needle) ||
        t.group.toLowerCase().includes(needle) ||
        (t.keywords ?? "").toLowerCase().includes(needle),
    ).slice(0, 8);
  }, [q]);

  // Focus on open; clear the query when it collapses.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (q) {
      setQ("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Broadcast the query so pages can filter their own lists.
  useEffect(() => {
    (window as unknown as { __appSearch?: string }).__appSearch = q;
    window.dispatchEvent(new CustomEvent("app:search", { detail: q }));
  }, [q]);

  // Global shortcuts: "/" or ⌘K / Ctrl+K open + focus; Esc collapses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = matches[0];
      if (target) {
        e.preventDefault();
        setQ("");
        setOpen(false);
        navigate({ to: target.to as never });
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <GooeyFilter />

      <motion.div
        className="relative filter-[url(#header-goo-effect)]"
        initial={false}
      >
        <motion.div
          variants={buttonVariants}
          initial={false}
          animate={open ? "expanded" : "collapsed"}
          transition={{ duration: 0.55, type: "spring", bounce: 0.15 }}
          onClick={() => !open && setOpen(true)}
          className={clsx(
            "search-btn h-11 flex items-center rounded-full bg-muted px-5 tracking-[-0.5px] text-foreground",
            !open && "cursor-pointer",
          )}
          role={open ? undefined : "button"}
          aria-label={open ? undefined : "Open search"}
        >
          {!open ? (
            <span className="pointer-events-none select-none text-base font-medium">Search</span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKeyDown}
              onBlur={() => !q && setOpen(false)}
              placeholder="Search anything…"
              aria-label="Search"
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none border-none"
            />
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {open && (
            <motion.button
              key="icon"
              type="button"
              onClick={() => {
                const target = matches[0];
                if (target) {
                  setQ("");
                  setOpen(false);
                  navigate({ to: target.to as never });
                } else {
                  setOpen(false);
                }
              }}
              aria-label="Search"
              className="separate-element absolute -right-3 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-muted text-foreground"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={iconVariants}
              transition={{ delay: 0.1, duration: 0.85, type: "spring", bounce: 0.15 }}
            >
              <SearchIcon />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
