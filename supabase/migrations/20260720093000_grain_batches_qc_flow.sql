-- Add QC workflow and tracking columns to grain_batches
ALTER TABLE public.grain_batches
  ADD COLUMN IF NOT EXISTS qc_status text NOT NULL DEFAULT 'arrived' CHECK (qc_status IN ('arrived', 'testing', 'pending', 'passed', 'failed')),
  ADD COLUMN IF NOT EXISTS qc_assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qc_notes text,
  ADD COLUMN IF NOT EXISTS qc_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qc_completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grain_batches_qc_status ON public.grain_batches(qc_status);
CREATE INDEX IF NOT EXISTS idx_grain_batches_qc_assigned_to ON public.grain_batches(qc_assigned_to) WHERE qc_assigned_to IS NOT NULL;
