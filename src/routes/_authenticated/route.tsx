import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeInit } from "@/components/app/ThemeInit";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <ThemeInit />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
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
              className="relative shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[--fusion-grape] ring-2 ring-background" />
            </Link>
            <div className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-[13px] font-black text-[--fusion-ink] shadow-sm relative" style={{ background: "var(--gradient-fusion)" }}>
              G
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[--fusion-grape] ring-2 ring-background" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}