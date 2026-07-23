import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HeaderSearch } from "@/components/app/HeaderSearch";
import { AppSidebar } from "@/components/app/AppSidebar";
import { DashboardQuickTabs } from "@/components/app/DashboardQuickTabs";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { Sun, Moon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SessionGuard } from "@/components/app/SessionGuard";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";
import { NotificationBell } from "@/components/app/notifications/NotificationBell";
import { BugReportButton } from "@/components/app/BugReportButton";
import { getStoredThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";
import TextShimmer from "@/components/ui/text-shimmer";
import { AppShellSkeleton } from "@/components/app/AppShellSkeleton";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Full app-chrome skeleton while the auth check runs on first paint.
  pendingComponent: AppShellSkeleton,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth/login" });

    // Role-aware guardrails: block super_admins from tenant-operational
    // routes, and redirect them off tenant pages that have a canonical
    // platform equivalent (avoid two lenses on the same data). Silos,
    // warehouses, and grain batches were consolidated into the tabbed
    // /grain-operations workspace — that's what's blocked now, not the old
    // standalone paths. /silos/:siloId (the detail view) is still a real
    // standalone route (linked from attention.tsx, ManagerBento.tsx), so it
    // stays blocked too, via the "/silos/" sub-route prefix.
    const OPERATIONAL_PREFIXES = [
      "/grain-operations", "/silos/", "/sensors", "/actuators",
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mode, setMode] = useState<ThemeMode>(() =>
    typeof window !== "undefined" ? getStoredThemeMode() : "light"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredThemeMode();
    setMode(stored);
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

  // Floating header/sidebar — slide away on scroll-down, back on scroll-up.
  // The page body (not <main>) is what actually scrolls here — the layout
  // is min-h-screen, not h-screen, so <main>'s overflow-y-auto never gets
  // short enough to scroll internally. Listen on window, same as the
  // landing page's nav.
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setNavHidden(y > lastScrollY && y > 4);
      lastScrollY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Every page should start the same way: header visible, scrolled to top —
  // otherwise leftover scroll state from the previous page (e.g. hidden
  // header from scrolling down on Grain Operations) carries over and makes
  // the next page look different on arrival.
  useEffect(() => {
    window.scrollTo(0, 0);
    setNavHidden(false);
  }, [pathname]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SessionGuard />
      <OnboardingTour />
      <BugReportButton />
      <div className="app-scope min-h-screen flex w-full bg-background">
        <div data-tour="sidebar" className="contents">
          <AppSidebar hidden={navHidden} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <ImpersonationBanner />
          <motion.header
            initial="visible"
            animate={navHidden ? "hidden" : "visible"}
            variants={{
              visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
              hidden: { opacity: 0, y: -20, transition: { duration: 0.25, ease: [0.55, 0.085, 0.68, 0.53] } },
            }}
            className="h-14 flex items-center gap-2 sm:gap-3 rounded-2xl bg-background/90 backdrop-blur-md px-3 sm:px-6 shadow-lg shadow-black/5 sticky top-2 z-30 mx-2 sm:mx-3 mt-2"
          >
            <div className="flex-1 flex items-center justify-center">
              <HeaderSearch />
            </div>
            <DashboardQuickTabs />
            <AdminUpgradeLink />
            {/* Dark / Light toggle */}
            <button
              type="button"
              onClick={handleToggle}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              {mode === "dark"
                ? <Sun className="h-4 w-4" />
                : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
            <ProfileMenu />
          </motion.header>
          <main className="flex-1 overflow-x-hidden">
            <AnimatedOutlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Only tenant admins see the Upgrade shortcut in the topbar.
function AdminUpgradeLink() {
  const { role } = useIsSuperAdmin();
  if (role !== "admin") return null;
  return (
    <Link
      to="/plan-management"
      className="shrink-0 h-9 inline-flex items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-[#2FAC0C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400"
    >
      <TextShimmer duration={2.2} baseColor="#2FAC0C99" peakColor="#4ade80">Upgrade</TextShimmer>
    </Link>
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