'use client';

import { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { getPushManager } from '@/lib/push-notifications';
import { toast } from 'sonner';

interface PushPermissionPromptProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
}

/**
 * Component to request push notification permission from users
 */
export function PushNotificationPermissionPrompt({
  onDismiss,
  onSuccess
}: PushPermissionPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const pushManager = getPushManager();
      const result = await pushManager.subscribe();

      if (result.success) {
        toast.success('Push notifications enabled!');
        setIsDismissed(true);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold text-sm">
                Get Real-Time Notifications
              </h3>
              <p className="text-green-100 text-xs mt-1">
                Stay updated with important grain and dispatch alerts
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800">
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <span>Instant spoilage alerts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <span>Dispatch notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <span>Payment confirmations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <span>Fully customizable preferences</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            disabled={isLoading}
          >
            Not now
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enabling...
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" />
                Enable
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PushNotificationPermissionPrompt;
