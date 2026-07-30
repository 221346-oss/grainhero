-- Batch QC pipeline: Manager creates + assigns a technician -> Technician
-- submits QC values -> Manager passes/fails (fail loops back for
-- resubmission) -> Admin approves (-> 'stored', the existing, already-
-- understood "usable everywhere" status) or rejects (-> admin_rejected,
-- from which Admin explicitly resends to Manager or marks 'damaged' --
-- never auto-discarded).
--
-- 'stored' and 'damaged' are reused as-is (no new terminal states invented
-- for them) so every existing place that reads batch_status keeps working
-- unchanged for the final states. Only the pre-storage, in-between states
-- are new.
--
-- NOTE: the new enum values cannot be referenced (e.g. in an index predicate)
-- in this same migration/transaction — see the follow-up migration for the
-- partial index that depends on them.
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'pending_qc';
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'qc_submitted';
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'qc_failed';
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'qc_passed';
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'admin_rejected';

ALTER TABLE public.grain_batches
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
