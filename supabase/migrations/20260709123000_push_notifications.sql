-- =========================================================================
-- TABLE: user_push_subscriptions
-- =========================================================================
CREATE TABLE public.user_push_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint              TEXT NOT NULL UNIQUE,
  expiration_time       TIMESTAMPTZ,
  p256dh                TEXT,
  auth                  TEXT,
  user_agent            TEXT,
  device_type           VARCHAR(20) DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  preferences           JSONB DEFAULT '{"push_enabled":true,"categories":{"spoilage":true,"dispatch":true,"payment":true,"insurance":true,"invoice":true,"batch":true,"system":true},"quiet_hours_enabled":false,"quiet_hours_start":"22:00","quiet_hours_end":"08:00","quiet_hours_timezone":"UTC","sound_enabled":true,"vibration_enabled":true,"batch_digest":false,"digest_frequency":"immediate"}'::jsonb,
  is_active             BOOLEAN DEFAULT true,
  last_used             TIMESTAMPTZ,
  failed_attempts       INTEGER DEFAULT 0,
  marked_invalid        BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_push_subs_user_active ON public.user_push_subscriptions(user_id, is_active);
CREATE INDEX idx_push_subs_endpoint ON public.user_push_subscriptions(endpoint);

-- RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subscriptions" ON public.user_push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.user_push_subscriptions TO service_role;

-- Add fcm_tokens array to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb;
