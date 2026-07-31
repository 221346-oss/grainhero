-- Separate migration because it references enum values added in
-- 20260727150000_batch_qc_pipeline.sql — Postgres won't let a new enum
-- value be used in the same transaction that added it.
--
-- Used to enforce "1 technician can only be actively assigned to 1 batch at
-- a time" — a partial index over the non-terminal pipeline statuses keeps
-- that lookup cheap.
CREATE INDEX IF NOT EXISTS idx_grain_batches_assigned_technician
  ON public.grain_batches (assigned_technician_id)
  WHERE assigned_technician_id IS NOT NULL
    AND status IN ('pending_qc','qc_submitted','qc_failed','qc_passed');
