
-- Phase 7 — multi-channel notification delivery

CREATE TABLE IF NOT EXISTS public.notification_channel_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT true,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_channel_prefs TO authenticated;
GRANT ALL ON public.notification_channel_prefs TO service_role;
ALTER TABLE public.notification_channel_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs read" ON public.notification_channel_prefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own prefs write" ON public.notification_channel_prefs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ncp_updated BEFORE UPDATE ON public.notification_channel_prefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
  provider text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','skipped')),
  provider_message_id text,
  error text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, channel)
);
GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own delivery read" ON public.notification_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notifications n WHERE n.id = notification_deliveries.notification_id AND n.admin_id = auth.uid()));
CREATE TRIGGER trg_nd_updated BEFORE UPDATE ON public.notification_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_nd_notification ON public.notification_deliveries(notification_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;
