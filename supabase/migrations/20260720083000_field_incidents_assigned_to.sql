-- Add assigned_to column to field_incidents
-- Allows managers to assign an incident to a technician
ALTER TABLE public.field_incidents
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add assigned_at timestamp for audit trail
ALTER TABLE public.field_incidents
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_field_incidents_assigned_to
  ON public.field_incidents(assigned_to)
  WHERE assigned_to IS NOT NULL;
