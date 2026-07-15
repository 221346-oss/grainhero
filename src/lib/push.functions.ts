import { createServerFn } from '@tanstack/start';
import { supabaseServer } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const subscribeBrowserFn = createServerFn(
  'POST',
  async ({ subscription, deviceType }: { subscription: any; deviceType: string }) => {
    try {
      const { data: { user }, error: authErr } = await supabaseServer().auth.getUser();
      if (authErr || !user) {
        throw new Error('Unauthorized');
      }

      if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription');
      }

      const { endpoint, keys } = subscription;

      // Insert or update subscription
      const { error: upsertErr } = await supabaseAdmin
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh: keys?.p256dh,
          auth: keys?.auth,
          device_type: deviceType,
          is_active: true,
          marked_invalid: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

      if (upsertErr) throw upsertErr;

      return { ok: true, message: 'Browser paired successfully' };
    } catch (error: any) {
      console.error('[subscribeBrowserFn] Error:', error.message);
      return { ok: false, error: error.message };
    }
  }
);

export const unsubscribeBrowserFn = createServerFn(
  'POST',
  async ({ endpoint }: { endpoint: string }) => {
    try {
      const { data: { user }, error: authErr } = await supabaseServer().auth.getUser();
      if (authErr || !user) throw new Error('Unauthorized');

      const { error: delErr } = await supabaseAdmin
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (delErr) throw delErr;

      return { ok: true, message: 'Unsubscribed successfully' };
    } catch (error: any) {
      console.error('[unsubscribeBrowserFn] Error:', error.message);
      return { ok: false, error: error.message };
    }
  }
);

export const updatePushPreferencesFn = createServerFn(
  'POST',
  async ({ preferences }: { preferences: any }) => {
    try {
      const { data: { user }, error: authErr } = await supabaseServer().auth.getUser();
      if (authErr || !user) throw new Error('Unauthorized');

      // Update all subscriptions for this user
      const { error: updateErr } = await supabaseAdmin
        .from('user_push_subscriptions')
        .update({ preferences, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateErr) throw updateErr;

      // Update profile too
      const { data: profile } = await supabaseAdmin.from('profiles').select('preferences').eq('id', user.id).single();
      const newPrefs = { ...(profile?.preferences as any || {}), notifications: { ...(profile?.preferences as any)?.notifications, push: preferences.push_enabled } };
      await supabaseAdmin.from('profiles').update({ preferences: newPrefs }).eq('id', user.id);

      return { ok: true, message: 'Preferences updated successfully' };
    } catch (error: any) {
      console.error('[updatePushPreferencesFn] Error:', error.message);
      return { ok: false, error: error.message };
    }
  }
);

export const getPushPreferencesFn = createServerFn(
  'GET',
  async () => {
    try {
      const { data: { user }, error: authErr } = await supabaseServer().auth.getUser();
      if (authErr || !user) throw new Error('Unauthorized');

      // Get preferences from the most recent active subscription
      const { data: sub } = await supabaseAdmin
        .from('user_push_subscriptions')
        .select('preferences')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      return { ok: true, preferences: sub?.preferences || null };
    } catch (error: any) {
      console.error('[getPushPreferencesFn] Error:', error.message);
      return { ok: false, error: error.message };
    }
  }
);
