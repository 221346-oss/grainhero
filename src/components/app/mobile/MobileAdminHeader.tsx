import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Bell, Moon, X } from "lucide-react";

interface MobileAdminHeaderProps {
  name?: string;
  ticketCount?: number;
  criticalAlerts?: number;
  onMenuClick: () => void;
  onTicketClick: () => void;
}

export function MobileAdminHeader({
  name,
  ticketCount = 0,
  criticalAlerts = 0,
  onMenuClick,
  onTicketClick,
}: MobileAdminHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border/40 block md:hidden">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-success flex items-center justify-center">
            <span className="text-white font-bold text-xs">GH</span>
          </div>
        </div>
        
        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Ticket Badge - Opens sidebar showing tickets */}
          <button 
            onClick={onTicketClick}
            className="flex items-center gap-1.5 px-2 py-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Tickets"
          >
            <span className="text-sm font-semibold text-foreground"># tickets</span>
            <Badge variant="secondary" className="text-xs font-bold">
              {ticketCount}
            </Badge>
          </button>
          
          <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {criticalAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-severity-critical rounded-full"></span>
            )}
          </button>
          
          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Moon className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {(name || "Admin").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
