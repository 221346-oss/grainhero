import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InfoDot } from "@/components/ui/InfoDot";
import { MobilePageLayout } from "@/components/app/mobile/MobilePageLayout";
import { useTicketCount } from "@/hooks/useTicketCount";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/admin-profile.functions";

interface AdminPageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AdminPageShell({
  title,
  subtitle,
  actions,
  children,
  className,
}: AdminPageShellProps) {
  const ticketCount = useTicketCount();

  // Get user profile data
  const profileFn = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => profileFn(),
  });

  return (
    <>
      {/* Mobile View */}
      <MobilePageLayout
        title={title}
        ticketCount={ticketCount}
        userName={profile?.name || profile?.email || "Admin"}
      >
        <div className="w-full px-4 py-4 pb-8 space-y-4 bg-background">
          <div>
            <h1 className="text-lg font-semibold text-foreground break-words">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 break-words">{subtitle}</p>
            )}
          </div>
          <div className="w-full">{children}</div>
        </div>
      </MobilePageLayout>

      {/* Desktop View */}
      <div
        className={cn(
          "min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 space-y-4 bg-background hidden md:block",
          className,
        )}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && <InfoDot text={subtitle} />}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </header>
        {children}
      </div>
    </>
  );
}
