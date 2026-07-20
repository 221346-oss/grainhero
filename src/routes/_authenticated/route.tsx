import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSearch } from "@/components/app/AppSearch";
import { AppSidebar } from "@/components/app/AppSidebar";
import { DashboardQuickTabs } from "@/components/app/DashboardQuickTabs";
import { Sun, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SessionGuard } from "@/components/app/SessionGuard";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";
import { NotificationBell } from "@/components/app/notifications/NotificationBell";
import { getStoredThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";
import TextShimmer from "@/components/ui/text-shimmer";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth/login" });

    // Role-aware guardrails: block super_admins from tenant-operational
    // routes, and redirect them off tenant pages that have a canonical
    // platform equivalent (avoid two lenses on the same data).
    const OPERATIONAL_PREFIXES = [
      "/silos", "/warehouses", "/grain-batches", "/sensors", "/actuators",
    ];
    // super_admin → platform equivalent. Keep in sync with plan §2.
    const SUPER_ADMIN_REDIRECTS: Record<string, string> = {
      "/team-management": "/platform/users",
      "/traceability": "/dashboard",
      "/orders": "/platform/orders",
    };

    const path = location.pathname;
    const needsRoleCheck =
      OPERATIONAL_PREFIXES.some((p) => path.startsWith(p)) ||
      Object.keys(SUPER_ADMIN_REDIRECTS).some((p) => path === p || path.startsWith(p + "/"));

    if (needsRoleCheck) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const rs = (roles ?? []).map((r) => r.role as string);
      const isSuperAdmin = rs.includes("super_admin");
      const alsoOperational = rs.some((r) => ["admin", "manager", "technician"].includes(r));
      if (isSuperAdmin && !alsoOperational) {
        if (OPERATIONAL_PREFIXES.some((p) => path.startsWith(p))) {
          throw redirect({ to: "/not-allowed" });
        }
        for (const [from, to] of Object.entries(SUPER_ADMIN_REDIRECTS)) {
          if (path === from || path.startsWith(from + "/")) {
            throw redirect({ to });
          }
        }
      }
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [mode, setMode] = useState<ThemeMode>(() =>
    typeof window !== "undefined" ? getStoredThemeMode() : "light"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = getStoredThemeMode();
    setMode(stored);
  }, []);

  // Scroll-driven behavior on the main scroll container:
  //  • hide header when scrolling down past 150px, show on scroll up
  //  • auto-close sidebar if user scrolls down more than 20px
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let lastY = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastY;
      if (dy > 0 && y > 150) setHeaderVisible(false);
      else if (dy < 0) setHeaderVisible(true);
      if (dy > 20) setSidebarOpen((open) => (open ? false : open));
      lastY = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Close sidebar on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleToggle = () => {
    const next = toggleThemeMode();
    setMode(next);
  };
  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SessionGuard />
      <OnboardingTour />
      <div className="relative min-h-screen w-full bg-background">
        {/* Floating GrainHero brand button — always visible, toggles the sidebar. */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          className="fixed top-2.5 left-3 sm:left-4 z-[80] select-none rounded-lg px-2 py-1 hover:bg-muted/50 active:scale-[0.98] transition"
        >
          <span className="text-lg sm:text-xl font-black tracking-tight">
            <span className="text-[#2FAC0C] text-xl sm:text-2xl">G</span>
            <span className="text-foreground">rain</span>
            <span className="text-[#2FAC0C] text-xl sm:text-2xl">H</span>
            <span className="text-foreground">ero</span>
          </span>
        </button>

        {/* Floating sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="sidebar-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
              />
              <motion.div
                key="sidebar-panel"
                data-tour="sidebar"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-0 left-0 z-[65] h-screen"
              >
                <AppSidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating header — hides on scroll down, reappears on scroll up */}
        <motion.header
          animate={{ y: headerVisible ? 0 : -80, opacity: headerVisible ? 1 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 left-0 right-0 h-14 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-3 sm:px-6 pl-28 sm:pl-36 z-40"
        >
          <div className="flex-1 max-w-2xl mx-auto w-full">
            <AppSearch />
          </div>
          <DashboardQuickTabs />
          <Link
            to="/plan-management"
            className="shrink-0 h-9 inline-flex items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-[#2FAC0C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400"
          >
            <TextShimmer duration={2.2} baseColor="#2FAC0C99" peakColor="#4ade80">Upgrade</TextShimmer>
          </Link>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
          >
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationBell />
        </motion.header>

        <main
          ref={mainRef}
          className="h-screen overflow-y-auto overflow-x-hidden pt-14"
        >
          <ImpersonationBanner />
          <AnimatedOutlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}