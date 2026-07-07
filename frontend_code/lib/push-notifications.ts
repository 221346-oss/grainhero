/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "./api";

export interface NotificationPreferences {
  push_enabled: boolean;
  categories: {
    spoilage: boolean;
    dispatch: boolean;
    payment: boolean;
    insurance: boolean;
    invoice: boolean;
    batch: boolean;
    system: boolean;
  };
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  batch_digest: boolean;
  digest_frequency: string;
}

export interface PushManagerResult {
  success: boolean;
  message: string;
  data?: any;
}

class PushNotificationsManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Push notifications not supported in this browser');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      this.isInitialized = true;
      console.log('[Push] Service Worker registered successfully');
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.swRegistration) return false;
    const subscription = await this.swRegistration.pushManager.getSubscription();
    return !!subscription;
  }

  async subscribe(): Promise<PushManagerResult> {
    try {
      if (!this.swRegistration) {
        await this.initialize();
      }

      if (!this.swRegistration) {
        return { success: false, message: 'Service worker not registered. Try refreshing the page.' };
      }

      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        return { success: false, message: 'Notification permission was denied. Please allow notifications in your browser settings.' };
      }
      if (permission !== 'granted') {
        return { success: false, message: 'Notification permission not granted' };
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        return { success: false, message: 'VAPID public key not configured. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local' };
      }

      // Check if already subscribed in browser - if so, re-send to backend
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any
        });
      }

      // Send subscription to backend (create or update)
      const res = await api.post('/api/notifications/subscribe', {
        subscription,
        deviceType: this.getDeviceType()
      });

      if (res.ok) {
        return { success: true, message: 'Browser paired successfully! You will now receive push notifications.' };
      } else {
        return { success: false, message: res.error || 'Failed to sync subscription with server' };
      }
    } catch (error: any) {
      console.error('[Push] Subscription failed:', error);
      if (error.name === 'NotAllowedError') {
        return { success: false, message: 'Notification permission denied by browser' };
      }
      return { success: false, message: error.message || 'Subscription failed' };
    }
  }

  async unsubscribe(): Promise<PushManagerResult> {
    try {
      if (!this.swRegistration) return { success: true, message: 'Already unsubscribed' };

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/api/notifications/unsubscribe', {
          endpoint: subscription.endpoint
        });
      }

      return { success: true, message: 'Unsubscribed successfully' };
    } catch (error: any) {
      console.error('[Push] Unsubscription failed:', error);
      return { success: false, message: error.message || 'Unsubscription failed' };
    }
  }

  async getPreferences(): Promise<{ success: boolean; preferences: NotificationPreferences }> {
    try {
      const res = await api.get<any>('/api/notifications/preferences');
      if (res.ok && res.data) {
        return { success: true, preferences: res.data.preferences };
      }
      
      // Default preferences if none found
      const defaultPrefs: NotificationPreferences = {
        push_enabled: false,
        categories: {
          spoilage: true,
          dispatch: true,
          payment: true,
          insurance: true,
          invoice: true,
          batch: true,
          system: true
        },
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        quiet_hours_timezone: 'UTC',
        sound_enabled: true,
        vibration_enabled: true,
        batch_digest: false,
        digest_frequency: 'daily'
      };
      
      return { success: true, preferences: defaultPrefs };
    } catch (error) {
      console.error('[Push] Failed to get preferences:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<PushManagerResult> {
    try {
      const res = await api.patch<{no_subscription?: boolean; message?: string}>('/api/notifications/preferences', { preferences });
      if (res.ok) {
        // Soft warning: no subscription yet but preferences noted
        if (res.data?.no_subscription) {
          return { success: true, message: 'Settings saved (pair a browser to receive push notifications)' };
        }
        return { success: true, message: 'Preferences updated successfully' };
      }
      return { success: false, message: res.error || 'Failed to update preferences' };
    } catch (error: any) {
      console.error('[Push] Failed to update preferences:', error);
      return { success: false, message: error.message || 'Failed to update preferences' };
    }
  }

  async sendTestNotification(): Promise<PushManagerResult> {
    try {
      const res = await api.post('/api/notifications/test-push');
      if (res.ok) {
        return { success: true, message: 'Test notification sent' };
      }
      return { success: false, message: res.error || 'Failed to send test notification' };
    } catch (error: any) {
      console.error('[Push] Test notification failed:', error);
      return { success: false, message: error.message || 'Test notification failed' };
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }
}

let pushManagerInstance: PushNotificationsManager | null = null;

export function getPushManager(): PushNotificationsManager {
  if (!pushManagerInstance) {
    pushManagerInstance = new PushNotificationsManager();
  }
  return pushManagerInstance;
}

export async function initializePushNotifications(): Promise<void> {
  const manager = getPushManager();
  await manager.initialize();
}
