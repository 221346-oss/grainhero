
-- Phase 22: Governance, Sharing & Notification Depth (retry)

CREATE TABLE public.analytics_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_key text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_governance_audit TO authenticated;
GRANT ALL ON public.analytics_governance_audit TO service_role;
ALTER TABLE public.analytics_governance_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read audit" ON public.analytics_governance_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX ON public.analytics_governance_audit (created_at DESC);
CREATE INDEX ON public.analytics_governance_audit (target_type, target_key);

CREATE TABLE public.dashboard_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Shared dashboard',
  role_snapshot text NOT NULL,
  widget_ids uuid[] NOT NULL DEFAULT '{}',
  date_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_shares TO authenticated;
GRANT ALL ON public.dashboard_shares TO service_role;
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage shares" ON public.dashboard_shares FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_dashboard_shares_updated BEFORE UPDATE ON public.dashboard_shares FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.metric_export_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  metric_key text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.metric_export_tokens TO authenticated;
GRANT ALL ON public.metric_export_tokens TO service_role;
ALTER TABLE public.metric_export_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see own export tokens" ON public.metric_export_tokens FOR SELECT TO authenticated USING (requested_by = auth.uid());
CREATE POLICY "Owners insert own export tokens" ON public.metric_export_tokens FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());

ALTER TABLE public.metric_registry ADD COLUMN IF NOT EXISTS csv_template text;

ALTER TABLE public.insurance_webhook_events
  ADD COLUMN IF NOT EXISTS replay_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_replay_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_replay_allowed_at timestamptz,
  ADD COLUMN IF NOT EXISTS replay_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Merge Phase 22 keys into singleton platform_settings config
UPDATE public.platform_settings
SET config = config
  || jsonb_build_object('share_defaults', jsonb_build_object(
       'default_expiry_days', 30,
       'footer_text', 'Shared read-only via GrainHero',
       'allow_download', true,
       'max_widgets', 12
     ))
  || jsonb_build_object('platform_ops_settings', jsonb_build_object(
       'webhook_max_replays_per_hour', 6,
       'webhook_min_backoff_seconds', 60,
       'webhook_cooldown_failures', 3,
       'webhook_cooldown_seconds', 900
     ))
  || jsonb_build_object('exports_settings', jsonb_build_object(
       'csv_row_cap', 50000,
       'timezone', 'UTC'
     ))
WHERE id = 'singleton';

CREATE OR REPLACE FUNCTION public.record_governance_audit(
  _action text,
  _target_type text,
  _target_key text,
  _before jsonb,
  _after jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.analytics_governance_audit(actor_user_id, action, target_type, target_key, before, after)
  VALUES (auth.uid(), _action, _target_type, _target_key, _before, _after)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_governance_audit(text,text,text,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_dashboard_share(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _row public.dashboard_shares%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.dashboard_shares WHERE token = _token;
  IF NOT FOUND OR _row.revoked_at IS NOT NULL OR (_row.expires_at IS NOT NULL AND _row.expires_at < now()) THEN
    RETURN NULL;
  END IF;
  UPDATE public.dashboard_shares
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = _row.id;
  RETURN jsonb_build_object(
    'title', _row.title,
    'widget_ids', _row.widget_ids,
    'date_defaults', _row.date_defaults,
    'role_snapshot', _row.role_snapshot,
    'expires_at', _row.expires_at
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_dashboard_share(text) TO anon, authenticated;
