-- Request-level log for the ML spoilage-prediction cascade
-- (runMLInference in ai-inference.functions.ts). Previously every call was
-- fire-and-forget with no persistence beyond console.warn — Super Admin had
-- no way to see model health, request volume, or per-tenant failure/timeout
-- detail. One row per inference attempt, from both call sites: the manual
-- "Run AI Prediction" button (ml-pipeline.functions.ts) and the Firebase
-- sync cron's automatic per-device inference (sync-firebase.ts).
CREATE TABLE IF NOT EXISTS public.ml_inference_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  silo_id uuid REFERENCES public.silos(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.sensor_devices(id) ON DELETE SET NULL,
  model_name text NOT NULL DEFAULT 'spoilage-classifier',
  source text CHECK (source IN ('api', 'python_local', 'cascade_failed')),
  success boolean NOT NULL,
  risk_class text,
  risk_score numeric,
  confidence numeric,
  latency_ms integer,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ml_inference_requests TO authenticated;
GRANT ALL ON public.ml_inference_requests TO service_role;

ALTER TABLE public.ml_inference_requests ENABLE ROW LEVEL SECURITY;

-- This is Super Admin's model-monitoring data, not a tenant-facing feature —
-- tenants never read their own rows here (they see prediction results via
-- spoilage_predictions / grain_alerts instead).
CREATE POLICY "Super admins read inference request log"
  ON public.ml_inference_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant sessions can log their own inference requests"
  ON public.ml_inference_requests FOR INSERT
  TO authenticated
  WITH CHECK (admin_id IS NULL OR admin_id = public.get_tenant_admin_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ml_inference_requests_admin ON public.ml_inference_requests (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_inference_requests_created ON public.ml_inference_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_inference_requests_success ON public.ml_inference_requests (success);
