import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { VariableFontText } from "@/components/app/VariableFontText";

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

  useEffect(() => {
    const stored = getStoredThemeMode();
    setMode(stored);
  }, []);

  const handleToggle = () => {
    const next = toggleThemeMode();
    setMode(next);
  };
  return (
    <SidebarProvider>
      <SessionGuard />
      <OnboardingTour />
      <div className="min-h-screen flex w-full bg-background">
        <div data-tour="sidebar" className="contents">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <ImpersonationBanner />
          <header className="h-14 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-30">
            <div className="flex-1 max-w-2xl mx-auto w-full">
              <AppSearch />
            </div>
            <DashboardQuickTabs />
            {/* Upgrade — plan management */}
            <Link
              to="/plan-management"
              className="shrink-0 h-9 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-3.5 text-sm font-semibold text-[#2FAC0C] transition-colors hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-900/50 dark:text-emerald-400"
            >
              <VariableFontText text="Upgrade" base={550} hover={900} />
            </Link>
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
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatedOutlet />
          </main>
        </div>
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