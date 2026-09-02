import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyProfile, initialsOf } from "@/hooks/useMyProfile";

export function ProfileMenu() {
  const { data } = useMyProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = (data as any)?.profile ?? data ?? {};
  const name: string | undefined = profile?.name;
  const email: string | undefined = profile?.email;
  const avatar: string | undefined = profile?.avatar;

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className="shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500 transition-transform hover:scale-105"
        >
          <Avatar className="h-8 w-8">
            {avatar ? <AvatarImage src={avatar} alt={name ?? email ?? "Profile"} /> : null}
            <AvatarFallback className="bg-[#2FAC0C]/15 text-[#2FAC0C] text-xs font-black">
              {initialsOf(name, email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold truncate">{name ?? "Signed in"}</span>
          {email ? (
            <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
