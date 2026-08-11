-- Add assigned_technician_id column to grain_batches table
ALTER TABLE grain_batches
ADD COLUMN assigned_technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_grain_batches_assigned_technician_id 
ON grain_batches(assigned_technician_id);
