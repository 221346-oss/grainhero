import { ShieldAlert } from "lucide-react";

/**
 * Read-only banner shown to super_admin at the top of shared pages.
 * Indicates the page is showing cross-tenant data and that write
 * actions are disabled in platform mode.
 */
export function PlatformScopeBanner({ label }: { label?: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        <div className="font-semibold text-amber-900">Platform view — all tenants</div>
        <div className="text-amber-800/80 text-xs mt-0.5">
          {label ?? "Showing data across every tenant. Write actions are disabled; use tenant impersonation to make changes."}
        </div>
      </div>
    </div>
  );
}
