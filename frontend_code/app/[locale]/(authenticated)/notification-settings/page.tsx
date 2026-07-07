'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy notification-settings page — redirects to /settings (Notifications tab).
 * All notification controls now live in the unified Settings page.
 */
export default function NotificationSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page, notifications tab
    router.replace('/en/settings?tab=notifications');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-slate-600">Redirecting to Settings…</p>
      </div>
    </div>
  );
}
