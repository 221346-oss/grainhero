import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InfoDot } from "@/components/ui/InfoDot";
import { MobilePageLayout } from "@/components/app/mobile/MobilePageLayout";
import { useTicketCount } from "@/hooks/useTicketCount";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/admin-profile.functions";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

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
  const { locale } = useI18n();
  const localizedTitle = translateText(title, locale);
  const localizedSubtitle = subtitle ? translateText(subtitle, locale) : subtitle;

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
        title={localizedTitle}
        ticketCount={ticketCount}
        userName={profile?.name || profile?.email || "Admin"}
      >
        <div className="w-full px-4 py-4 pb-8 space-y-4 bg-white">
          <div>
            <h1 className="text-lg font-semibold text-foreground break-words">{localizedTitle}</h1>
            {localizedSubtitle && (
              <p className="text-xs text-muted-foreground mt-1 break-words">{localizedSubtitle}</p>
            )}
          </div>
          {/* Page actions (e.g. "Add Technician") must be reachable on mobile
              too — the desktop-only header below hides them under md: */}
          {actions && (
            <div className="flex flex-wrap gap-2">
              <LocalizedContent>{actions}</LocalizedContent>
            </div>
          )}
          <div className="w-full">
            <LocalizedContent>{children}</LocalizedContent>
          </div>
        </div>
      </MobilePageLayout>

      {/* Desktop View */}
      <div
        className={cn(
          "min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 space-y-4 bg-white hidden md:block",
          className,
        )}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className={cn(locale === "ur" ? "break-words" : "truncate", "text-2xl sm:text-3xl font-black tracking-tight text-slate-900")}>
                {localizedTitle}
              </h1>
              {localizedSubtitle && <InfoDot text={localizedSubtitle} />}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <LocalizedContent>{actions}</LocalizedContent>
            </div>
          )}
        </header>
        <LocalizedContent>{children}</LocalizedContent>
      </div>
    </>
  );
}
