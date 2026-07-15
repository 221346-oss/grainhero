import webpush from 'web-push';
import * as admin from 'firebase-admin';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

class PushNotificationAdapter {
  private provider: 'firebase' | 'web-push' | 'mock';

  constructor() {
    this.provider = this._detectProvider();
    this._initializeProvider();
  }

  private _detectProvider(): 'firebase' | 'web-push' | 'mock' {
    if (process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      return 'firebase';
    }
    if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
      return 'web-push';
    }
    console.warn('⚠️ No push notification provider configured. Using "mock" provider. Set FIREBASE_PROJECT_ID or WEB_PUSH keys in .env for real notifications.');
    return 'mock';
  }

  private _initializeProvider() {
    if (this.provider === 'web-push') {
      webpush.setVapidDetails(
        process.env.WEB_PUSH_EMAIL || 'admin@grainhero.com',
        process.env.WEB_PUSH_PUBLIC_KEY!,
        process.env.WEB_PUSH_PRIVATE_KEY!
      );
    } else if (this.provider === 'firebase') {
      this._initializeFirebase();
    }
  }

  private _initializeFirebase() {
    if (admin.apps.length > 0) return;

    try {
      const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const url = process.env.FIREBASE_DATABASE_URL;

      let credential;
      if (saJson) {
        credential = admin.credential.cert(JSON.parse(saJson));
      } else if (saPath) {
        // dynamic import of service account JSON not standard in TS without esModuleInterop, but we can require it
        const serviceAccount = require(saPath);
        credential = admin.credential.cert(serviceAccount);
      }

      if (credential) {
        admin.initializeApp({
          credential,
          databaseURL: url
        });
        console.log('[Push Adapter] Firebase Admin initialized for push notifications');
      } else {
        console.warn('[Push Adapter] Firebase enabled but no service account provided');
      }
    } catch (error: any) {
      console.error('[Push Adapter] Firebase initialization error:', error.message);
    }
  }

  async sendPush({
    subscription,
    title,
    message,
    icon = '/icon-192x192.png',
    badge = '/badge-72x72.png',
    tag,
    data = {},
    action_url = '/'
  }: {
    subscription: any | string;
    title: string;
    message: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    action_url?: string;
  }) {
    try {
      if (!subscription) {
        return { success: false, error: 'No subscription provided' };
      }

      const payload = {
        notification: {
          title: title || 'GrainHero Notification',
          body: message || '',
          icon,
          badge,
          tag: tag || 'notification',
          requireInteraction: false
        },
        data: {
          ...data,
          action_url: action_url || '/',
          timestamp: new Date().toISOString()
        }
      };

      if (typeof subscription === 'string') {
        return await this._sendViaFirebase(subscription, payload);
      }

      if (this.provider === 'web-push') {
        return await this._sendViaWebPush(subscription, payload);
      } else if (this.provider === 'firebase') {
        return await this._sendViaFirebase(subscription, payload);
      } else if (this.provider === 'mock') {
        console.log('[Push Mock] Notification would be sent:', { title, message });
        return { success: true, messageId: 'mock-id', provider: 'mock' };
      }

      return { success: false, error: 'Unknown provider' };
    } catch (error: any) {
      console.error('[Push Adapter] Error sending push:', error.message);
      return { success: false, error: error.message };
    }
  }

  private async _sendViaWebPush(subscription: any, payload: any) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      return {
        success: true,
        messageId: result.headers?.['x-serviceworker-version'] || 'web-push',
        provider: 'web-push'
      };
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        return { success: false, error: 'Subscription expired', code: 'SUBSCRIPTION_EXPIRED' };
      }
      if (error.statusCode === 413) {
        return { success: false, error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' };
      }
      throw error;
    }
  }

  private async _sendViaFirebase(subscription: string | any, payload: any) {
    try {
      const fcmPayload = {
        notification: {
          title: payload.notification.title,
          body: payload.notification.body
        },
        data: this._stringifyData(payload.data),
        android: {
          notification: {
            icon: 'stock_ticker_update',
            color: '#1a7a3a',
            tag: payload.notification.tag
          }
        },
        webpush: {
          headers: { TTL: '86400' },
          notification: {
            title: payload.notification.title,
            body: payload.notification.body,
            icon: payload.notification.icon,
            badge: payload.notification.badge,
            requireInteraction: payload.notification.requireInteraction
          },
          fcmOptions: { link: payload.data.action_url }
        }
      };

      if (typeof subscription === 'string') {
        const result = await admin.messaging().send({
          token: subscription,
          ...fcmPayload
        });
        return { success: true, messageId: result, provider: 'firebase' };
      }

      return { success: false, error: 'Firebase requires device tokens, not subscription objects' };
    } catch (error: any) {
      console.error('[Firebase] Error sending message:', error.message);
      if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/invalid-registration-token') {
        return { success: false, error: 'Invalid registration token', code: 'INVALID_TOKEN' };
      }
      throw error;
    }
  }

  private _stringifyData(data: any) {
    if (!data) return {};
    const stringified: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'object') {
        stringified[key] = JSON.stringify(value);
      } else {
        stringified[key] = String(value);
      }
    }
    return stringified;
  }
}

