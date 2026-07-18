
-- Per-carrier webhook secret
ALTER TABLE public.insurance_carriers
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS webhook_url text;

-- Audit log for insurance actions
CREATE TABLE IF NOT EXISTS public.insurance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  admin_id uuid,
  action text NOT NULL,               -- policy.bind, policy.cancel, policy.renew, claim.open, claim.decision, webhook.received, ...
  subject_type text,                  -- policy | claim | carrier | product | webhook
  subject_id uuid,
  carrier_id uuid,
  policy_id uuid,
  claim_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'app', -- app | webhook | cron
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ins_audit_created_at ON public.insurance_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ins_audit_action ON public.insurance_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_ins_audit_admin ON public.insurance_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_ins_audit_carrier ON public.insurance_audit_log (carrier_id);

GRANT SELECT, INSERT ON public.insurance_audit_log TO authenticated;
GRANT ALL ON public.insurance_audit_log TO service_role;
ALTER TABLE public.insurance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit super admin all" ON public.insurance_audit_log
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "audit tenant read own" ON public.insurance_audit_log
  FOR SELECT TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()));
CREATE POLICY "audit authenticated insert" ON public.insurance_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Webhook events log (raw payloads for debugging + idempotency)
CREATE TABLE IF NOT EXISTS public.insurance_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES public.insurance_carriers(id) ON DELETE SET NULL,
  carrier_code text,
  external_id text,
  event_type text NOT NULL,
  policy_id uuid,
  claim_id uuid,
  status text NOT NULL DEFAULT 'received', -- received | processed | error | ignored
  error_message text,
  raw jsonb NOT NULL,
  headers jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (carrier_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_ins_webhook_created_at ON public.insurance_webhook_events (created_at DESC);
GRANT SELECT ON public.insurance_webhook_events TO authenticated;
GRANT ALL ON public.insurance_webhook_events TO service_role;
ALTER TABLE public.insurance_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook super admin read" ON public.insurance_webhook_events
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
