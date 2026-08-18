-- Item 4 cleanup: dispatch.functions.ts's buyer-order delivery flow (and its
-- sibling write in buyer-orders.functions.ts) sets grain_batches.state_changed_at,
-- which was erroring as "column does not exist" in production. The column
-- was already defined back in 20260717190456_c2098be3-...sql (part of a
-- "grain batch lifecycle" migration that also added the grain_batch_events
-- audit table and the automation_rules engine) — but per the same pattern
-- already hit once with the dispatch-photos bucket
-- (20260814120000_reassert_dispatch_photos_rls.sql), that migration file
-- existing in the repo doesn't guarantee it was ever actually run against
-- this environment.
--
-- state_changed_at is NOT dead: besides the two writes above, it's read by
-- listings.functions.ts's getEligibleBatches (sorts sellable batches by most
-- recently changed). grain_batch_events is written by buyer-orders.functions.ts.
-- automation_rules is the actuator-automation engine's own table
-- (automation-rules.functions.ts). All three are live, not leftovers from the
-- abandoned grain-batch-lifecycle.functions.ts / silo-cockpit.functions.ts /
-- BatchLifecycleActions.tsx experiment removed in this same cleanup pass.
--
-- Every statement below is identical to the original migration and equally
-- idempotent (IF NOT EXISTS / exception-guarded) — safe to run whether or
-- not the original migration went through.

DO $$ BEGIN
  ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'intake';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'treatment';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'ready';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.grain_batches
  ADD COLUMN IF NOT EXISTS state_changed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS net_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS quality_snapshot jsonb;

CREATE TABLE IF NOT EXISTS public.grain_batch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.grain_batches(id) ON DELETE CASCADE,
  admin_id uuid,
  from_state text,
  to_state text NOT NULL,
  actor_user_id uuid,
  note text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grain_batch_events_batch ON public.grain_batch_events(batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grain_batch_events_admin ON public.grain_batch_events(admin_id, created_at DESC);

GRANT SELECT, INSERT ON public.grain_batch_events TO authenticated;
GRANT ALL ON public.grain_batch_events TO service_role;
ALTER TABLE public.grain_batch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_batch_events" ON public.grain_batch_events;
CREATE POLICY "tenant_read_batch_events" ON public.grain_batch_events
  FOR SELECT TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );
DROP POLICY IF EXISTS "tenant_insert_batch_events" ON public.grain_batch_events;
CREATE POLICY "tenant_insert_batch_events" ON public.grain_batch_events
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  silo_id uuid NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  actuator_id uuid NOT NULL REFERENCES public.actuators(id) ON DELETE CASCADE,
  trigger_metric text NOT NULL CHECK (trigger_metric IN ('temperature','humidity','moisture','co2')),
  trigger_op text NOT NULL CHECK (trigger_op IN ('gt','lt')),
  trigger_value numeric NOT NULL,
  command text NOT NULL CHECK (command IN ('on','off','pulse','set_level','toggle')),
  command_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  cooldown_seconds integer NOT NULL DEFAULT 900,
  last_fired_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_silo ON public.automation_rules(silo_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_admin ON public.automation_rules(admin_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_automation_rules" ON public.automation_rules;
CREATE POLICY "tenant_read_automation_rules" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );
DROP POLICY IF EXISTS "tenant_write_automation_rules" ON public.automation_rules;
CREATE POLICY "tenant_write_automation_rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    admin_id = public.get_tenant_admin_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP TRIGGER IF EXISTS trg_automation_rules_updated ON public.automation_rules;
CREATE TRIGGER trg_automation_rules_updated
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.actuator_commands
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual','automation','system'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grain_batches;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grain_batch_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_rules;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