export const pushAdapter = new PushNotificationAdapter();

export class NotificationService {
  static async sendPushNotification({
    recipient_id,
    title,
    message,
    category = 'system',
    action_url = '/'
  }: {
    recipient_id: string;
    title: string;
    message: string;
    category?: string;
    action_url?: string;
  }) {
    try {
      const results = [];

      // 1. Get user's mobile FCM tokens from Profiles
      const { data: user } = await supabaseAdmin
        .from('profiles')
        .select('fcm_tokens, preferences, email')
        .eq('id', recipient_id)
        .single();

      if (user && user.fcm_tokens && Array.isArray(user.fcm_tokens) && user.fcm_tokens.length > 0) {
        const prefs = user.preferences as any;
        if (prefs?.notifications?.push !== false) {
          const uniqueTokens = [...new Set(user.fcm_tokens.map((t: any) => t.token || t))];
          
          for (const token of uniqueTokens) {
            try {
              const result = await pushAdapter.sendPush({
                subscription: token,
                title,
                message,
                tag: category,
                data: { category },
                action_url
              });
              if (result.success) {
                results.push({ success: true, type: 'mobile', token });
              }
            } catch (err: any) {
              console.error(`[Push] Error sending to mobile token:`, err.message);
            }
          }
        }
      }

      // 2. Get user's web subscriptions from user_push_subscriptions table
      const { data: subscriptions } = await supabaseAdmin
        .from('user_push_subscriptions')
        .select('*')
        .eq('user_id', recipient_id)
        .eq('is_active', true)
        .eq('marked_invalid', false);

      if (subscriptions) {
        for (const sub of subscriptions) {
          const prefs = sub.preferences as any;
          if (!prefs?.push_enabled || prefs?.categories?.[category] === false) {
            continue;
          }

          if (this._isInQuietHours(prefs)) {
            continue;
          }

          try {
            const subscriptionObj = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };

            const result = await pushAdapter.sendPush({
              subscription: subscriptionObj,
              title,
              message,
              tag: category,
              data: { category },
              action_url
            });

            if (result.success) {
              await supabaseAdmin
                .from('user_push_subscriptions')
                .update({ last_used: new Date().toISOString(), failed_attempts: 0 })
                .eq('id', sub.id);
              results.push({ success: true, subscription_id: sub.id, type: 'web' });
            } else {
              const failed_attempts = (sub.failed_attempts || 0) + 1;
              const updateData: any = { failed_attempts };
              if (result.code === 'SUBSCRIPTION_EXPIRED' || failed_attempts > 5) {
                updateData.marked_invalid = true;
                updateData.is_active = false;
              }
              await supabaseAdmin
                .from('user_push_subscriptions')
                .update(updateData)
                .eq('id', sub.id);
              results.push({ success: false, subscription_id: sub.id, type: 'web', error: result.error });
            }
          } catch (error: any) {
            console.error(`[Push] Error sending to web subscription:`, error.message);
          }
        }
      }

      return results;
    } catch (error: any) {
      console.error('[Push] Overall notification service error:', error.message);
      return [];
    }
  }

  static _isInQuietHours(preferences: any) {
    if (!preferences?.quiet_hours_enabled) return false;
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: preferences.quiet_hours_timezone || 'UTC'
      });

      if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) return false;

      const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
      const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
      const [currentHour, currentMin] = timeStr.split(':').map(Number);

      const startMinutes = (startHour || 0) * 60 + (startMin || 0);
      const endMinutes = (endHour || 0) * 60 + (endMin || 0);
      const currentMinutes = (currentHour || 0) * 60 + (currentMin || 0);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (error: any) {
      return false;
    }
  }
}
