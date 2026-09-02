import { ReactNode, useState, useEffect } from "react";
import { Menu, Bell, X, Moon, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileAdminNav } from "./MobileAdminNav";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTickets } from "@/lib/tickets.functions";
import { TicketDetailSheet } from "@/components/app/tickets/TicketDetailSheet";
import type { TicketRow } from "@/lib/tickets.functions";

interface MobilePageLayoutProps {
  title?: string;
  children: ReactNode;
  ticketCount?: number;
  criticalAlerts?: number;
  userName?: string;
}

export function MobilePageLayout({
  title,
  children,
  ticketCount = 0,
  criticalAlerts = 0,
  userName,
}: MobilePageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"navigation" | "tickets">("navigation");
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  // Fetch tickets for the mobile tickets panel - Only OPEN tickets
  const ticketsFn = useServerFn(listTickets);
  const { data: ticketData } = useQuery({
    queryKey: ["field-tickets", "open"],
    queryFn: () => ticketsFn({ data: { status: "open" } }),
    staleTime: 30_000,
  });
  const allTickets = ticketData?.tickets ?? [];

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-card md:hidden flex flex-col">
      {/* Removed duplicate fixed mobile header since the app shell already provides one */}

      {/* Sidebar Overlay Drawer */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSidebarOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border z-50 overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border/40 px-4 py-4 flex items-center justify-between">
              {sidebarView === "navigation" ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center">
                      <span className="text-white font-bold text-sm">GH</span>
                    </div>
                    <span className="font-semibold text-foreground">GrainHero</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSidebarView("navigation")}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label="Back to navigation"
                    >
                      <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                    <span className="font-semibold text-foreground">Tickets</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="py-1">
              {sidebarView === "navigation" ? (
                <MobileAdminNav isOpen={true} onClose={() => setSidebarOpen(false)} />
              ) : (
                // Tickets View - List all tickets
                <div className="space-y-1">
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-xs text-muted-foreground">
                      Open incident tickets from all admins
                    </p>
                  </div>
                  {allTickets.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No tickets</p>
                    </div>
                  ) : (
                    allTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full text-left px-4 py-2.5 border-b border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground line-clamp-1">
                            {ticket.title}
                          </h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ticket.description?.substring(0, 60)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content Area - Full width, scrollable */}
      <main className="flex-1 w-full overflow-y-auto">
        <div className="w-full min-h-full bg-card">{children}</div>
      </main>

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
