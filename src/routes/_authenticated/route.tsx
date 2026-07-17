import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeInit } from "@/components/app/ThemeInit";
import { SessionGuard } from "@/components/app/SessionGuard";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { useMyProfile, initialsOf } from "@/hooks/useMyProfile";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: profile } = useMyProfile();
  const avatar = profile?.avatar ?? null;
  const initials = initialsOf(profile?.name, profile?.email);
  return (
    <SidebarProvider>
      <ThemeInit />
      <SessionGuard />
      <OnboardingTour />
      <div className="min-h-screen flex w-full bg-background">
        <div data-tour="sidebar" className="contents">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0" />
            <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search silos, batches, sensors…"
                  className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-muted/60 hover:bg-muted focus:bg-background border border-transparent focus:border-[--fusion-grape]/50 focus:outline-none transition placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <Link
              to="/notifications"
              aria-label="Notifications"
              data-tour="topbar-notifications"
              className="relative shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[--fusion-grape] ring-2 ring-background" />
            </Link>
            <Link
              to="/settings"
              aria-label="Your profile"
              data-tour="topbar-profile"
              className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-[12px] font-bold text-[--fusion-ink] shadow-sm relative overflow-hidden ring-1 ring-black/5 hover:ring-[--fusion-grape]/60 transition"
              style={avatar ? undefined : { background: "var(--gradient-fusion)" }}
            >
              {avatar ? (
                <img src={avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[--fusion-grape] ring-2 ring-background" />
            </Link>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}